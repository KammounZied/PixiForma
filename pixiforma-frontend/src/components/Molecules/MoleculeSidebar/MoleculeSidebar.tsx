"use client";

import { Icon } from '@/components/Atoms';
import { IMoleculeSidebarProps } from '@/interfaces';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Api } from '@/common/StandardApi/api';
import { CommonFunction, Config } from '@/common';
import { IconComponentsEnum } from '@/Enum/Enum';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LogoSrc from '../../../assets/images/picto.png';

const PUBLICATION_TYPES = ['publication_created', 'publication_visible', 'publication_deleted'];

const MoleculeSidebar = ({ navigationItems }: IMoleculeSidebarProps) => {
    const pathname = usePathname();
    const { isCollaborateur } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const normalizedPathname = pathname?.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
    const fetchUnreadCount = useCallback(async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch('/api/notifications', { headers });
            if (res.ok) {
                const data = await res.json();
                const allNotifs: { type: string; is_read: boolean }[] = data.data || [];
                if (isCollaborateur) {
                    const filtered = allNotifs.filter(n => !PUBLICATION_TYPES.includes(n.type));
                    setUnreadCount(filtered.filter(n => !n.is_read).length);
                } else {
                    setUnreadCount(data.unread_count || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching notifications count:', error);
        }
    }, [isCollaborateur]);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 5000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    const handleLogout = async () => {
        try {
            const api = new Api(Config.getInstance().API_URL);
            await api.post('/logout', {}, await CommonFunction.createHeaders({ withToken: true }));
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await signOut({ callbackUrl: '/login' });
        }
    };

    return (
        <aside
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`h-screen bg-primary-700 border-r border-white/10 flex flex-col py-5 fixed top-0 left-0 z-50 transition-all duration-300 ${isHovered ? 'w-48' : 'w-16'}`}
        >
            <div className={`flex items-center mb-8 ${isHovered ? 'px-4 justify-start' : 'justify-center'}`}>
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                    <Image
                        src={LogoSrc}
                        alt="Logo"
                        width={36}
                        height={36}
                        className="object-contain"
                    />
                </div>
                {isHovered && (
                    <span className="ml-3 text-sm font-bold text-white truncate">PixiForma</span>
                )}
            </div>

            <nav className="flex-1 flex flex-col gap-1.5 px-2">
                {navigationItems
                    .filter(item => !item.hidden)
                    .map(item => {
                        let isActive = false;

                        isActive = normalizedPathname === item.href;

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                title={item.label}
                                className={`flex items-center gap-3 h-10 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-primary-400 text-white shadow-md shadow-black/20'
                                        : 'text-primary-200 hover:bg-white/10 hover:text-white'
                                    } ${isHovered ? 'px-3' : 'w-10 justify-center mx-auto'}`}
                                aria-label={item.label}
                            >
                                <Icon name={item.iconName} size="text-xl" />
                                <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 hidden'}`}>{item.label}</span>
                            </Link>
                        );
                    })}
            </nav>

            <div className={`flex flex-col gap-1.5 mt-auto pt-3 border-t border-white/10 ${isHovered ? 'px-2' : 'items-center px-3'}`}>
                <Link
                    href="/notifications"
                    title="Notifications"
                    className={`flex items-center gap-2 h-10 rounded-xl transition-all duration-200 relative ${normalizedPathname.startsWith('/notifications')
                            ? 'bg-primary-400 text-white shadow-md shadow-black/20'
                            : 'text-primary-200 hover:bg-white/10 hover:text-white'
                        } ${isHovered ? 'px-3' : 'w-6 justify-center mx-auto'}`}
                    aria-label="Notifications"
                >
                    <div className="relative flex items-center justify-center">
                         <Icon name={IconComponentsEnum.bell} size="text-2xl"  />
                         {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )} 
                    </div>
                    <span className={`text-sm whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 hidden'}`}>Notifications</span>
                </Link>
                <button
                    onClick={handleLogout}
                    title="Se déconnecter"
                    className={`flex items-center gap-3 h-10 rounded-xl text-red-300 hover:bg-white/10 hover:text-red-400 transition-all duration-200 ${isHovered ? 'px-3' : 'w-10 justify-center mx-auto'}`}
                    aria-label="Logout"
                >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className={`text-sm whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 hidden'}`}>Déconnexion</span>
                </button>
            </div>
        </aside>
    );
};

export default MoleculeSidebar;
