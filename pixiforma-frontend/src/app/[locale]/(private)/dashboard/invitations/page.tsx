'use client';

import { useState, useEffect, useCallback } from 'react';
import { CommonFunction } from '@/common';
import Link from 'next/link';
import { toast } from 'react-toastify';
import PermissionGuard from '@/components/PermissionGuard';

interface Invitation {
    id: number;
    group: { id: number; name: string; description: string | null; creator: { name: string } };
    sender: { id: number; name: string; email: string };
    status: 'sent' | 'accepted' | 'declined';
    created_at: string;
}

export default function InvitationsPage() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInvitations = useCallback(async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/invitations', { headers });
            if (res.ok) {
                const data = await res.json();
                setInvitations(data.data || data || []);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err?.message || 'Erreur lors du chargement des invitations.');
            }
        } catch (error) {
            console.error('Error fetching invitations', error);
            toast.error('Erreur réseau lors du chargement des invitations.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const handleAccept = async (invitation: Invitation) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/invitations/${invitation.id}/accept`, {
                method: 'PUT',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Invitation acceptée, vous êtes maintenant membre du groupe.');
                fetchInvitations();
            } else {
                toast.error(data.message || "Erreur lors de l'acceptation.");
            }
        } catch (error) {
            console.error('Error accepting invitation', error);
            toast.error('Une erreur inattendue est survenue.');
        }
    };

    const handleDecline = async (invitation: Invitation) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/invitations/${invitation.id}/decline`, {
                method: 'PUT',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Invitation refusée.');
                fetchInvitations();
            } else {
                toast.error(data.message || "Erreur lors du refus.");
            }
        } catch (error) {
            console.error('Error declining invitation', error);
            toast.error('Une erreur inattendue est survenue.');
        }
    };

    const pending = invitations.filter(i => i.status === 'sent');
    const history = invitations.filter(i => i.status !== 'sent');

    return (
        <PermissionGuard permission="voir-invitations" fallback="redirect">
        <div className="p-8">
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
                    <h1 className="text-2xl font-bold text-gray-900">Mes invitations</h1>
                    <p className="text-gray-500 mt-1">Gérez vos invitations à rejoindre des groupes.</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement des invitations...</div>
            ) : invitations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500">Aucune invitation pour le moment.</p>
                </div>
            ) : (
                <>
                    {/* Pending invitations */}
                    {pending.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Invitations en attente ({pending.length})
                            </h2>
                            <div className="space-y-3">
                                {pending.map((inv) => (
                                    <div key={inv.id} className="bg-white rounded-xl shadow border border-gray-100 p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900">{inv.group.name}</h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {inv.group.description || 'Aucune description'}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    Invité par {inv.sender.name} le {new Date(inv.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                <button
                                                    onClick={() => handleDecline(inv)}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors"
                                                >
                                                    Refuser
                                                </button>
                                                <button
                                                    onClick={() => handleAccept(inv)}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-[50px] transition-colors"
                                                >
                                                    Accepter
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* History */}
                    {history.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique</h2>
                            <div className="space-y-3">
                                {history.map((inv) => (
                                    <div key={inv.id} className="bg-white rounded-xl shadow border border-gray-100 p-6 opacity-75">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900">{inv.group.name}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{inv.group.description || 'Aucune description'}</p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    Invité par {inv.sender.name} le {new Date(inv.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`ml-4 px-3 py-1 text-xs font-medium rounded-full ${
                                                inv.status === 'accepted'
                                                    ? 'bg-primary-100 text-primary-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {inv.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
        </PermissionGuard>
    );
}
