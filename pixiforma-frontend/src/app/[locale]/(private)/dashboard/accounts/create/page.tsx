'use client';

import { useState, useEffect } from 'react';
import { CommonFunction } from '@/common';
import Label from '@/components/Atoms/AtomLabel/AtomLabel';
import { ETypographyType } from '@/Enum/Enum';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PermissionGuard from '@/components/PermissionGuard';

export default function CreateAccountPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<any[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        roles: [] as string[]
    });

    useEffect(() => {
        const fetchRoles = async () => {
            setLoadingRoles(true);
            try {
                const headers = await CommonFunction.createHeaders({ withToken: true });
                const res = await fetch('/api/roles', { headers });
                if (res.ok) {
                    const data = await res.json();
                    setRoles(data.roles || []);
                } else {
                    console.error('Create account roles API returned non-200', res.status);
                }
            } catch (error) {
                console.error('Error fetching roles', error);
            } finally {
                setLoadingRoles(false);
            }
        };
        fetchRoles();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleRoleToggle = (roleName: string) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(roleName)
                ? prev.roles.filter(r => r !== roleName)
                : [...prev.roles, roleName]
        }));
    };

    const getValidationError = (data: any): string => {
        if (data?.message) return data.message;
        if (data?.errors) {
            const firstKey = Object.keys(data.errors)[0];
            if (firstKey && data.errors[firstKey]?.length > 0) {
                return data.errors[firstKey][0];
            }
        }
        return 'Erreur lors de la création du compte.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                roles: formData.roles,
            };
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/user/invite', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.status === 201) {
                toast.success('Compte créé avec succès. Un e-mail a été envoyé à l\'utilisateur.');
                router.push('/dashboard');
            } else {
                toast.error(getValidationError(data));
            }
        } catch (error) {
            console.error('Error creating account', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PermissionGuard permission="creer-utilisateurs" fallback="redirect">
        <div className="p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    href="/dashboard/accounts"
                    className="w-9 h-9 rounded-[50px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                    aria-label="Retour"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <Label typeStyle={ETypographyType.H2} className="text-gray-900 font-bold">Créer un nouveau compte</Label>
                    <Label typeStyle={ETypographyType.BodyRegular} className="text-gray-500 mt-2 block">
                        Renseignez les informations de l&apos;utilisateur. Un mot de passe temporaire lui sera envoyé par e-mail.
                    </Label>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                    <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-[50px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        placeholder="Ex: Ahmed Ben Ali"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail</label>
                    <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-[50px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        placeholder="ahmed@example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle(s)</label>
                    {loadingRoles ? (
                        <p className="text-sm text-gray-400">Chargement des rôles...</p>
                    ) : (
                        <div className="space-y-2">
                            {roles.map((role) => (
                                <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.roles.includes(role.name)}
                                        onChange={() => handleRoleToggle(role.name)}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-700">{role.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`px-6 py-2 rounded-[50px] text-white font-medium ${isLoading ? 'bg-primary-300' : 'bg-primary-400 hover:bg-primary-500'} transition-colors`}
                    >
                        {isLoading ? 'Création...' : 'Créer et envoyer l\'invitation'}
                    </button>
                </div>
            </form>
        </div>
        </PermissionGuard>
    );
}
