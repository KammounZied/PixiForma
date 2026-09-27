'use client';

import { useState, useEffect, useCallback } from 'react';
import { CommonFunction } from '@/common';
import { toast } from 'react-toastify';

interface QuizData {
    publication_id: number;
    title: string;
    order: number;
    fup_status: string | null;
    quiz_attempts: number;
    bonus_attempts: number;
    max_attempts: number;
    quiz_highest_score: number | null;
    quiz_passed: boolean;
    last_score: number | null;
    completed_at: string | null;
}

interface FormationStats {
    formation_id: number;
    title: string;
    group_name: string;
    progression_mode: string;
    my_status: string;
    started_at: string | null;
    deadline: string | null;
    total_publications: number;
    completed_publications: number;
    available_publications: number;
    locked_publications: number;
    progress_percentage: number;
    total_attempts_used: number;
    total_bonus_used: number;
    quizzes: QuizData[];
}

const STATUS_CONFIG: Record<string, { label: string; class: string; dot: string }> = {
    not_started: { label: 'Non commencé', class: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    in_progress: { label: 'En cours', class: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    blocked: { label: 'Bloqué', class: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    completed: { label: 'Clôturé', class: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    interrupted: { label: 'Interrompu', class: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const FUP_STATUS: Record<string, { label: string; class: string }> = {
    completed: { label: 'Terminé', class: 'text-green-600' },
    available: { label: 'Disponible', class: 'text-blue-600' },
    in_progress: { label: 'En cours', class: 'text-orange-600' },
    locked: { label: 'Verrouillé', class: 'text-gray-400' },
};

const GROUP_COLORS = [
    'border-l-blue-500',
    'border-l-emerald-500',
    'border-l-amber-500',
    'border-l-purple-500',
    'border-l-rose-500',
    'border-l-cyan-500',
    'border-l-orange-500',
    'border-l-indigo-500',
];

export default function MesFormationsPage() {
    const [formations, setFormations] = useState<FormationStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [expandedFormations, setExpandedFormations] = useState<Set<number>>(new Set());

    const fetchData = useCallback(async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/stats/my-progress', { headers });
            if (res.ok) {
                const data = await res.json();
                setFormations(data.data || []);
            }
        } catch {
            toast.error('Erreur lors du chargement des formations.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const grouped = formations.reduce<Record<string, FormationStats[]>>((acc, f) => {
        const group = f.group_name || 'Sans groupe';
        if (!acc[group]) acc[group] = [];
        acc[group].push(f);
        return acc;
    }, {});

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    };

    const toggleFormation = (id: number) => {
        setExpandedFormations(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const effectiveStatus = (f: FormationStats) => {
        const isOverdue = f.deadline && new Date(f.deadline + 'T23:59:59').getTime() < Date.now() && f.my_status !== 'completed';
        return isOverdue ? 'interrupted' : f.my_status;
    };
    const summary = {
        in_progress: formations.filter(f => effectiveStatus(f) === 'in_progress').length,
        completed: formations.filter(f => effectiveStatus(f) === 'completed').length,
        blocked: formations.filter(f => effectiveStatus(f) === 'blocked').length,
        not_started: formations.filter(f => effectiveStatus(f) === 'not_started').length,
    };

    if (loading) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <div className="animate-pulse">
                    <div className="mb-8">
                        <div className="h-8 w-48 bg-gray-200 rounded" />
                        <div className="h-4 w-36 bg-gray-200 rounded mt-1" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                                <div className="h-7 w-8 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(g => (
                            <div key={g} className="bg-white rounded-xl border border-gray-200 overflow-hidden border-l-4 border-l-gray-200">
                                <div className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 bg-gray-200 rounded" />
                                        <div className="h-4 w-40 bg-gray-200 rounded" />
                                        <div className="h-3 w-20 bg-gray-200 rounded" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Mes formations</h1>
                <p className="text-sm text-gray-500 mt-1">{formations.length} formation{formations.length > 1 ? 's' : ''} assignée{formations.length > 1 ? 's' : ''} : {formations.filter(f => f.progression_mode === 'free').length} libre{formations.filter(f => f.progression_mode === 'free').length > 1 ? 's' : ''} et {formations.filter(f => f.progression_mode === 'guided').length} guidée{formations.filter(f => f.progression_mode === 'guided').length > 1 ? 's' : ''}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">En cours</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{summary.in_progress}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">Terminées</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{summary.completed}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">Bloquées</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{summary.blocked}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">Non commencées</p>
                    <p className="text-2xl font-bold text-gray-600 mt-1">{summary.not_started}</p>
                </div>
            </div>

            {formations.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-gray-500">Aucune formation assignée pour le moment.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([groupName, groupFormations], groupIdx) => {
                        const isGroupExpanded = expandedGroups.has(groupName);
                        const guided = groupFormations.filter(f => f.progression_mode === 'guided');
                        const libre = groupFormations.filter(f => f.progression_mode === 'free');

                        return (
                            <div key={groupName} className={`bg-white rounded-xl border border-gray-200 overflow-hidden border-l-4 ${GROUP_COLORS[groupIdx % GROUP_COLORS.length]}`}>
                                <button
                                    onClick={() => toggleGroup(groupName)}
                                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                        <h2 className="text-sm font-semibold text-gray-800">{groupName}</h2>
                                        <span className="text-xs text-gray-400">({groupFormations.length} formation{groupFormations.length > 1 ? 's' : ''})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {guided.length > 0 && <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">{guided.length} guidée{guided.length > 1 ? 's' : ''}</span>}
                                        {libre.length > 0 && <span className="px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 rounded-full">{libre.length} libre{libre.length > 1 ? 's' : ''}</span>}
                                    </div>
                                </button>

                                {isGroupExpanded && (
                                    <div className="border-t border-gray-100 px-5 pb-4 space-y-3 pt-3">
                                        {guided.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-2">Progression guidée</p>
                                                <div className="space-y-2">
                                                    {guided.map(f => renderFormation(f, expandedFormations, toggleFormation))}
                                                </div>
                                            </div>
                                        )}
                                        {libre.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-2 mt-3">Mode libre</p>
                                                <div className="space-y-2">
                                                    {libre.map(f => renderFormation(f, expandedFormations, toggleFormation))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function renderFormation(f: FormationStats, expandedFormations: Set<number>, toggleFormation: (id: number) => void) {
    const isOverdue = f.deadline && new Date(f.deadline + 'T23:59:59').getTime() < Date.now() && f.my_status !== 'completed';
    const effectiveFormationStatus = isOverdue ? 'interrupted' : f.my_status;
    const statusConf = STATUS_CONFIG[effectiveFormationStatus] || STATUS_CONFIG.not_started;
    const isExpanded = expandedFormations.has(f.formation_id);
    const isLibre = f.progression_mode === 'free';

    return (
        <div key={f.formation_id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <button
                onClick={() => toggleFormation(f.formation_id)}
                className="w-full text-left p-4"
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{f.title}</h3>
                            {!isLibre && (
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusConf.class}`}>
                                    {statusConf.label}
                                </span>
                            )}
                        </div>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {!isLibre && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>{f.completed_publications}/{f.total_publications} publications</span>
                            <span className="font-medium">{f.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                                className={`h-1.5 rounded-full transition-all ${f.my_status === 'completed' ? 'bg-green-500' : f.my_status === 'blocked' ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${f.progress_percentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {isLibre && (
                    <p className="mt-1 text-[10px] text-gray-400">{f.total_publications} publication{f.total_publications > 1 ? 's' : ''} disponible{f.total_publications > 1 ? 's' : ''}</p>
                )}

                {isOverdue && (
                    <p className="mt-1.5 text-[10px] text-red-600 font-medium">
                        Deadline dépassée ({new Date(f.deadline!).toLocaleDateString('fr-FR')})
                    </p>
                )}
                {!isOverdue && f.deadline && f.my_status !== 'completed' && (
                    <p className="mt-1.5 text-[10px] text-gray-400">
                        Deadline: {new Date(f.deadline).toLocaleDateString('fr-FR')}
                    </p>
                )}
            </button>

            {isExpanded && (
                <div className="border-t border-gray-200 px-4 pb-4 pt-3">
                    <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Publications</h4>
                    <div className="space-y-1.5">
                        {f.quizzes.map((quiz) => {
                            let effectiveFupStatus = quiz.fup_status || 'locked';

                            if (isLibre) {
                                effectiveFupStatus = 'available';
                            } else if (f.my_status === 'not_started' || isOverdue) {
                                effectiveFupStatus = 'locked';
                            } else if (effectiveFupStatus === 'available' && (quiz.quiz_attempts > 0 || (f.my_status === 'in_progress' && quiz.order === 1))) {
                                effectiveFupStatus = 'in_progress';
                            }
                            
                            const fupConf = FUP_STATUS[effectiveFupStatus] || FUP_STATUS.locked;
                            const effectiveMax = quiz.max_attempts + quiz.bonus_attempts;
                            return (
                                <div key={quiz.publication_id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-mono text-gray-400 w-4">#{quiz.order}</span>
                                        <span className="text-xs text-gray-800 truncate">{quiz.title}</span>
                                        <span className={`text-[10px] font-medium ${fupConf.class}`}>{fupConf.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-500 shrink-0">
                                        {quiz.fup_status === 'completed' && (
                                            <span className="text-green-600 font-medium">{quiz.quiz_highest_score}%</span>
                                        )}
                                        {quiz.fup_status !== 'completed' && quiz.quiz_attempts > 0 && (
                                            <span>{quiz.quiz_highest_score !== null ? `${quiz.quiz_highest_score}%` : '—'}</span>
                                        )}
                                        {quiz.fup_status !== 'completed' && quiz.max_attempts > 0 && (
                                            <span className="font-mono">{quiz.quiz_attempts}/{effectiveMax}</span>
                                        )}
                                        {quiz.completed_at && (
                                            <span className="text-gray-400">{new Date(quiz.completed_at).toLocaleDateString('fr-FR')}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
