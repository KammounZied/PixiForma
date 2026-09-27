'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface Props {
    permission?: string;
    permissions?: string[];
    match?: 'all' | 'any';
    role?: string;
    fallback?: 'redirect' | 'hidden' | ReactNode;
    children: ReactNode;
}

export default function PermissionGuard({
    permission, permissions, match = 'any',
    role, fallback = 'hidden', children
}: Props) {
    const { can, canAll, canAny, hasRole } = useAuth();
    const router = useRouter();

    let granted = true;
    if (permission) granted = can(permission);
    else if (permissions && match === 'all') granted = canAll(...permissions);
    else if (permissions && match === 'any') granted = canAny(...permissions);
    else if (role) granted = hasRole(role);

    useEffect(() => {
        if (!granted && fallback === 'redirect') {
            router.push('/dashboard');
        }
    }, [granted, fallback, router]);

    if (!granted) {
        if (fallback === 'redirect') return null;
        if (fallback === 'hidden') return null;
        return <>{fallback}</>;
    }
    return <>{children}</>;
}
