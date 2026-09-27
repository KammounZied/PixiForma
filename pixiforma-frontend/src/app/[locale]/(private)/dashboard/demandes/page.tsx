'use client';

import { useState, useEffect, useCallback } from 'react';
import { CommonFunction } from '@/common';
import Link from 'next/link';
import { toast } from 'react-toastify';
import PermissionGuard from '@/components/PermissionGuard';

interface GroupRequest {
    id: number;
    group: { id: number; name: string; description: string | null };
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

export default function DemandesPage() {
    const [requests, setRequests] = useState<GroupRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingIds, setProcessingIds] = useState<number[]>([]);

    const fetchRequests = useCallback(async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/group-requests/pending', { headers });
            if (res.ok) {
                const data = await res.json();
                setRequests(data.data || data || []);
            }
        } catch (error) {
            console.error('Error fetching pending requests', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleApprove = async (request: GroupRequest) => {
        setProcessingIds(prev => [...prev, request.id]);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/group-requests/${request.id}/approve`, {
                method: 'PUT',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Demande approuvée.');
                fetchRequests();
            } else {
                toast.error(data.message || "Erreur lors de l'approbation.");
            }
        } catch (error) {
            console.error('Error approving request', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== request.id));
        }
    };

    const handleDecline = async (request: GroupRequest) => {
        setProcessingIds(prev => [...prev, request.id]);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/group-requests/${request.id}/decline`, {
                method: 'PUT',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Demande refusée.');
                fetchRequests();
            } else {
                toast.error(data.message || 'Erreur lors du refus.');
            }
        } catch (error) {
            console.error('Error declining request', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== request.id));
        }
    };

    const pending = requests.filter(r => r.status === 'pending');
    const history = requests.filter(r => r.status !== 'pending');

    return (
        <PermissionGuard permission="voir-demandes" fallback="redirect">
        <div className="p-8 max-w-4xl mx-auto">
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
                    <h1 className="text-2xl font-bold text-gray-900">Demandes d&apos;inscription</h1>
                    <p className="text-gray-500 mt-1">Gérez les demandes d&apos;inscription à vos groupes.</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement des demandes...</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500">Aucune demande d&apos;inscription pour le moment.</p>
                </div>
            ) : (
                <>
                    {pending.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Demandes en attente ({pending.length})
                            </h2>
                            <div className="space-y-3">
                                {pending.map((req) => (
                                    <div key={req.id} className="bg-white rounded-xl shadow border border-gray-100 p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold text-gray-900">{req.group.name}</h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Demandé par <strong>{req.user.name}</strong> ({req.user.email})
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    Le {new Date(req.created_at).toLocaleDateString('fr-FR', {
                                                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                                <button
                                                    onClick={() => handleDecline(req)}
                                                    disabled={processingIds.includes(req.id)}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors"
                                                >
                                                    Refuser
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(req)}
                                                    disabled={processingIds.includes(req.id)}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-[50px] transition-colors"
                                                >
                                                    {processingIds.includes(req.id) ? 'Traitement...' : 'Approuver'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {history.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique</h2>
                            <div className="space-y-3">
                                {history.map((req) => {
                                    const st = statusLabels[req.status] || { label: req.status, class: 'bg-gray-100 text-gray-700' };
                                    return (
                                        <div key={req.id} className="bg-white rounded-xl shadow border border-gray-100 p-6 opacity-75">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-semibold text-gray-900">{req.group.name}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Demandé par {req.user.name} ({req.user.email})
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        Le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                                                    </p>
                                                </div>
                                                <span className={`ml-4 px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${st.class}`}>
                                                    {st.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
        </PermissionGuard>
    );
}
