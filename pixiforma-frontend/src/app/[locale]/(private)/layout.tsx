'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import MoleculeSidebar from '@/components/Molecules/MoleculeSidebar/MoleculeSidebar';
import { IconComponentsEnum } from '@/Enum/Enum';
import { Routes } from '@/lib/routes';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function PrivateLayout({children,}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const { can, hasRole } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const forcePasswordChange = status === 'authenticated' && (session?.user as any)?.force_password_change;

    useEffect(() => {
        if (forcePasswordChange) {
            if (pathname !== '/change-password') {
                router.push('/change-password');
            }
        }
    }, [forcePasswordChange, pathname, router]);

    const navigationItems = useMemo(() => [
        {
            id: 'dashboard',
            iconName: IconComponentsEnum.house,
            label: 'Accueil',
            href: Routes.Dashboard
        },
        {
            id: 'comptes',
            iconName: IconComponentsEnum.user,
            label: 'Liste des comptes',
            href: '/dashboard/accounts',
            hidden: !can('voir-utilisateurs')
        },
        {
            id: 'create-account',
            iconName: IconComponentsEnum.userPlus,
            label: 'Créer compte',
            href: '/dashboard/accounts/create',
            hidden: !can('creer-utilisateurs')
        },
        {
            id: 'roles',
            iconName: IconComponentsEnum.shield,
            label: 'Rôles',
            href: '/dashboard/roles',
            hidden: !can('modifier-roles')
        },
        {
            id: 'groupes',
            iconName: IconComponentsEnum.squaresFour,
            label: 'Groupes',
            href: '/dashboard/groups',
            hidden: !can('voir-groupes')
        },
        {
            id: 'mes-formations',
            iconName: IconComponentsEnum.bookOpenText,
            label: 'Mes formations',
            href: '/dashboard/mes-formations',
            hidden: !hasRole('Collaborateur')
        },
        {
            id: 'mes-demandes',
            iconName: IconComponentsEnum.clipboardList,
            label: 'Mes demandes',
            href: '/dashboard/mes-demandes',
            hidden: !hasRole('Collaborateur')
        },
        {
            id: 'mes-invitations',
            iconName: IconComponentsEnum.mail,
            label: 'Mes invitations',
            href: '/dashboard/invitations',
            hidden: !hasRole('Collaborateur')
        },
        {
            id: 'demandes-inscrits',
            iconName: IconComponentsEnum.clipboardList,
            label: 'Demandes d\'inscrits',
            href: '/dashboard/demandes',
            hidden: !hasRole('Formateur')
        },
        {
            id: 'suivi-apprenants',
            iconName: IconComponentsEnum.bookOpenTextRotated,
            label: 'Suivi apprenants',
            href: '/dashboard/suivi-apprenants',
            hidden: !hasRole('Formateur')
        },
    ], [can, hasRole]);

    return (
        <ProtectedRoute>
            <div className='flex min-h-screen'>
                {!forcePasswordChange && (
                    <MoleculeSidebar navigationItems={navigationItems} />
                )}
                <main className={`flex-1 ${!forcePasswordChange ? 'ml-16' : ''}`}>
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
