import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

export function useAuth() {
    const { data: session } = useSession();
    const sessionUser = session?.user as any;
    const actualUser = sessionUser?.user || sessionUser;

    return useMemo(() => {
        const roles: string[] = actualUser?.roles?.map((r: any) => r.name) || [];
        const permissions: string[] =
            actualUser?.roles?.flatMap((r: any) =>
                r.permissions?.map((p: any) => p.name) || []
            ) || [];

        return {
            user: actualUser,
            roles,
            permissions,
            isAdmin: roles.includes('Admin'),
            isFormateur: roles.includes('Formateur'),
            isCollaborateur: !roles.includes('Admin') && !roles.includes('Formateur'),
            hasRole: (roleName: string) => roles.includes(roleName),
            can: (permission: string) => permissions.includes(permission),
            canAny: (...perms: string[]) => perms.some(p => permissions.includes(p)),
            canAll: (...perms: string[]) => perms.every(p => permissions.includes(p)),
        };
    }, [actualUser]);
}
