'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CommonFunction } from '@/common';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    data: Record<string, any> | null;
    is_read: boolean;
    created_at: string;
    read_at: string | null;
}

const PUBLICATION_TYPES = ['publication_created', 'publication_visible', 'publication_deleted'];

export default function NotificationsPage() {
    const { isCollaborateur } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleting, setDeleting] = useState(false);

    const filteredNotifications = useMemo(() =>
        isCollaborateur
            ? notifications.filter(n => !PUBLICATION_TYPES.includes(n.type))
            : notifications,
        [notifications, isCollaborateur]
    );

    const filteredUnreadCount = useMemo(() =>
        isCollaborateur
            ? notifications.filter(n => !PUBLICATION_TYPES.includes(n.type) && !n.is_read).length
            : unreadCount,
        [notifications, unreadCount, isCollaborateur]
    );

    const fetchNotifications = useCallback(async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/notifications', { headers });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.data || []);
                setUnreadCount(data.unread_count || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAsRead = async (id: number) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read', error);
        }
    };

    const handleAcceptInvitation = async (invitationId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/invitations/${invitationId}/accept`, { method: 'PUT', headers });
            if (res.ok) {
                toast.success('Invitation acceptée, vous êtes maintenant membre du groupe.');
                fetchNotifications();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || "Erreur lors de l'acceptation.");
            }
        } catch { toast.error('Une erreur inattendue est survenue.'); }
    };

    const handleDeclineInvitation = async (invitationId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/invitations/${invitationId}/decline`, { method: 'PUT', headers });
            if (res.ok) {
                toast.success('Invitation refusée.');
                fetchNotifications();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || "Erreur lors du refus.");
            }
        } catch { toast.error('Une erreur inattendue est survenue.'); }
    };

    const handleApproveRequest = async (requestId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/group-requests/${requestId}/approve`, { method: 'PUT', headers });
            if (res.ok) {
                toast.success('Demande approuvée.');
                fetchNotifications();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || "Erreur lors de l'approbation.");
            }
        } catch { toast.error('Une erreur inattendue est survenue.'); }
    };

    const handleDeclineRequest = async (requestId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/group-requests/${requestId}/decline`, { method: 'PUT', headers });
            if (res.ok) {
                toast.success('Demande refusée.');
                fetchNotifications();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || "Erreur lors du refus.");
            }
        } catch { toast.error('Une erreur inattendue est survenue.'); }
    };

    const markAllAsRead = async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/notifications/read-all', { method: 'PUT', headers });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
                setUnreadCount(0);
                toast.success('Toutes les notifications ont été marquées comme lues.');
            }
        } catch (error) {
            console.error('Error marking all as read', error);
            toast.error('Erreur lors du marquage des notifications.');
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredNotifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredNotifications.map(n => n.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) {
            toast.error('Sélectionnez au moins une notification à supprimer.');
            return;
        }
        setDeleting(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/notifications/delete', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`${selectedIds.length} notification(s) supprimée(s).`);
                setSelectedIds([]);
                setSelectMode(false);
                fetchNotifications();
            } else {
                toast.error(data.message || 'Erreur lors de la suppression.');
            }
        } catch (error) {
            console.error('Error deleting notifications', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setDeleting(false);
        }
    };

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds([]);
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            group_invitation: 'Invitation',
            group_request: 'Demande',
            group_request_accepted: 'Acceptée',
            group_request_declined: 'Refusée',
            training_deleted: 'Formation',
            training_publications_updated: 'Formation',
            publication_created: 'Publication',
            publication_updated: 'Publication',
            publication_visible: 'Publication',
            publication_deleted: 'Publication',
            new_comment: 'Commentaire',
            training_assignment: 'Formation',
            quiz_result: 'Quiz',
            quiz_generation_success: 'Quiz',
            quiz_generation_error: 'Quiz',
            validation: 'Validation',
            bonus_attempt_granted: 'Tentative',
            block_request_declined: 'Blocage',
        };
        return labels[type] || type;
    };

    return (
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
                <div className="flex-1 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        <p className="text-gray-500 mt-1">
                        {filteredUnreadCount > 0
                                ? `Vous avez ${filteredUnreadCount} notification(s) non lue(s).`
                                : 'Vous n\'avez aucune notification non lue.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {filteredUnreadCount > 0 && !selectMode && (
                            <button
                                onClick={markAllAsRead}
                                className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-[50px] transition-colors"
                            >
                                Tout marquer comme lu
                            </button>
                        )}
                        {!selectMode && filteredNotifications.length > 0 && (
                            <button
                                onClick={() => setSelectMode(true)}
                                className="px-4 py-2 text-sm font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-[50px] transition-colors"
                            >
                                Supprimer
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement des notifications...</div>
            ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500">Aucune notification pour le moment.</p>
                </div>
            ) : selectMode ? (
                <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === filteredNotifications.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            {selectedIds.length === filteredNotifications.length
                                ? 'Tout désélectionner'
                                : 'Tout sélectionner'}
                            <span className="text-xs text-gray-400 ml-1">({selectedIds.length}/{filteredNotifications.length})</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exitSelectMode}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={selectedIds.length === 0 || deleting}
                                className={`px-4 py-2 text-sm font-medium rounded-[50px] transition-colors border ${
                                    selectedIds.length === 0 || deleting
                                        ? 'bg-primary-50 text-primary-300 border-primary-100'
                                        : 'bg-white border-primary-300 text-primary-500 hover:bg-primary-50'
                                }`}
                            >
                                {deleting ? 'Suppression...' : `Supprimer (${selectedIds.length})`}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {filteredNotifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => toggleSelect(notif.id)}
                                className={`bg-white rounded-xl shadow border p-5 cursor-pointer transition-colors ${
                                    selectedIds.includes(notif.id)
                                        ? 'border-primary-300 ring-2 ring-primary-200'
                                        : notif.is_read ? 'border-gray-100' : 'border-primary-200 bg-primary-50/50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(notif.id)}
                                        onChange={() => toggleSelect(notif.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            {!notif.is_read && (
                                                <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                                            )}
                                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                {getTypeLabel(notif.type)}
                                            </span>
                                        </div>
                                        <h3 className={`text-sm font-semibold ${notif.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                            {notif.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">{notif.message}</p>
                                        {(notif.type === 'publication_created' || notif.type === 'publication_updated' || notif.type === 'publication_visible' || notif.type === 'new_comment') && notif.data?.group_id && (
                                            <Link
                                                href={notif.data.publication_id
                                                    ? `/dashboard/groups/${notif.data.group_id}?tab=publications&publication_id=${notif.data.publication_id}`
                                                    : `/dashboard/groups/${notif.data.group_id}?tab=publications`}
                                                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 mt-1"
                                                onClick={(e) => { e.stopPropagation(); if (!notif.is_read) markAsRead(notif.id); }}
                                            >
                                                Voir la publication →
                                            </Link>
                                        )}
                                        {(notif.type === 'training_assignment' || notif.type === 'training_publications_updated') && notif.data?.group_id && (
                                            <Link
                                                href={notif.data.formation_id
                                                    ? `/dashboard/groups/${notif.data.group_id}?tab=formations&formation_id=${notif.data.formation_id}`
                                                    : `/dashboard/groups/${notif.data.group_id}?tab=formations`}
                                                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 mt-1"
                                                onClick={(e) => { e.stopPropagation(); if (!notif.is_read) markAsRead(notif.id); }}
                                            >
                                                Voir la formation →
                                            </Link>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">
                                            {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                                                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                            })}
                                        </p>
                                        {notif.type === 'group_invitation' && notif.data?.invitation_id && !notif.is_read && (
                                            <div className="flex items-center space-x-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={(e) => handleDeclineInvitation(notif.data!.invitation_id, e)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors">
                                                    Refuser
                                                </button>
                                                <button onClick={(e) => handleAcceptInvitation(notif.data!.invitation_id, e)}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-[50px] transition-colors">
                                                    Accepter
                                                </button>
                                            </div>
                                        )}
                                        {notif.type === 'group_request' && notif.data?.request_id && !notif.is_read && (
                                            <div className="flex items-center space-x-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={(e) => handleDeclineRequest(notif.data!.request_id, e)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors">
                                                    Refuser
                                                </button>
                                                <button onClick={(e) => handleApproveRequest(notif.data!.request_id, e)}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-[50px] transition-colors">
                                                    Approuver
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${
                                            notif.is_read ? 'bg-gray-100 text-gray-500' : 'bg-primary-100 text-primary-700'
                                        }`}>
                                            {notif.is_read ? 'Lue' : 'Non lue'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => !notif.is_read && markAsRead(notif.id)}
                            className={`bg-white rounded-xl shadow border p-5 cursor-pointer transition-colors ${
                                notif.is_read ? 'border-gray-100' : 'border-primary-200 bg-primary-50/50'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        {!notif.is_read && (
                                            <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                                        )}
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            {getTypeLabel(notif.type)}
                                        </span>
                                    </div>
                                    <h3 className={`text-sm font-semibold ${notif.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                        {notif.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{notif.message}</p>
                                    {(notif.type === 'publication_created' || notif.type === 'publication_updated' || notif.type === 'publication_visible' || notif.type === 'new_comment') && notif.data?.group_id && (
                                        <Link
                                            href={notif.data.publication_id
                                                ? `/dashboard/groups/${notif.data.group_id}?tab=publications&publication_id=${notif.data.publication_id}`
                                                : `/dashboard/groups/${notif.data.group_id}?tab=publications`}
                                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 mt-1"
                                            onClick={(e) => { e.stopPropagation(); if (!notif.is_read) markAsRead(notif.id); }}
                                        >
                                            Voir la publication →
                                        </Link>
                                    )}
                                    {(notif.type === 'training_assignment' || notif.type === 'training_publications_updated') && notif.data?.group_id && (
                                        <Link
                                            href={notif.data.formation_id
                                                ? `/dashboard/groups/${notif.data.group_id}?tab=formations&formation_id=${notif.data.formation_id}`
                                                : `/dashboard/groups/${notif.data.group_id}?tab=formations`}
                                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 mt-1"
                                            onClick={(e) => { e.stopPropagation(); if (!notif.is_read) markAsRead(notif.id); }}
                                        >
                                            Voir la formation →
                                        </Link>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">
                                        {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                        })}
                                    </p>
                                    {notif.type === 'group_invitation' && notif.data?.invitation_id && !notif.is_read && (
                                        <div className="flex items-center space-x-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={(e) => handleDeclineInvitation(notif.data!.invitation_id, e)}
                                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors">
                                                Refuser
                                            </button>
                                            <button onClick={(e) => handleAcceptInvitation(notif.data!.invitation_id, e)}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-[50px] transition-colors">
                                                Accepter
                                            </button>
                                        </div>
                                    )}
                                    {notif.type === 'group_request' && notif.data?.request_id && !notif.is_read && (
                                        <div className="flex items-center space-x-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={(e) => handleDeclineRequest(notif.data!.request_id, e)}
                                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors">
                                                Refuser
                                            </button>
                                            <button onClick={(e) => handleApproveRequest(notif.data!.request_id, e)}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-[50px] transition-colors">
                                                Approuver
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${
                                        notif.is_read ? 'bg-gray-100 text-gray-500' : 'bg-primary-100 text-primary-700'
                                    }`}>
                                        {notif.is_read ? 'Lue' : 'Non lue'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
