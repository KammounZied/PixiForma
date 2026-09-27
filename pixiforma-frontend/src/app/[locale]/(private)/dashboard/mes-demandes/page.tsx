'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CommonFunction } from '@/common';
import PermissionGuard from '@/components/PermissionGuard';

interface GroupRequest {
    id: number;
    group: { id: number; name: string; description: string | null; creator: { name: string } };
    user: { id: number; name: string; email: string };
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    processed_at: string | null;
}

const statusLabels: Record<string, { label: string; class: string }> = {
    pending: { label: 'En attente', class: 'bg-yellow-100 text-yellow-700' },
    accepted: { label: 'Acceptée', class: 'bg-primary-100 text-primary-700' },
    declined: { label: 'Refusée', class: 'bg-red-100 text-red-700' },
};

export default function MesDemandesPage() {
    const [requests, setRequests] = useState<GroupRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const fetchRequests = useCallback(async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/group-requests/mine', { headers });
            if (res.ok) {
                const data = await res.json();
                setRequests(data.data || data || []);
            }
        } catch (error) {
            console.error('Error fetching requests', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {fetchRequests();}, [fetchRequests]);

    return (
        <PermissionGuard permission="voir-demandes" fallback="redirect">
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
                    <h1 className="text-2xl font-bold text-gray-900">Mes demandes d&apos;inscription</h1>
                    <p className="text-gray-500 mt-1">Consultez l&apos;état de vos demandes d&apos;inscription aux groupes.</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement des demandes...</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500">Vous n&apos;avez aucune demande d&apos;inscription.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => {
                        const st = statusLabels[req.status] || { label: req.status, class: 'bg-gray-100 text-gray-700' };
                        return (
                            <div key={req.id} className="bg-white rounded-xl shadow border border-gray-100 p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg font-semibold text-gray-900">{req.group.name}</h2>
                                        <p className="text-sm text-gray-500 mt-1">{req.group.description || 'Aucune description'}</p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Géré par {req.group.creator?.name || 'Inconnu'} &mdash; Demandé le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                                        </p>
                                        {req.processed_at && (
                                            <p className="text-xs text-gray-400">
                                                Traité le {new Date(req.processed_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`ml-4 px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${st.class}`}>
                                        {st.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        </PermissionGuard>
    );
}
