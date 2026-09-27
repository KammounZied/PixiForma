# Refactor Rôles & Permissions

## Objectif
Remplacer les vérifications par rôle (`userRoles.includes('Admin')`) par un système de permissions CRUD avec hook typé `useAuth()` et guard `PermissionGuard`.

---

## 1. Types partagés — `src/interfaces/Auth/IAuth.ts`

```typescript
export interface Permission {
    id: number;
    name: string;  // "create-users", "view-publications", etc.
}

export interface Role {
    id: number;
    name: string;
    permissions: Permission[];
}

export interface IUserWithRoles {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    force_password_change: boolean;
    created_at: string;
    roles: Role[];
}

export type PermissionAction = 'create' | 'view' | 'edit' | 'delete' | 'manage';
export type PermissionEntity =
    | 'users' | 'roles' | 'groups' | 'requests'
    | 'publications' | 'formations' | 'comments';
export type PermissionName = `${PermissionAction}-${PermissionEntity}`;
```

Ajouter `export * from './Auth/IAuth'` dans `src/interfaces/index.ts`.

---

## 2. Hook useAuth — `src/hooks/useAuth.ts`

```typescript
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
```

---

## 3. PermissionGuard — `src/components/PermissionGuard.tsx`

```typescript
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
```

---

## 4. Migrations des pages existantes

### 4.1 `src/app/[locale]/(private)/dashboard/page.tsx`

| Ligne actuelle | Remplacer par |
|---|---|
| `const userRoles = actualUser?.roles...` | `const { isAdmin, canManageGroups, isCollaborateur, roles, can } = useAuth();` |
| `const isAdmin = userRoles.includes('Admin')` | Supprimé (fourni par useAuth) |
| `const canManageGroups = isAdmin \|\| userRoles.includes('Formateur')` | `const canManageGroups = canAny('create-groups', 'manage-groups')` |
| `const isCollaborator = userRoles.includes('Collaborateur')` | Supprimé (fourni par useAuth) |

### 4.2 `src/app/[locale]/(private)/dashboard/accounts/page.tsx`

| Ligne actuelle | Remplacer par |
|---|---|
| `const { data: session } = useSession();` | `const { isAdmin, can } = useAuth();` |
| `const sessionUser = session?.user as any;` | Supprimé |
| `const userRoles = actualUser?.roles...` | Supprimé |
| `const isAdmin = userRoles.includes('Admin')` | Supprimé |
| `{isAdmin && (` pour l'édition des rôles | `{can('edit-users') && (` |

### 4.3 `src/app/[locale]/(private)/dashboard/groups/page.tsx`

| Ligne actuelle | Remplacer par |
|---|---|
| `const { data: session } = useSession();` | `const { user, isAdmin, isFormateur, can } = useAuth();` |
| Tout le bloc d'extraction session | Supprimé |
| `const isAdmin = userRoles.includes('Admin')` | Supprimé |
| `const isFormateur = userRoles.includes('Formateur')` | Supprimé |
| `actualUser?.id === group.creator_id` | `user?.id === group.creator_id` |
| `isCollaborateur` | `!can('create-groups')` |

### 4.4 `src/app/[locale]/(private)/dashboard/roles/page.tsx`

Ajouter `PermissionGuard permission="manage-roles"` autour du contenu.

### 4.5 `src/app/[locale]/(private)/dashboard/accounts/create/page.tsx`

Ajouter `PermissionGuard permission="create-users"` autour du contenu.

---

## 5. Sidebar — filtrage des items par permission

Dans `src/app/[locale]/(private)/layout.tsx`, les items de navigation du sidebar seront filtrés par permission :

| Item | Permission requise |
|---|---|
| Dashboard | toujours visible |
| Notification | toujours visible |
| Gestion des comptes | `view-users` |
| Créer un compte | `create-users` |
| Gestion des rôles | `manage-roles` |
| Gestion des groupes | `view-groups` |
| Demandes | `approve-requests` |

---

## 6. Permissions à créer côté backend Laravel

| Permission | Admin | Formateur | Collaborateur |
|---|---|---|---|
| `view-users` | ✅ | ✅ | ❌ |
| `create-users` | ✅ | ❌ | ❌ |
| `edit-users` | ✅ | ❌ | ❌ |
| `delete-users` | ✅ | ❌ | ❌ |
| `manage-roles` | ✅ | ❌ | ❌ |
| `view-groups` | ✅ | ✅ | ✅ |
| `create-groups` | ✅ | ✅ | ❌ |
| `edit-groups` | ✅ | ✅ | ❌ |
| `delete-groups` | ✅ | ✅ | ❌ |
| `approve-requests` | ✅ | ✅ | ❌ |
| `view-publications` | ✅ | ✅ | ✅ |
| `create-publications` | ✅ | ✅ | ❌ |
| `edit-publications` | ✅ | ✅ | ❌ |
| `delete-publications` | ✅ | ✅ | ❌ |
| `view-formations` | ✅ | ✅ | ✅ |
| `manage-formations` | ✅ | ✅ | ❌ |
| `view-comments` | ✅ | ✅ | ✅ |
| `create-comments` | ✅ | ✅ | ✅ |
| `delete-comments` | ✅ | ✅ | ❌ |

---

## Ordre d'exécution

1. `src/interfaces/Auth/IAuth.ts` + mise à jour de `interfaces/index.ts`
2. `src/hooks/useAuth.ts`
3. `src/components/PermissionGuard.tsx`
4. Migration `dashboard/page.tsx`
5. Migration `accounts/page.tsx`
6. Migration `groups/page.tsx`
7. Ajout guard sur `roles/page.tsx` et `accounts/create/page.tsx`
8. Mise à jour du `layout.tsx` pour le filtrage sidebar
