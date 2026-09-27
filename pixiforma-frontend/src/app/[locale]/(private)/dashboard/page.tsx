'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { CommonFunction } from '@/common';

interface MyFormationProgress {
    formation_id: number;
    title: string;
    my_status: string;
    progression_mode: string;
    total_publications: number;
    completed_publications: number;
    progress_percentage: number;
}

interface FormateurFormationItem {
    total_learners: number;
    completed_learners: number;
    progression_mode: string;
}

export default function ClientPage() {
    const { user, roles, isAdmin, isFormateur } = useAuth();
    const userName = user?.name || '';
    const isCollaborator = !isAdmin && !isFormateur;
    const roleBadges = roles.map((role: string) => {
        const colors: Record<string, string> = {
            'Admin': 'bg-purple-100 text-purple-700',
            'Formateur': 'bg-primary-100 text-primary-700',
            'Collaborateur': 'bg-primary-100 text-primary-700',
        };
        return (
            <span key={role} className={`px-3 py-1 text-xs font-medium rounded-full ${colors[role] || 'bg-gray-100 text-gray-700'}`}>
                {role}
            </span>
        );
    });

    const [loading, setLoading] = useState(true);
    const [collabFormations, setCollabFormations] = useState<MyFormationProgress[]>([]);
    const [formateurStats, setFormateurStats] = useState<{ total_formations: number; guided_count: number; free_count: number; avg_completion: number } | null>(null);

    const collabStats = {
        total: collabFormations.length,
        guided: collabFormations.filter(f => f.progression_mode === 'guided'),
        libre: collabFormations.filter(f => f.progression_mode === 'free'),
        completed: collabFormations.filter(f => f.my_status === 'completed').length,
        avgProgress: collabFormations.filter(f => f.progression_mode === 'guided').length > 0 
            ? Math.round(collabFormations.filter(f => f.progression_mode === 'guided').reduce((sum, f) => sum + f.progress_percentage, 0) / collabFormations.filter(f => f.progression_mode === 'guided').length)
            : 0,
    };

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const headers = await CommonFunction.createHeaders({ withToken: true });
                if (isCollaborator) {
                    const res = await fetch('/api/stats/my-progress', { headers });
                    if (res.ok) {
                        const data = await res.json();
                        setCollabFormations(data.data || []);
                    }
                } else if (isFormateur || isAdmin) {
                    const res = await fetch('/api/stats/my-formations', { headers });
                    if (res.ok) {
                        const data = await res.json();
                        const formations: FormateurFormationItem[] = data.data || [];
                        const totalLearners = formations.reduce((sum, f) => sum + (f.total_learners || 0), 0);
                        const completedLearners = formations.reduce((sum, f) => sum + (f.completed_learners || 0), 0);
                        setFormateurStats({
                            total_formations: formations.length,
                            guided_count: formations.filter(f => f.progression_mode === 'guided').length,
                            free_count: formations.filter(f => f.progression_mode === 'free').length,
                            avg_completion: totalLearners > 0 ? Math.round((completedLearners / totalLearners) * 100) : 0,
                        });
                    }
                }
            } catch { /* silent */ } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [isCollaborator, isFormateur, isAdmin]);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900">
                    Bonjour, {userName || 'Utilisateur'}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                    <p className="text-gray-500">Vous êtes connecté en tant que</p>
                    {roleBadges}
                </div>
            </div>

            {/* ── KPI Collaborateur ── */}
            {isCollaborator && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {loading ? (
                        <>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center animate-pulse">
                                    <div className="h-8 w-12 bg-gray-200 rounded mx-auto mb-1" />
                                    <div className="h-3 w-24 bg-gray-200 rounded mx-auto" />
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <p className="text-2xl font-bold text-blue-600">{collabStats.guided.length}</p>
                                <p className="text-xs text-gray-500 mt-1">Formations guidées</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <p className="text-2xl font-bold text-violet-600">{collabStats.libre.length}</p>
                                <p className="text-xs text-gray-500 mt-1">Formations libres</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <p className="text-2xl font-bold text-green-600">{collabStats.completed}</p>
                                <p className="text-xs text-gray-500 mt-1">Terminées</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <p className="text-2xl font-bold text-amber-600">{collabStats.avgProgress}%</p>
                                <p className="text-xs text-gray-500 mt-1">Progression moy. (guidé)</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── KPI Formateur ── */}
            {(isFormateur) && (
                <div className="grid grid-cols-3 gap-4 mb-10">
                    {loading || !formateurStats ? (
                        <>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center animate-pulse">
                                    <div className="h-8 w-12 bg-gray-200 rounded mx-auto mb-1" />
                                    <div className="h-3 w-28 bg-gray-200 rounded mx-auto" />
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <p className="text-2xl font-bold text-blue-600">{formateurStats.guided_count}</p>
                                <p className="text-xs text-gray-500 mt-1">Formations guidées</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <p className="text-2xl font-bold text-violet-600">{formateurStats.free_count}</p>
                                <p className="text-xs text-gray-500 mt-1">Formations libres</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <p className="text-2xl font-bold text-green-600">{formateurStats.avg_completion}%</p>
                                <p className="text-xs text-gray-500 mt-1">Taux complétion global</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Section Admin — Gestion */}
            {isAdmin && (
                <div className="mb-10">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Administration</h2>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
                                        <div className="flex-1">
                                            <div className="h-4 w-40 bg-gray-200 rounded" />
                                            <div className="h-3 w-28 bg-gray-200 rounded mt-1.5" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Link href="/dashboard/accounts" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Gestion des comptes</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Gérer les comptes</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/roles" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-sky-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-sky-100 text-sky-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Gestion des rôles</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Gérer les rôles et permissions</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/groups" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Groupes</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Gérer les groupes et formations</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/suivi-apprenants" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Suivi apprenants</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Statistiques et progression</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/demandes" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Demandes d&apos;inscription</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Approuver ou refuser les demandes</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        )}

            {/* Section Formations (Formateur) */}
            {isFormateur && (
                <div className="mb-10">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Gestion des formations</h2>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
                                        <div className="flex-1">
                                            <div className="h-4 w-32 bg-gray-200 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Link href="/dashboard/groups" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">Mes groupes</h3>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/demandes" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Demandes d&apos;inscription</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Approuver ou refuser les demandes</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/suivi-apprenants" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Suivi apprenants</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Statistiques et progression</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        )}

            {/* Section Collaborateur */}
            {isCollaborator && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Espace collaborateur</h2>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
                                        <div className="flex-1">
                                            <div className="h-4 w-36 bg-gray-200 rounded" />
                                            <div className="h-3 w-28 bg-gray-200 rounded mt-1.5" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Link href="/dashboard/mes-formations" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-primary-400/10 text-primary-400 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Mes formations</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Suivre ma progression</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/groups" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-teal-100 text-teal-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Groupes</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Voir les groupes et demander l&apos;inscription</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/mes-demandes" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Mes demandes</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Suivre l&apos;état de vos demandes</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/invitations" className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-pink-100 text-pink-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Mes invitations</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Voir et répondre aux invitations</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        )}
        </div>
    );
}
