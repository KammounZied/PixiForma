'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CommonFunction } from '@/common';
import { useAuth } from '@/hooks/useAuth';
import PermissionGuard from '@/components/PermissionGuard';
import { toast } from 'react-toastify';
import { AtomInput } from '@/components/Atoms';

interface User {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    force_password_change: boolean;
    created_at: string;
    roles: { id: number; name: string }[];
}

interface Role {
    id: number;
    name: string;
}

export default function AccountsPage() {
    const { can } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', roles: [] as string[] });
    const [saving, setSaving] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: 'toggle' | 'delete'; user: User } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchUsers = async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/users', { headers });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.data || data);
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('GET /api/users failed:', res.status, errData);
                toast.error(errData?.message || `Erreur API (${res.status}) lors du chargement des utilisateurs.`);
            }
        } catch (error) {
            console.error('Error fetching users', error);
            toast.error('Erreur réseau lors du chargement des utilisateurs.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/roles', { headers });
            if (res.ok) {
                const data = await res.json();
                setRoles(data.roles || []);
            }
        } catch (error) {
            console.error('Error fetching roles', error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            roles: user.roles?.map(r => r.name) || [],
        });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setSaving(true);
        try {
            const payload: any = { name: editForm.name, email: editForm.email };
            if (can('modifier-utilisateurs') && editForm.roles.length > 0) {
                payload.roles = editForm.roles;
            }

            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'Compte modifié avec succès.');
                setEditingUser(null);
                fetchUsers();
            } else {
                toast.error(data.message || 'Erreur lors de la modification.');
            }
        } catch (error) {
            console.error('Error updating user', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (user: User) => {
        setActionLoading(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/users/${user.id}/toggle-status`, {
                method: 'PUT',
                headers,
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setConfirmAction(null);
                fetchUsers();
            } else {
                toast.error(data.message || 'Erreur lors du changement de statut.');
                setConfirmAction(null);
            }
        } catch (error) {
            console.error('Error toggling user status', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (user: User) => {
        setActionLoading(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                headers,
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'Compte supprimé avec succès.');
                setConfirmAction(null);
                fetchUsers();
            } else {
                toast.error(data.message || 'Erreur lors de la suppression.');
                setConfirmAction(null);
            }
        } catch (error) {
            console.error('Error deleting user', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (isActive: boolean) => {
        return isActive
            ? <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">Actif</span>
            : <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Inactif</span>;
    };

    return (
        <PermissionGuard permission="voir-utilisateurs" fallback="redirect">
        <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    href="/dashboard"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                    aria-label="Retour"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{can('modifier-utilisateurs') ? 'Gestion des comptes' : 'Liste des utilisateurs'}</h1>
                    {can('modifier-utilisateurs') && <p className="text-gray-500 mt-1">Modifier, activer, désactiver ou supprimer les comptes utilisateurs.</p>}
                </div>
                {can('creer-utilisateurs') && (
                    <Link
                        href="/dashboard/accounts/create"
                        className="ml-auto px-6 py-2.5 text-sm font-semibold text-white rounded-full bg-primary-400 hover:bg-primary-500 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg"
                    >
                        Créer nouveau compte
                    </Link>
                )}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement des utilisateurs...</div>
            ) : (
                <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Nom</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Email</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Rôle</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                                    {can('modifier-utilisateurs') && (
                                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.roles?.map(r => r.name).join(', ') || '—'}
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(user.is_active)}</td>
                                        {can('modifier-utilisateurs') && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'toggle', user })}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                                                        user.is_active
                                                            ? 'bg-white border-primary-300 text-primary-500 hover:bg-primary-50'
                                                            : 'text-primary-600 bg-primary-50 hover:bg-primary-100 border-transparent'
                                                    }`}
                                                >
                                                    {user.is_active ? 'Désactiver' : 'Activer'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'delete', user })}
                                                    className="px-3 py-1.5 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-lg transition-colors"
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        </td>
                                        )}
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={can('modifier-utilisateurs') ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                                            Aucun utilisateur trouvé.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Modifier le compte</h2>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                                <AtomInput
                                    id="edit-user-name"
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white h-auto"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail</label>
                                <AtomInput
                                    id="edit-user-email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white h-auto"
                                />
                            </div>
                            {can('modifier-utilisateurs') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle(s)</label>
                                    <div className="space-y-2">
                                        {roles.map((role) => (
                                            <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                                                <AtomInput
                                                    id={`role-${role.id}`}
                                                    type="checkbox"
                                                    checked={editForm.roles.includes(role.name)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setEditForm({ ...editForm, roles: [...editForm.roles, role.name] });
                                                        } else {
                                                            setEditForm({ ...editForm, roles: editForm.roles.filter(r => r !== role.name) });
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-700">{role.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                                        saving ? 'bg-primary-300' : 'bg-primary-400 hover:bg-primary-500'
                                    }`}
                                >
                                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">
                            {confirmAction.type === 'toggle'
                                ? `${confirmAction.user.is_active ? 'Désactiver' : 'Activer'} le compte`
                                : 'Supprimer le compte'}
                        </h2>
                        <p className="text-gray-600 text-sm mb-6">
                            {confirmAction.type === 'toggle'
                                ? `Êtes-vous sûr de vouloir ${confirmAction.user.is_active ? 'désactiver' : 'activer'} le compte de "${confirmAction.user.name}" ?`
                                : `Êtes-vous sûr de vouloir supprimer définitivement le compte de "${confirmAction.user.name}" ? Cette action est irréversible.`
                            }
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setConfirmAction(null)}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() =>
                                    confirmAction.type === 'toggle'
                                        ? handleToggleStatus(confirmAction.user)
                                        : handleDelete(confirmAction.user)
                                }
                                disabled={actionLoading}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                                    actionLoading
                                        ? 'bg-primary-50 text-primary-300 border-primary-100'
                                        : confirmAction.type === 'delete'
                                            ? 'bg-white border-primary-300 text-primary-500 hover:bg-primary-50'
                                            : confirmAction.user.is_active
                                                ? 'bg-white border-primary-300 text-primary-500 hover:bg-primary-50'
                                                : 'bg-primary-400 hover:bg-primary-500 border-transparent text-white'
                                }`}
                            >
                                {actionLoading
                                    ? 'Traitement...'
                                    : confirmAction.type === 'toggle'
                                        ? confirmAction.user.is_active ? 'Désactiver' : 'Activer'
                                        : 'Supprimer'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGuard>
    );
}
