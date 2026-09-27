'use client';

import { useEffect, useMemo, useState } from 'react';
import { CommonFunction } from '@/common';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/Atoms';
import { ECheckBoxStatus, ETypographyType } from '@/Enum/Enum';
import Label from '@/components/Atoms/AtomLabel/AtomLabel';
import { toast } from 'react-toastify';

const MODULE_ORDER = [
    'utilisateurs', 'roles', 'groupes', 'invitations', 'demandes',
    'publications', 'formations', 'commentaires'
];

const MODULE_LABELS: Record<string, string> = {
    utilisateurs: 'Module Utilisateurs',
    roles: 'Module Rôles',
    groupes: 'Module Groupes',
    invitations: 'Module Invitations',
    demandes: "Module Demandes d'Adhésion",
    publications: 'Module Publications',
    formations: 'Module Formations',
    commentaires: 'Module Commentaires',
};

const ACTION_LABELS: Record<string, string> = {
    voir: 'Voir',
    creer: 'Créer',
    modifier: 'Modifier',
    supprimer: 'Supprimer',
};

function getModuleFromName(name: string): string {
    const parts = name.split('-');
    return parts.slice(1).join('-');
}

function getShortLabel(name: string): string {
    const action = name.split('-')[0];
    return ACTION_LABELS[action] || name;
}

export default function TemplateRoles() {
    const t = useTranslations();
    const [roles, setRoles] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const groupedPermissions = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const perm of permissions) {
            const mod = getModuleFromName(perm.name);
            if (!map.has(mod)) map.set(mod, []);
            map.get(mod)!.push(perm);
        }
        const result: { module: string; perms: any[] }[] = [];
        for (const mod of MODULE_ORDER) {
            if (map.has(mod)) {
                result.push({ module: mod, perms: map.get(mod)! });
            }
        }
        return result;
    }, [permissions]);

    const fetchRoles = async () => {
        setIsLoading(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/roles`, { headers });

            if (res.ok) {
                const data = await res.json();
                setRoles(data.roles || []);
                setPermissions(data.permissions || []);
            } else {
                console.error('Roles API returned error', res.status);
                throw new Error('Failed to fetch roles');
            }
        } catch (err: any) {
            console.error("Error fetching roles:", err);
            toast.error(t('roles.fetchError'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const togglePermission = async (roleId: number, permissionName: string) => {
        try {
            const updatedRoles = roles.map(r => {
                if (r.id === roleId) {
                    const hasPerm = r.permissions.some((p: any) => p.name === permissionName);
                    return {
                        ...r,
                        permissions: hasPerm 
                            ? r.permissions.filter((p: any) => p.name !== permissionName)
                            : [...r.permissions, { name: permissionName }]
                    };
                }
                return r;
            });
            setRoles(updatedRoles);

            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/roles/${roleId}/permissions/toggle`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ permission_name: permissionName })
            });

            if (res.ok) {
                toast.success(t('roles.updateSuccess'));
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
            console.error("Toggle error", error);
            toast.error(t('roles.updateError'));
            fetchRoles();
        }
    };

    if (isLoading) return <div className="p-8 text-center flex justify-center items-center min-h-[400px]"><Label typeStyle={ETypographyType.BodyRegular}>{t('roles.loading')}</Label></div>;

    return (
        <div className="p-6 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-screen">
            <div className="mb-8 border-b border-gray-100 pb-6">
                <Label typeStyle={ETypographyType.H2} className="text-gray-900 font-bold">{t('roles.title')}</Label>
                <Label typeStyle={ETypographyType.BodyRegular} className="text-gray-500 mt-2 block">{t('roles.description')}</Label>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-gray-100/80 border-b border-gray-200">
                            <th className="px-6 py-3 font-semibold bg-gray-100/80 sticky left-0 z-10 border-r border-gray-200 min-w-[200px]" />
                            {groupedPermissions.map(group => (
                                <th
                                    key={group.module}
                                    colSpan={group.perms.length}
                                    className="px-4 py-3 font-semibold text-center text-gray-600 text-xs uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                                >
                                    {MODULE_LABELS[group.module] || group.module}
                                </th>
                            ))}
                        </tr>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600">
                            <th className="px-6 py-5 font-semibold bg-gray-50 sticky left-0 z-10 border-r border-gray-200 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                {t('roles.role')}
                            </th>
                            {groupedPermissions.flatMap(group =>
                                group.perms.map(perm => (
                                    <th key={perm.id} className="px-3 py-5 font-semibold text-center whitespace-nowrap text-sm border-r border-gray-100 last:border-r-0">
                                        {getShortLabel(perm.name)}
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {roles.map((role) => {
                            const isAdmin = role.name === 'Admin';
                            return (
                                <tr key={role.id} className={`hover:bg-primary-50/30 transition-colors group ${isAdmin ? 'bg-purple-50/30' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-gray-800 bg-white group-hover:bg-primary-50/30 sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-3 ${isAdmin ? 'bg-purple-500' : 'bg-primary-500'}`}></div>
                                            {role.name}
                                        </div>
                                    </td>
                                    {groupedPermissions.flatMap(group =>
                                        group.perms.map(perm => {
                                            const hasPermission = role.permissions.some((p: any) => p.name === perm.name);
                                            return (
                                                <td key={`${role.id}-${perm.id}`} className="px-3 py-4 border-r border-gray-50 last:border-r-0">
                                                    <div className="flex justify-center items-center h-full">
                                                        <div className="transition-transform">
                                                            <Checkbox 
                                                                id={`checkbox-${role.id}-${perm.id}`}
                                                                status={isAdmin ? ECheckBoxStatus.checked : (hasPermission ? ECheckBoxStatus.checked : ECheckBoxStatus.unchecked)}
                                                                disabled={isAdmin}
                                                                onClick={isAdmin ? undefined : () => togglePermission(role.id, perm.name)}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
