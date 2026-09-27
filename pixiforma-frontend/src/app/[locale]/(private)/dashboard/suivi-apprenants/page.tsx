'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { CommonFunction } from '@/common';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';

interface FormationListItem {
    id: number;
    title: string;
    group_name: string;
    progression_mode: string;
    max_attempts: number;
    total_learners: number;
    completed_learners: number;
    total_publications: number;
}

interface LearnerData {
    user_id: number;
    name: string;
    email: string;
    status: string;
    started_at: string | null;
    completed_publications: number;
    total_publications: number;
    progress_percentage: number;
    total_attempts: number;
    bonus_attempts_used: number;
    highest_score: number | null;
    has_passed_quiz: boolean;
    avg_attempts_per_pub: number;
    avg_attempts_with_bonus: number;
    publication_progress: {
        publication_id: number;
        title: string;
        status: string;
        quiz_attempts: number;
        bonus_attempts: number;
        quiz_highest_score: number | null;
        completed_at: string | null;
    }[];
}

interface FormationStatsData {
    formation_id: number;
    formation_title: string;
    progression_mode: string;
    created_at: string;
    total_publications: number;
    total_learners: number;
    by_status: { not_started: number; in_progress: number; blocked: number; completed: number };
    completion_rate: number;
    total_attempts: number;
    avg_score: number;
    pass_rate: number;
    avg_attempts_per_completed_pub: number;
    max_attempts: number;
    learners: LearnerData[];
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
    not_started: { label: 'Non commencé', class: 'bg-gray-100 text-gray-600' },
    in_progress: { label: 'En cours', class: 'bg-blue-100 text-blue-700' },
    blocked: { label: 'Bloqué', class: 'bg-red-100 text-red-700' },
    definitive_failure: { label: 'Échec définitif', class: 'bg-red-800 text-white' },
    completed: { label: 'Terminé', class: 'bg-green-100 text-green-700' },
    interrupted: { label: 'Interrompu', class: 'bg-red-100 text-red-700' },
};

