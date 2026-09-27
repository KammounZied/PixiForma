'use client';

import { useState, useEffect } from 'react';
import { CommonFunction } from '@/common';
import Link from 'next/link';
import { toast } from 'react-toastify';
import PermissionGuard from '@/components/PermissionGuard';

interface Group {
    id: number;
    name: string;
    description: string | null;
    creator: { id: number; name: string; email: string };
    created_at: string;
}

export default function GroupesDisponiblesPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestingIds, setRequestingIds] = useState<number[]>([]);

    const fetchGroups = async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/groups/available', { headers });
            if (res.ok) {
                const data = await res.json();
                setGroups(data.data || data || []);
            }
        } catch (error) {
            console.error('Error fetching available groups', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {fetchGroups();}, []);

    const requestJoin = async (groupId: number) => {
        setRequestingIds(prev => [...prev, groupId]);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}/request-join`, {
                method: 'POST',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Demande envoyée avec succès.');
                setGroups(prev => prev.filter(g => g.id !== groupId));
            } else {
                toast.error(data.message || 'Erreur lors de la demande.');
            }
        } catch (error) {
            console.error('Error requesting join', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setRequestingIds(prev => prev.filter(id => id !== groupId));
        }
    };

    return (
        <PermissionGuard permission="voir-groupes" fallback="redirect">
        <div className="p-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <Link
                    href="/dashboard"
                    className="w-9 h-9 rounded-[50px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0"
                    aria-label="Retour"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Groupes disponibles</h1>
                    <p className="text-gray-500 mt-1">Demandez à rejoindre un groupe pour accéder aux ressources partagées.</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement des groupes...</div>
            ) : groups.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500">Aucun groupe disponible pour le moment.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-white rounded-xl shadow border border-gray-100 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                                    <p className="text-sm text-gray-500 mt-1">{group.description || 'Aucune description'}</p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Géré par {group.creator?.name || 'Inconnu'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => requestJoin(group.id)}
                                    disabled={requestingIds.includes(group.id)}
                                    className={`ml-4 px-4 py-2 text-sm font-medium text-white rounded-[50px] transition-colors flex-shrink-0 ${
                                        requestingIds.includes(group.id)
                                            ? 'bg-primary-300'
                                            : 'bg-primary-400 hover:bg-primary-500'
                                    }`}
                                >
                                    {requestingIds.includes(group.id) ? 'Envoi...' : "Demander l'inscription"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        </PermissionGuard>
    );
}
