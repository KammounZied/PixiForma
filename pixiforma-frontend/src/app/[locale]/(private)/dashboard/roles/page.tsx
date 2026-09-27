'use client';

import Link from 'next/link';
import { TemplateRoles } from '@/components/Templates';
import PermissionGuard from '@/components/PermissionGuard';

export default function RolesPage() {
    return (
        <PermissionGuard permission="modifier-roles" fallback="redirect">
            <div>
                <div className="flex items-center gap-3 px-8 pt-8 pb-0">
                    <Link
                        href="/dashboard"
                        className="w-9 h-9 rounded-[50px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                        aria-label="Retour"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <span className="text-sm text-gray-400 font-medium">Tableau de bord</span>
                </div>
                <TemplateRoles />
            </div>
        </PermissionGuard>
    );
}
