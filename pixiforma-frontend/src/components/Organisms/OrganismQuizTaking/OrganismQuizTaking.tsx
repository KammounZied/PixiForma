'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CommonFunction } from '@/common';
import { toast } from 'react-toastify';

interface QuizQuestion {
    question: string;
    choices: string[];
    answer: number;
    approved: boolean;
    original_index: number;
}

interface Quiz {
    id: number;
    formation_id: number;
    publication_id: number;
    questions: QuizQuestion[];
    status: string;
    approved_count: number;
    time_per_question: number;
    attempts_used?: number;
    max_attempts?: number | null;
}

interface QuizResult {
    submission_id: number;
    score: number;
    total_questions: number;
    correct_answers: number;
    passed: boolean;
    min_pass_percentage: number;
    attempts_used: number;
    max_attempts: number | null;
    remaining_attempts: number | null;
    formation_completed: boolean;
    results: {
        question_index: number;
        user_answer: number;
        correct_answer: number;
        is_correct: boolean;
        is_unanswered: boolean;
    }[];
}

interface Props {
    formationId: number;
    publicationId: number;
    publicationTitle: string;
    onClose: () => void;
    onComplete?: (passed: boolean) => void;
}

export default function OrganismQuizTaking({ formationId, publicationId, publicationTitle, onClose, onComplete }: Props) {
    const params = useParams();
    const groupId = params.groupId as string;
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const answersRef = useRef<Record<number, number>>({});
    const [result, setResult] = useState<QuizResult | null>(null);
    const [timeLeft, setTimeLeft] = useState(15);
    const timeLeftRef = useRef(timeLeft);
    timeLeftRef.current = timeLeft;
    const questionTime = quiz?.time_per_question ?? 15;
    const [quizStarted, setQuizStarted] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoSubmittingRef = useRef(false);
    const sessionRef = useRef<{
        groupId: string; formationId: number; publicationId: number;
        quizId: number; questions: QuizQuestion[];
        answers: Record<number, number>; currentIdx: number;
        timeLeft: number; quizStarted: boolean;
    } | null>(null);
    const saveSession = useCallback(() => {
        if (!quiz || !quizStarted || result || submitting) return;
        const session = {
            groupId,
            formationId,
            publicationId,
            quizId: quiz.id,
            questions,
            answers: answersRef.current,
            currentIdx,
            timeLeft: timeLeftRef.current,
            quizStarted,
        };
        sessionRef.current = session;
        localStorage.setItem('pixiforma_active_quiz', JSON.stringify(session));
    }, [quiz, quizStarted, currentIdx, result, submitting, formationId, publicationId, groupId, questions]);

    // Save to localStorage whenever state changes
    useEffect(() => { saveSession(); }, [saveSession, timeLeft]);

    // Save on beforeunload (refresh / close)
    useEffect(() => {
        const handle = () => { saveSession(); };
        window.addEventListener('beforeunload', handle);
        return () => window.removeEventListener('beforeunload', handle);
    }, [saveSession]);

    // Save on visibilitychange (tab switch)
    useEffect(() => {
        const handle = () => {
            if (document.visibilityState === 'hidden') saveSession();
        };
        document.addEventListener('visibilitychange', handle);
        return () => document.removeEventListener('visibilitychange', handle);
    }, [saveSession]);

    const answeredCount = Object.keys(answers).length;

    const handleSubmit = useCallback(async () => {
        if (!quiz || submitting) return;
        setSubmitting(true);
        try {
            const allAnswers: Record<number, number> = {};
            questions.forEach(q => {
                allAnswers[q.original_index] = answersRef.current[q.original_index] ?? -1;
            });
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ answers: allAnswers }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data.data);
                toast.success(data.message);
                localStorage.removeItem('pixiforma_active_quiz');
            } else {
                if (data.max_attempts_reached) {
                    toast.error(data.message);
                    localStorage.removeItem('pixiforma_active_quiz');
                    onComplete?.(false);
                    onClose();
                } else {
                    toast.error(data.message || 'Erreur lors de la soumission.');
                }
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setSubmitting(false);
        }
    }, [quiz, submitting, questions, onComplete, onClose]);

    useEffect(() => {
        fetchQuiz();
    }, [formationId, publicationId]);

    useEffect(() => {
        if (!quizStarted || result || submitting || questions.length === 0) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [quizStarted, currentIdx, result, submitting, questions.length]);

    useEffect(() => {
        if (timeLeft !== 0 || !quizStarted || result || submitting) return;
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
            setTimeLeft(questionTime);
        } else if (!autoSubmittingRef.current) {
            autoSubmittingRef.current = true;
            handleSubmit();
        }
    }, [timeLeft, quizStarted, currentIdx, questions.length, result, submitting, handleSubmit]);

    const fetchQuiz = async () => {
        setLoading(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${formationId}/publications/${publicationId}/quiz`, { headers });
            if (res.ok) {
                const data = await res.json();
                const q = data.data;
                setQuiz(q);
                setQuestions(q.questions || []);

                // Restore from localStorage if exists
                const saved = localStorage.getItem('pixiforma_active_quiz');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed.quizId === q.id && parsed.quizStarted) {
                            if (parsed.questions) setQuestions(parsed.questions);
                            setQuizStarted(true);
                            setAnswers(parsed.answers || {});
                            answersRef.current = parsed.answers || {};
                            setCurrentIdx(parsed.currentIdx || 0);
                            setTimeLeft(parsed.timeLeft ?? (q.time_per_question || 15));
                        }
                    } catch {
                        localStorage.removeItem('pixiforma_active_quiz');
                    }
                }
            }
        } catch { /* ignored */ } finally {
            setLoading(false);
        }
    };

    const handleStart = () => {
        setQuizStarted(true);
        setTimeLeft(questionTime);
    };

    const handleSelect = (choiceIdx: number) => {
        if (!quizStarted || result) return;
        const originalIdx = questions[currentIdx].original_index;
        answersRef.current = { ...answersRef.current, [originalIdx]: choiceIdx };
        setAnswers(prev => ({ ...prev, [originalIdx]: choiceIdx }));
        if (timerRef.current) clearInterval(timerRef.current);
        if (currentIdx < questions.length - 1) {
            setTimeout(() => {
                setCurrentIdx(prev => prev + 1);
                setTimeLeft(questionTime);
            }, 300);
        } else {
            setTimeout(() => {
                if (!autoSubmittingRef.current) {
                    autoSubmittingRef.current = true;
                    handleSubmit();
                }
            }, 300);
        }
    };

    const timerColor = timeLeft > 10 ? 'bg-primary-400' : timeLeft > 5 ? 'bg-amber-400' : 'bg-red-500';
    const timerTextColor = timeLeft > 10 ? 'text-primary-400' : timeLeft > 5 ? 'text-amber-500' : 'text-red-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => !quizStarted && onClose()}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Quiz — {publicationTitle}</h2>
                        <p className="text-xs text-gray-400 mt-1">{questions.length} questions · {questionTime}s par question</p>
                    </div>
                    {!quizStarted && (
                        <button onClick={onClose} className="w-8 h-8 rounded-[50px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Chargement du quiz...</div>
                    ) : !quiz || questions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">Aucun quiz disponible pour cette publication.</div>
                    ) : result ? (
                        <div className="space-y-6">
                            <div className={`text-center p-6 rounded-lg ${result.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <p className={`text-2xl font-bold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                                    {result.passed ? 'Réussi !' : 'Échoué'}
                                </p>
                                <p className="text-sm mt-2">
                                    Score : <span className="font-bold">{result.score}%</span> ({result.correct_answers}/{result.total_questions})
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Minimum requis : {result.min_pass_percentage}%</p>
                                {!result.passed && result.max_attempts !== null && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tentative {result.attempts_used}/{result.max_attempts}
                                        {result.remaining_attempts !== null && result.remaining_attempts > 0 && (
                                            <span className="text-amber-600 ml-1">· {result.remaining_attempts} tentative(s) restante(s)</span>
                                        )}
                                    </p>
                                )}
                            </div>
                            {result.passed && result.formation_completed && (
                                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
                                    <p className="text-3xl font-bold text-green-700">Félicitations !</p>
                                    <p className="text-lg font-semibold text-green-600 mt-2">Formation clôturée — vous avez bien réussi !</p>
                                    <p className="text-sm text-gray-500 mt-1">Tous les quiz ont été réussis. Bravo !</p>
                                </div>
                            )}
                            <div className="space-y-3">
                                {questions.map((q, idx) => {
                                    const r = result.results.find(x => x.question_index === q.original_index);
                                    const unanswered = r?.is_unanswered ?? false;
                                    return (
                                        <div key={idx} className={`border rounded-lg p-4 ${unanswered ? 'border-amber-200 bg-amber-50' : r?.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <p className="text-sm font-medium text-gray-900">Q{idx + 1}. {q.question}</p>
                                                {unanswered && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                                                        Non répondu
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {q.choices.map((choice, cIdx) => {
                                                    const isCorrect = cIdx === r?.correct_answer;
                                                    const isUserAnswer = cIdx === r?.user_answer && !unanswered;
                                                    return (
                                                        <div key={cIdx} className={`text-xs px-3 py-2 rounded-lg border ${isCorrect ? 'border-green-300 bg-green-100 text-green-800 font-medium' : isUserAnswer && !isCorrect ? 'border-red-300 bg-red-100 text-red-800' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                                                            {String.fromCharCode(65 + cIdx)}. {choice}
                                                            {isCorrect && ' ✓'}
                                                            {isUserAnswer && !isCorrect && ' ✗'}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => { onComplete?.(result.passed); onClose(); }}
                                    className="px-6 py-2 text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-[50px] transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    ) : !quizStarted ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 border border-amber-200 mb-2">
                                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Quiz chronométré</h3>
                            <p className="text-sm text-gray-500 max-w-md mx-auto">
                                Chaque question dispose de <span className="font-semibold text-gray-700">{questionTime} secondes</span>.
                                Si vous ne répondez pas à temps, la question sera comptée comme non répondue.
                            </p>
                            <p className="text-xs text-gray-400">Il est impossible de revenir à une question précédente.</p>
                            
                            {quiz?.max_attempts && (quiz.attempts_used !== undefined) && (quiz.max_attempts - quiz.attempts_used === 1) && (
                                <div className="max-w-md mx-auto mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        <div>
                                            <p className="text-sm font-bold text-red-800">Dernière chance !</p>
                                            <p className="text-xs text-red-700 mt-1">Ceci est votre dernière tentative pour réussir ce quiz. Si vous échouez, la formation sera bloquée. Prenez votre temps pour bien répondre !</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button onClick={handleStart}
                                className="mt-4 bg-primary-400 text-white font-semibold rounded-full px-8 py-3 transition-all hover:bg-primary-500">
                                Commencer le quiz
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span>Question {currentIdx + 1} / {questions.length}</span>
                                    <span>·</span>
                                    <span>{answeredCount} répondu{answeredCount > 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-lg font-bold tabular-nums ${timerTextColor}`}>{timeLeft}s</span>
                                </div>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-1.5 relative overflow-hidden">
                                <div
                                    className={`h-1.5 rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
                                    style={{ width: `${(timeLeft / questionTime) * 100}%` }}
                                />
                            </div>

                            {questions[currentIdx] && (
                                <div className="border border-gray-200 rounded-lg p-5">
                                    <p className="text-sm font-semibold text-gray-900 mb-4">
                                        Q{currentIdx + 1}. {questions[currentIdx].question}
                                    </p>
                                    <div className="space-y-2">
                                        {questions[currentIdx].choices.map((choice, cIdx) => (
                                            <button
                                                key={cIdx}
                                                onClick={() => handleSelect(cIdx)}
                                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${answers[questions[currentIdx].original_index] === cIdx ? 'border-primary-400 bg-primary-400/10 text-primary-400 font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                                            >
                                                <span className="font-medium mr-2">{String.fromCharCode(65 + cIdx)}.</span>
                                                {choice}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
