'use client';

import { useState } from 'react';
import { CommonFunction } from '@/common';
import Label from '@/components/Atoms/AtomLabel/AtomLabel';
import { ETypographyType } from '@/Enum/Enum';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';

export default function ChangePasswordPage() {
    const { update } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        password_confirmation: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password !== formData.password_confirmation) {
            toast.error('Les mots de passe ne correspondent pas.');
            return;
        }

        if (formData.password.length < 8) {
            toast.error('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        setIsLoading(true);

        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/user/change-password', {
                method: 'POST',
                headers,
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Mot de passe mis à jour avec succès.');
                await update({ force_password_change: false });
                window.location.href = '/dashboard';
            } else {
                toast.error(data?.message || 'Erreur lors de la mise à jour du mot de passe.');
            }
        } catch (error) {
            console.error('Error changing password', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="mb-8 text-center">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <Label typeStyle={ETypographyType.H2} className="text-gray-900 font-bold text-xl">Changement de mot de passe requis</Label>
                    <Label typeStyle={ETypographyType.BodyRegular} className="text-gray-500 mt-2 block">
                        Pour des raisons de sécurité, veuillez modifier le mot de passe temporaire qui vous a été attribué.
                    </Label>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                        <input 
                            type="password" 
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-[50px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                            placeholder="Min. 8 caractères"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                        <input 
                            type="password" 
                            name="password_confirmation"
                            value={formData.password_confirmation}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-[50px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                            placeholder="Retapez le nouveau mot de passe"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 rounded-[50px] text-white font-medium ${isLoading ? 'bg-primary-300' : 'bg-primary-400 hover:bg-primary-500'} transition-colors`}
                        >
                            {isLoading ? 'Mise à jour...' : 'Mettre à jour et continuer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
