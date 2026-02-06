'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import { Icons } from '@/app/components/Icons';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useCurrentUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Not authenticated - redirect to login
                router.push('/login');
            } else if (user.role === 'TEACHER') {
                // Teacher should not access admin routes
                router.push('/attendance/qr');
            }
            // ADMIN and PRINCIPAL can proceed
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }

    if (!user || user.role === 'TEACHER') {
        return null; // Will redirect
    }

    const adminMenu = [
        { label: 'Dashboard', href: '/admin', icon: Icons.Home },
        { label: 'QR Display', href: '/admin/qr', icon: Icons.Monitor },
        { label: 'Guru', href: '/admin/teachers', icon: Icons.Users },
        { label: 'Laporan', href: '/admin/reports', icon: Icons.FileText },
        { label: 'Pengaturan', href: '/admin/settings', icon: Icons.Settings },
    ];

    const isActive = (path: string) => {
        if (path === '/admin') {
            return pathname === path;
        }
        return pathname.startsWith(path);
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/v1/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-200">
                    <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
                    <p className="text-sm text-slate-500 mt-1">{user.name}</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {adminMenu.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.href)
                                    ? 'bg-purple-50 text-purple-700 font-medium'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 w-full transition-colors"
                    >
                        <Icons.LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
