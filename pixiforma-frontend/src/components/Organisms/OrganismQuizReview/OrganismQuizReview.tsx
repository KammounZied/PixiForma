'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CommonFunction } from '@/common';
import { toast } from 'react-toastify';

interface QuizQuestion {
    question: string;
    choices: string[];
    answer: number;
    approved: boolean;
}

interface Quiz {
    id: number;
    formation_id: number;
    publication_id: number;
    questions: QuizQuestion[];
    status: 'draft' | 'published' | 'generating' | 'error';
    approved_count: number;
    generated_at: string | null;
    published_at: string | null;
    generation_error: string | null;
}

interface Props {
    formationId: number;
    publicationId: number;
    publicationTitle: string;
    onClose: () => void;
    onGenerationStateChange?: (isGenerating: boolean) => void;
}

export default function OrganismQuizReview({ formationId, publicationId, publicationTitle, onClose, onGenerationStateChange }: Props) {
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [converting, setConverting] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [toggling, setToggling] = useState<number | null>(null);
    const [localQuestions, setLocalQuestions] = useState<QuizQuestion[]>([]);
    const [markdownReady, setMarkdownReady] = useState(false);
    const [toggleWarning, setToggleWarning] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPollingRef = useRef(false);

    const fetchQuiz = useCallback(async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${formationId}/publications/${publicationId}/quiz/review?_t=${Date.now()}`, { headers, cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setQuiz(data.data);
                setLocalQuestions(data.data.questions || []);
                return data.data;
            }
            return null;
        } catch {
            return null;
        }
    }, [formationId, publicationId]);

    const fetchQuizStatus = useCallback(async (quizId: number) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/quizzes/${quizId}/status?_t=${Date.now()}`, { headers, cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                return data.data;
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    const pollQuizStatus = useCallback((quizId: number) => {
        if (pollRef.current) clearInterval(pollRef.current);
        isPollingRef.current = false;

        pollRef.current = setInterval(async () => {
            if (isPollingRef.current) return;
            isPollingRef.current = true;

            const status = await fetchQuizStatus(quizId);
            if (!status) {
                isPollingRef.current = false;
                return;
            }

            if (status.status === 'draft') {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = null;
                setGenerating(false);
                toast.success('Quiz généré avec succès !');
                fetchQuiz();
            } else if (status.status === 'error') {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = null;
                setGenerating(false);
                toast.error(status.generation_error || 'Erreur lors de la génération du quiz.');
                setQuiz(prev => prev ? { ...prev, status: 'error', generation_error: status.generation_error } : prev);
            } else {
                isPollingRef.current = false;
            }
        }, 3000);
    }, [fetchQuizStatus, fetchQuiz]);

    useEffect(() => {
        if (onGenerationStateChange) {
            onGenerationStateChange(generating);
        }
    }, [generating, onGenerationStateChange]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const q = await fetchQuiz();
            if (q?.status === 'generating') {
                setGenerating(true);
                pollQuizStatus(q.id);
            }
            try {
                const headers = await CommonFunction.createHeaders({ withToken: true });
                const res = await fetch(`/api/publications/${publicationId}/markdown-status?_t=${Date.now()}`, { headers, cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.data?.markdown_available) {
                        setMarkdownReady(true);
                    }
                }
            } catch { /* ignored */ }
            setLoading(false);
        };
        init();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchQuiz, pollQuizStatus, publicationId]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${formationId}/publications/${publicationId}/generate-quiz`, {
                method: 'POST',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                setQuiz(data.data);
                setLocalQuestions([]);
                toast.info(data.message || 'Génération en cours...');
                if (data.data?.id) {
                    pollQuizStatus(data.data.id);
                }
            } else {
                setGenerating(false);
                toast.error(data.message || 'Erreur lors de la génération.');
            }
        } catch {
            setGenerating(false);
            toast.error('Une erreur inattendue est survenue.');
        }
    };

    const handleConvert = async () => {
        setConverting(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/publications/${publicationId}/convert-pdfs`, {
                method: 'POST',
                headers,
            });
            const data = await res.json();
            if (data.markdown_available) {
                toast.success(data.message || 'PDF converti(s) avec succès.');
                setMarkdownReady(true);
            } else if (data.errors && data.errors.length > 0) {
                toast.error(data.message || 'Échec de la conversion.');
            } else {
                toast.info(data.message || 'Aucun fichier PDF à convertir.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setConverting(false);
        }
    };

    const handleToggle = async (index: number) => {
        if (!quiz) return;
        setToggling(index);
        setToggleWarning(null);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/quizzes/${quiz.id}/toggle-question/${index}`, {
                method: 'PATCH',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                setLocalQuestions(prev => {
                    const next = [...prev];
                    next[index] = { ...next[index], approved: !next[index].approved };
                    return next;
                });
                setQuiz(prev => prev ? { ...prev, approved_count: data.data.approved_count } : prev);
                if (data.warning) {
                    setToggleWarning(data.warning);
                }
            } else {
                toast.error(data.message || 'Erreur.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setToggling(null);
        }
    };

    const handlePublish = async () => {
        if (!quiz) return;
        setPublishing(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/quizzes/${quiz.id}/publish`, {
                method: 'POST',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Quiz publié.');
                setQuiz(prev => prev ? { ...prev, status: 'published', published_at: new Date().toISOString() } : prev);
            } else {
                toast.error(data.message || 'Erreur lors de la publication.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setPublishing(false);
        }
    };

    const handleRegenerate = async () => {
        if (!quiz) return;
        setGenerating(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/quizzes/${quiz.id}/regenerate`, {
                method: 'POST',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                setQuiz(data.data);
                setLocalQuestions([]);
                toast.info(data.message || 'Régénération en cours...');
                if (data.data?.id) {
                    pollQuizStatus(data.data.id);
                }
            } else {
                setGenerating(false);
                toast.error(data.message || 'Erreur lors de la régénération.');
            }
        } catch {
            setGenerating(false);
            toast.error('Une erreur inattendue est survenue.');
        }
    };

    const approvedCount = localQuestions.filter(q => q.approved).length;
    const isPublished = quiz?.status === 'published';
    const isGenerating = quiz?.status === 'generating' || generating;

    const handleBackdropClick = () => {
        if (!isGenerating) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={handleBackdropClick}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Quiz — {publicationTitle}</h2>
                        <p className="text-xs text-gray-400 mt-1">
                            {isPublished ? 'Publié' : isGenerating ? 'Génération en cours...' : quiz?.status === 'error' ? 'Erreur' : 'Brouillon'}
                            {quiz && !isGenerating && ` · ${approvedCount} questions approuvées sur ${localQuestions.length}`}
                        </p>
                    </div>
                    <button onClick={handleBackdropClick} className="w-8 h-8 rounded-[50px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Chargement du quiz...</div>
                    ) : isGenerating ? (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <svg className="animate-spin h-5 w-5 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span className="text-primary-400 font-semibold">Génération du quiz en cours...</span>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">L&apos;IA analyse le document et prépare les questions.</p>
                            <div className="mt-4 flex justify-center gap-1">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </div>
                    ) : !quiz || quiz.status === 'error' ? (
                        <div className="text-center py-12">
                            {quiz?.status === 'error' ? (
                                <div className="mb-4">
                                    <p className="text-red-500 mb-2">La génération a échoué.</p>
                                    <p className="text-xs text-red-400 mb-4">{quiz.generation_error}</p>
                                </div>
                            ) : (
                                <p className="text-gray-500 mb-4">Aucun quiz n&apos;a été généré pour cette publication.</p>
                            )}
                            {!markdownReady && !quiz?.generation_error ? (
                                <div>
                                    <p className="text-xs text-gray-400 mb-3">Les fichiers PDF doivent être convertis en Markdown avant la génération du quiz.</p>
                                    <button
                                        onClick={handleConvert}
                                        disabled={converting}
                                        className="px-6 py-2.5 bg-primary-400 text-white rounded-[50px] font-semibold hover:bg-primary-500 transition-all disabled:opacity-50"
                                    >
                                        {converting ? 'Conversion en cours...' : 'Convertir les PDF en Markdown'}
                                    </button>
                                    {converting && (
                                        <p className="text-xs text-gray-400 mt-3">Conversion des fichiers PDF en cours, veuillez patienter...</p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {markdownReady && <p className="text-sm text-green-600 mb-3">✓ Markdown prêt</p>}
                                    <button
                                        onClick={handleGenerate}
                                        className="px-6 py-2.5 bg-primary-400 text-white rounded-[50px] font-semibold hover:bg-primary-500 transition-all"
                                    >
                                        {quiz?.generation_error ? 'Réessayer la génération' : 'Générer le quiz'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {!isPublished && (
                                <div className="flex items-center gap-3 mb-4">
                                    <button
                                        onClick={handleRegenerate}
                                        disabled={generating}
                                        className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-[50px] transition-colors disabled:opacity-50"
                                    >
                                        Régénérer le quiz
                                    </button>
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing || approvedCount < 30}
                                        className={`px-4 py-2 text-sm font-medium text-white rounded-[50px] transition-colors ${publishing || approvedCount < 30 ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-400 hover:bg-primary-500'}`}
                                    >
                                        {publishing ? 'Publication...' : `Publier le quiz (${approvedCount} questions)`}
                                    </button>
                                    {approvedCount < 30 && (
                                        <p className="text-xs text-red-500">Minimum 30 questions requises pour publier.</p>
                                    )}
                                </div>
                            )}

                            {toggleWarning && (
                                <div className="flex items-start gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                                    <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    <div>
                                        <p className="text-sm font-medium text-orange-800">Le nombre de questions validées est insuffisant</p>
                                        <p className="text-xs text-orange-600 mt-1">{toggleWarning}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {localQuestions.map((q, idx) => (
                                    <div
                                        key={idx}
                                        className={`border rounded-lg p-4 transition-colors ${q.approved ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50 opacity-60'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {!isPublished && (
                                                <button
                                                    onClick={() => handleToggle(idx)}
                                                    disabled={toggling === idx}
                                                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${q.approved ? 'bg-primary-400 border-primary-400' : 'bg-white border-gray-300'}`}
                                                >
                                                    {q.approved && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 mb-2">
                                                    <span className="text-gray-400 mr-1">Q{idx + 1}.</span>
                                                    {q.question}
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {q.choices.map((choice, cIdx) => (
                                                        <div
                                                            key={cIdx}
                                                            className={`text-xs px-3 py-2 rounded-lg border ${cIdx === q.answer ? 'border-green-300 bg-green-50 text-green-800 font-medium' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                                                        >
                                                            {String.fromCharCode(65 + cIdx)}. {choice}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
