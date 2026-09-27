'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CommonFunction } from '@/common';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-toastify';
import PermissionGuard from '@/components/PermissionGuard';
import { AtomInput } from '@/components/Atoms';

interface Group {
    id: number;
    name: string;
    description: string | null;
    creator_id: number;
    creator: { id: number; name: string; email: string };
    members_count?: number;
    created_at: string;
    is_member?: boolean;
    request_status?: string | null;
    total_formations_count?: number;
    guided_formations_count?: number;
    free_formations_count?: number;
}

interface Collaborator {
    id: number;
    name: string;
    email: string;
}

export default function GroupsPage() {
    const { user, isAdmin, isFormateur } = useAuth();
    const isCollaborateur = !isAdmin && !isFormateur;
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [sendingInvites, setSendingInvites] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<Group | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [membersGroup, setMembersGroup] = useState<Group | null>(null);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [removingMember, setRemovingMember] = useState(false);

    const fetchGroups = async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/groups', { headers });
            if (res.ok) {
                const data = await res.json();
                setGroups(data.data || data || []);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err?.message || 'Erreur lors du chargement des groupes.');
            }
        } catch (error) {
            console.error('Error fetching groups', error);
            toast.error('Erreur réseau lors du chargement des groupes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {fetchGroups();}, []);

    const sortedGroups = [...groups].sort((a, b) => {
        if (a.is_member && !b.is_member) return -1;
        if (!a.is_member && b.is_member) return 1;
        return 0;
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/groups', {
                method: 'POST',headers,body: JSON.stringify(createForm),});
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Groupe créé avec succès.');
                setShowCreateModal(false);
                setCreateForm({ name: '', description: '' });
                fetchGroups();
            } else {
                toast.error(data.message || 'Erreur lors de la création.');
            }
        } catch (error) {
            console.error('Error creating group', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setSaving(false);
        }
    };

    const openInviteModal = async (group: Group) => {
        setSelectedGroup(group);
        setShowInviteModal(true);
        setSearchQuery('');
        setSelectedIds([]);
        setCollaborators([]);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/users/collaborators', { headers });
            if (res.ok) {
                const data = await res.json();
                setCollaborators(data.data || data || []);
            }
        } catch (error) {
            console.error('Error fetching collaborators', error);
        }
    };

    const searchCollaborators = async (query: string) => {
        setSearchQuery(query);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const url = query ? `/api/users/collaborators?search=${encodeURIComponent(query)}` : '/api/users/collaborators';
            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                setCollaborators(data.data || data || []);
            }
        } catch (error) {
            console.error('Error searching collaborators', error);
        }
    };

    const toggleSelected = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const sendInvitations = async () => {
        if (!selectedGroup || selectedIds.length === 0) return;
        setSendingInvites(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${selectedGroup.id}/invitations`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ recipient_ids: selectedIds }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Invitation(s) envoyée(s).');
                setShowInviteModal(false);
                setSelectedGroup(null);
            } else {
                toast.error(data.message || "Erreur lors de l'envoi des invitations.");
            }
        } catch (error) {
            console.error('Error sending invitations', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setSendingInvites(false);
        }
    };

    const handleRequestJoin = async (groupId: number) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}/request-join`, {
                method: 'POST',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Demande envoyée avec succès.');
                fetchGroups();
            } else {
                toast.error(data.message || "Erreur lors de l'envoi de la demande.");
            }
        } catch (error) {
            console.error('Error requesting to join', error);
            toast.error('Une erreur inattendue est survenue.');
        }
    };

    const handleLeaveGroup = async (groupId: number) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}/leave`, {
                method: 'POST',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Vous avez quitté le groupe.');
                fetchGroups();
            } else {
                toast.error(data.message || "Erreur lors de la sortie du groupe.");
            }
        } catch (error) {
            console.error('Error leaving group', error);
            toast.error('Une erreur inattendue est survenue.');
        }
    };

    const handleViewMembers = async (group: Group) => {
        setMembersGroup(group);
        setShowMembersModal(true);
        setLoadingMembers(true);
        setGroupMembers([]);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${group.id}/members`, { headers });
            if (res.ok) {
                const data = await res.json();
                setGroupMembers(data.members || data.data?.members || []);
            } else {
                toast.error("Erreur lors du chargement des membres.");
            }
        } catch (error) {
            console.error('Error fetching members', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setLoadingMembers(false);
        }
    };

    const canManage = (group: Group) => isAdmin || user?.id === group.creator_id;

    const handleRemoveMember = async (memberId: number) => {
        if (!membersGroup) return;
        setRemovingMember(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${membersGroup.id}/members/${memberId}`, {
                method: 'DELETE',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Membre retiré du groupe.');
                handleViewMembers(membersGroup);
            } else {
                toast.error(data.message || "Erreur lors du retrait du membre.");
            }
        } catch (error) {
            console.error('Error removing member', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setRemovingMember(false);
        }
    };

    const handleDelete = async (group: Group) => {
        setDeleting(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${group.id}`, {
                method: 'DELETE',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Groupe supprimé.');
                setDeleteConfirm(null);
                fetchGroups();
            } else {
                toast.error(data.message || 'Erreur lors de la suppression.');
            }
        } catch (error) {
            console.error('Error deleting group', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <PermissionGuard permission="voir-groupes" fallback="redirect">
        <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
                <Link
                    href="/dashboard"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0"
                    aria-label="Retour"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div className="flex-1 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isCollaborateur ? 'Groupes disponibles' : 'Gestion des groupes'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {isCollaborateur
                                ? 'Consultez les groupes et demandez votre inscription.'
                                : 'Créer et gérer les groupes de collaborateurs.'}
                        </p>
                    </div>
                    {!isCollaborateur && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors font-medium text-sm"
                        >
                            + Créer un groupe
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement des groupes...</div>
            ) : groups.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-100">
                    <p className="text-gray-500">Aucun groupe pour le moment.</p>
                    {!isCollaborateur && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors font-medium text-sm"
                        >
                            Créer votre premier groupe
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {sortedGroups.map((group) => (
                        <div key={group.id} className="bg-white rounded-lg shadow border border-gray-100 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {!isCollaborateur || group.is_member ? (
                                            <Link
                                                href={`/dashboard/groups/${group.id}`}
                                                className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                                            >
                                                {group.name}
                                            </Link>
                                        ) : (
                                            <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                                        )}
                                        {isCollaborateur && group.is_member && (
                                            <span className="px-2 py-0.5 text-xs font-medium text-primary-700 bg-primary-100 rounded-full">
                                                Membre
                                            </span>
                                        )}
                                        {isCollaborateur && group.request_status === 'pending' && (
                                            <span className="px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                                                Demande en attente
                                            </span>
                                        )}
                                        {isCollaborateur && group.request_status === 'declined' && (
                                            <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                                                Demande refusée
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{group.description || 'Aucune description'}</p>
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        <span className="text-xs text-gray-400">
                                            Créé par {group.creator?.name || 'Inconnu'} le {new Date(group.created_at).toLocaleDateString()}
                                        </span>
                                        {group.members_count !== undefined && (
                                            <span className="text-xs text-gray-400">
                                                · {group.members_count} membre{group.members_count !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {!isCollaborateur && group.total_formations_count !== undefined && (
                                            <div className="flex items-center gap-2 ml-1">
                                                <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded-full">
                                                    {group.total_formations_count} Formation{group.total_formations_count !== 1 ? 's' : ''}
                                                </span>
                                                {group.guided_formations_count !== undefined && group.guided_formations_count > 0 && (
                                                    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">
                                                        {group.guided_formations_count} Guidée{group.guided_formations_count !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {group.free_formations_count !== undefined && group.free_formations_count > 0 && (
                                                    <span className="px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 rounded-full">
                                                        {group.free_formations_count} Libre{group.free_formations_count !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                    {isCollaborateur ? (
                                        group.is_member ? (
                                            <button
                                                onClick={() => handleLeaveGroup(group.id)}
                                                className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                                            >
                                                Quitter
                                            </button>
                                        ) : !group.request_status && (
                                            <button
                                                onClick={() => handleRequestJoin(group.id)}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-lg transition-colors"
                                            >
                                                Demander l&apos;inscription
                                            </button>
                                        )
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleViewMembers(group)}
                                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                Voir les membres
                                            </button>
                                            <button
                                                onClick={() => openInviteModal(group)}
                                                className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                                            >
                                                Inviter des collaborateurs
                                            </button>
                                            {(isAdmin || user?.id === group.creator_id) && (
                                                <button
                                                    onClick={() => setDeleteConfirm(group)}
                                                    className="px-3 py-1.5 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-lg transition-colors"
                                                >
                                                    Supprimer
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {!isCollaborateur && showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Créer un groupe</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du groupe</label>
                                <AtomInput
                                    id="create-group-name"
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white h-auto"
                                    placeholder="Ex: Groupe A"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <AtomInput
                                    id="create-group-desc"
                                    isTextArea={true}
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none bg-white h-auto"
                                    placeholder="Description du groupe (optionnelle)"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${saving ? 'bg-primary-300' : 'bg-primary-400 hover:bg-primary-500'}`}
                                >
                                    {saving ? 'Création...' : 'Créer le groupe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && selectedGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">
                            Inviter des collaborateurs
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Groupe : <span className="font-semibold">{selectedGroup.name}</span>
                        </p>

                        <div className="mb-4">
                            <AtomInput
                                id="search-collaborators"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => searchCollaborators(e.target.value)}
                                placeholder="Rechercher par nom ou email..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white h-auto"
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                            {collaborators.length === 0 ? (
                                <p className="text-center py-8 text-gray-400 text-sm">Aucun collaborateur trouvé.</p>
                            ) : (
                                collaborators.map((collab) => (
                                    <label
                                        key={collab.id}
                                        className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                                            selectedIds.includes(collab.id) ? 'bg-primary-50' : ''
                                        }`}
                                    >
                                        <AtomInput
                                            id={`collab-${collab.id}`}
                                            type="checkbox"
                                            checked={selectedIds.includes(collab.id)}
                                            onChange={() => toggleSelected(collab.id)}
                                            className="w-4 h-4 text-primary-600 rounded border-gray-300 mr-3"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{collab.name}</p>
                                            <p className="text-xs text-gray-500">{collab.email}</p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-gray-500">
                                {selectedIds.length} collaborateur(s) sélectionné(s)
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => { setShowInviteModal(false); setSelectedGroup(null); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={sendInvitations}
                                    disabled={selectedIds.length === 0 || sendingInvites}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                                        selectedIds.length === 0 || sendingInvites
                                            ? 'bg-primary-300'
                                            : 'bg-primary-400 hover:bg-primary-500'
                                    }`}
                                >
                                    {sendingInvites ? 'Envoi...' : `Inviter (${selectedIds.length})`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Members Modal */}
            {showMembersModal && membersGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">
                                Membres de &quot;{membersGroup.name}&quot;
                            </h2>
                            <button
                                onClick={() => setShowMembersModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >
                                &times;
                            </button>
                        </div>
                        {loadingMembers ? (
                            <div className="text-center py-8 text-gray-500">Chargement des membres...</div>
                        ) : groupMembers.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">Aucun membre dans ce groupe.</div>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {groupMembers.map((member: any) => (
                                    <div key={member.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                            <p className="text-xs text-gray-500">{member.email}</p>
                                        </div>
                                        {membersGroup && canManage(membersGroup) && member.id !== membersGroup.creator_id && (
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                disabled={removingMember}
                                                className="px-3 py-1 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {removingMember ? '...' : 'Supprimer'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <p className="text-xs text-gray-400 pt-2 text-center">
                                    {groupMembers.length} membre{groupMembers.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        )}
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => setShowMembersModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Supprimer le groupe</h2>
                        <p className="text-gray-600 text-sm mb-6">
                            Êtes-vous sûr de vouloir supprimer le groupe &quot;{deleteConfirm.name}&quot; ? Cette action est irréversible.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                                {deleting ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGuard>
    );
}