const FUP_BADGE: Record<string, { label: string; class: string }> = {
    completed: { label: 'Terminé', class: 'text-green-600' },
    available: { label: 'Disponible', class: 'text-blue-600' },
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

export default function SuiviApprenantsPage() {
    const { hasRole } = useAuth();
    const [formations, setFormations] = useState<FormationListItem[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [stats, setStats] = useState<FormationStatsData | null>(null);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [expandedLearner, setExpandedLearner] = useState<number | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [formationParams, setFormationParams] = useState<{
        min_pass_percentage?: number;
        quiz_question_count?: number;
        quiz_time_per_question?: number;
        max_attempts?: number;
        deadline?: string;
    } | null>(null);

    const fetchFormations = useCallback(async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/stats/my-formations', { headers });
            if (res.ok) {
                const data = await res.json();
                const list: FormationListItem[] = data.data || [];
                setFormations(list);
                setExpandedGroups(new Set());
            }
        } catch {
            toast.error('Erreur lors du chargement des formations.');
        } finally {
            setLoadingList(false);
        }
    }, []);

    const fetchStats = useCallback(async (formationId: number) => {
        setLoadingStats(true);
        setStats(null);
        setFormationParams(null);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const [statsRes, detailRes] = await Promise.all([
                fetch(`/api/formations/${formationId}/stats`, { headers }),
                fetch(`/api/formations/${formationId}`, { headers }),
            ]);
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data.data || null);
            } else {
                toast.error('Erreur lors du chargement des statistiques.');
            }
            if (detailRes.ok) {
                const data = await detailRes.json();
                const f = data.data || data;
                setFormationParams({
                    min_pass_percentage: f.min_pass_percentage,
                    quiz_question_count: f.quiz_question_count,
                    quiz_time_per_question: f.quiz_time_per_question,
                    max_attempts: f.max_attempts,
                    deadline: f.deadline,
                });
            }
        } catch {
            toast.error('Erreur lors du chargement des statistiques.');
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => { fetchFormations(); }, [fetchFormations]);
    useEffect(() => { if (selectedId) fetchStats(selectedId); }, [selectedId, fetchStats]);

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    const grouped = formations.reduce<Record<string, FormationListItem[]>>((acc, f) => {
        const key = f.group_name || 'Sans groupe';
        if (!acc[key]) acc[key] = [];
        acc[key].push(f);
        return acc;
    }, {});

    if (!hasRole('Formateur') && !hasRole('Admin')) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                    <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Accès refusé</h2>
                    <p className="text-sm text-gray-500">Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.</p>
                </div>
            </div>
        );
    }

    if (loadingList) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <div className="animate-pulse">
                    <div className="mb-8">
                        <div className="h-8 w-52 bg-gray-200 rounded" />
                        <div className="h-4 w-40 bg-gray-200 rounded mt-1" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(g => (
                            <div key={g} className="bg-white rounded-xl border border-gray-200 overflow-hidden border-l-4 border-l-gray-200">
                                <div className="flex items-center justify-between px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 bg-gray-200 rounded" />
                                        <div className="text-left">
                                            <div className="h-4 w-44 bg-gray-200 rounded" />
                                            <div className="h-3 w-36 bg-gray-200 rounded mt-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-20 bg-gray-200 rounded-full" />
                                        <div className="h-6 w-8 bg-gray-200 rounded-full" />
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
                <h1 className="text-2xl font-bold text-gray-900">Suivi des apprenants</h1>
                <p className="text-sm text-gray-500 mt-1">{formations.length} formation{formations.length > 1 ? 's' : ''} · {Object.keys(grouped).length} groupe{Object.keys(grouped).length > 1 ? 's' : ''}</p>
            </div>

            {formations.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-gray-500">Aucune formation créée.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([groupName, groupFormations], groupIdx) => {
                        const isExpanded = expandedGroups.has(groupName);
                        const guided = groupFormations.filter(f => f.progression_mode === 'guided');
                        const libre = groupFormations.filter(f => f.progression_mode === 'free');
                        return (
                            <div key={groupName} className={`bg-white rounded-xl border border-gray-200 overflow-hidden border-l-4 ${GROUP_COLORS[groupIdx % GROUP_COLORS.length]}`}>
                                <button
                                    onClick={() => toggleGroup(groupName)}
                                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                        <h2 className="text-base font-bold text-gray-900">{groupName}</h2>
                                        <span className="text-xs text-gray-400">({groupFormations.length} formation{groupFormations.length > 1 ? 's' : ''})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {guided.length > 0 && <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">{guided.length} guidée{guided.length > 1 ? 's' : ''}</span>}
                                        {libre.length > 0 && <span className="px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 rounded-full">{libre.length} libre{libre.length > 1 ? 's' : ''}</span>}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 px-6 py-4 space-y-4">
                                        {guided.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-2">Progression guidée</p>
                                                <div className="space-y-2">
                                                    {guided.map(f => renderFormation(f, selectedId, setSelectedId, loadingStats, stats, expandedLearner, setExpandedLearner, formationParams))}
                                                </div>
                                            </div>
                                        )}
                                        {libre.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-2 mt-3">Mode libre</p>
                                                <div className="space-y-2">
                                                    {libre.map(f => renderFormation(f, selectedId, setSelectedId, loadingStats, stats, expandedLearner, setExpandedLearner, formationParams))}
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

function renderFormation(
    f: FormationListItem,
    selectedId: number | null,
    setSelectedId: (id: number | null) => void,
    loadingStats: boolean,
    stats: FormationStatsData | null,
    expandedLearner: number | null,
    setExpandedLearner: (id: number | null) => void,
    formationParams: any,
) {
    const isSelected = selectedId === f.id;
    return (
        <div key={f.id}>
            <button
                onClick={() => setSelectedId(isSelected ? null : f.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                    isSelected
                        ? 'border-primary-400 bg-primary-400/5 ring-1 ring-primary-400/30'
                        : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{f.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{f.progression_mode === 'guided' ? 'Guidé' : 'Libre'}</span>
                            <span>{f.total_publications} publication{f.total_publications > 1 ? 's' : ''}</span>
                            <span>{f.total_learners} apprenant{f.total_learners > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                        {f.total_learners > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                    <div
                                        className="bg-primary-400 h-1.5 rounded-full"
                                        style={{ width: `${Math.round((f.completed_learners / f.total_learners) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-500 w-8 text-right">{Math.round((f.completed_learners / f.total_learners) * 100)}%</span>
                            </div>
                        )}
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </button>

            {isSelected && loadingStats && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 mt-2">
                    <div className="animate-pulse p-5 border-b border-gray-100">
                        <div className="h-5 w-56 bg-gray-200 rounded mb-3" />
                        {f.progression_mode === 'free' ? (
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                                        <div className="h-6 w-10 bg-gray-200 rounded" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                                            <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                                            <div className="h-6 w-10 bg-gray-200 rounded" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-5 w-24 bg-gray-200 rounded-full" />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {f.progression_mode === 'free' ? (
                        <div className="animate-pulse px-6 py-4 space-y-2">
                            {[1, 2, 3].map(r => (
                                <div key={r} className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200">
                                    <div className="flex-1">
                                        <div className="h-4 w-40 bg-gray-200 rounded" />
                                        <div className="h-3 w-56 bg-gray-200 rounded mt-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="animate-pulse px-6 py-4">
                            <div className="h-3 w-32 bg-gray-200 rounded mb-3" />
                            <div className="overflow-hidden rounded-lg border border-gray-200">
                                <div className="bg-gray-100 px-6 py-3 flex gap-8">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="h-3 w-16 bg-gray-200 rounded" />
                                    ))}
                                </div>
                                {[1, 2, 3].map(r => (
                                    <div key={r} className="border-t border-gray-100 px-6 py-3 flex gap-8">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <div key={i} className="h-3 w-16 bg-gray-200 rounded" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isSelected && stats && !loadingStats && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mt-2">
                    <div className="p-5 border-b border-gray-200">
                        <h3 className="text-base font-bold text-gray-900">{stats.formation_title}</h3>
                        {stats.progression_mode === 'free' ? (
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mt-3">
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <p className="text-xs text-gray-500 uppercase font-medium">Apprenants</p>
                                    <p className="text-xl font-bold text-gray-900">{stats.total_learners}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <p className="text-xs text-gray-500 uppercase font-medium">Date de création</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {stats.created_at ? new Date(stats.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500 uppercase font-medium">Apprenants</p>
                                        <p className="text-xl font-bold text-gray-900">{stats.total_learners}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500 uppercase font-medium">Taux complétion</p>
                                        <p className="text-xl font-bold text-green-600">{stats.completion_rate}%</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500 uppercase font-medium">Score moyen</p>
                                        <p className="text-xl font-bold text-blue-600">{stats.avg_score}%</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500 uppercase font-medium">Moy. tentatives/pub</p>
                                        <p className="text-xl font-bold text-amber-600">{stats.avg_attempts_per_completed_pub}/{stats.max_attempts}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-3 text-xs">
                                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{stats.by_status.not_started} non commencé</span>
                                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">{stats.by_status.in_progress} en cours</span>
                                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">{stats.by_status.blocked} bloqué</span>
                                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">{stats.by_status.completed} terminé</span>
                                </div>
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                    <div className="flex flex-wrap gap-4 text-xs">
                                        <span className="text-blue-700 font-medium">Score minimum : {formationParams?.min_pass_percentage ?? '—'}%</span>
                                        <span className="text-blue-700 font-medium">Tentatives max : {formationParams?.max_attempts ?? stats.max_attempts}</span>
                                        <span className="text-blue-700 font-medium">Questions : {formationParams?.quiz_question_count ?? '—'}</span>
                                        <span className="text-blue-700 font-medium">Temps/question : {formationParams?.quiz_time_per_question ?? '—'}s</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {stats.progression_mode === 'free' ? (
                        <div className="p-5">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Apprenants assignés</h4>
                            {stats.learners.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Aucun apprenant.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {stats.learners.map(learner => (
                                        <div key={learner.user_id} className="flex items-center px-4 py-3 bg-white rounded-lg border border-gray-200">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{learner.name}</p>
                                                <p className="text-xs text-gray-500">{learner.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : stats.learners.length === 0 ? (
                        <div className="p-5">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Apprenants assignés</h4>
                            <p className="text-xs text-gray-400 italic">Aucun apprenant.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="px-6 pt-4 pb-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase">Apprenants assignés</h4>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase">Apprenant</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase">Démarré le</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase">Statut</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase">Progression</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase">Tentatives moy.</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase">Meilleur score</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.learners.map(learner => {
                                                const isDefinitiveFailure = learner.status === 'blocked' && learner.publication_progress.some(pp => pp.status !== 'completed' && pp.bonus_attempts > 0);
                                                const isOverdue = formationParams?.deadline && new Date(formationParams.deadline + 'T23:59:59').getTime() < Date.now() && learner.status !== 'completed';
                                                const effectiveStatus = isDefinitiveFailure ? 'definitive_failure' : isOverdue ? 'interrupted' : learner.status;
                                        const badge = STATUS_BADGE[effectiveStatus] || STATUS_BADGE.not_started;
                                        const isLearnerExpanded = expandedLearner === learner.user_id;
                                        return (
                                            <Fragment key={learner.user_id}>
                                                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                                                    <td className="px-6 py-3">
                                                        <p className="font-medium text-gray-900">{learner.name}</p>
                                                        <p className="text-xs text-gray-500">{learner.email}</p>
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        <span className="text-xs text-gray-600">
                                                            {learner.started_at ? new Date(learner.started_at).toLocaleDateString('fr-FR') : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.class}`}>
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                                                <div
                                                                    className="bg-primary-400 h-1.5 rounded-full"
                                                                    style={{ width: `${learner.progress_percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-600">{learner.completed_publications}/{learner.total_publications}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        <span className={`text-xs font-medium ${learner.avg_attempts_per_pub > (stats.max_attempts * 0.8) ? 'text-red-600' : learner.avg_attempts_per_pub > (stats.max_attempts * 0.5) ? 'text-amber-600' : 'text-green-600'}`}>
                                                            {learner.avg_attempts_per_pub}/{stats.max_attempts}
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-4 py-3">
                                                        {learner.highest_score !== null ? (
                                                            <span className={`text-xs font-medium ${learner.highest_score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {learner.highest_score}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => setExpandedLearner(isLearnerExpanded ? null : learner.user_id)}
                                                            className="p-1 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <svg className={`w-4 h-4 transition-transform ${isLearnerExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isLearnerExpanded && (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-3 bg-gray-50">
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold text-gray-500 uppercase">Détail par publication</p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                    {learner.publication_progress.map(pp => {
                                                                        const effectiveStatus = stats.progression_mode === 'free' ? 'available' : pp.status;
                                                                        const fupBadge = FUP_BADGE[effectiveStatus] || FUP_BADGE.locked;
                                                                        const effectiveMax = stats.max_attempts + pp.bonus_attempts;
                                                                        return (
                                                                            <div key={pp.publication_id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200">
                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${pp.status === 'completed' ? 'bg-green-500' : pp.status === 'available' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                                                                    <span className="text-xs text-gray-700 truncate">{pp.title}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
                                                                                    <span className={`font-medium ${fupBadge.class}`}>{fupBadge.label}</span>
                                                                                    {pp.quiz_highest_score !== null && (
                                                                                        <span className="text-gray-500">{pp.quiz_highest_score}%</span>
                                                                                    )}
                                                                                    {pp.quiz_attempts > 0 && (
                                                                                        <span className="text-gray-400 font-mono">{pp.quiz_attempts}/{effectiveMax}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
