'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from './Icons';

interface SidebarProps {
    role: 'teacher' | 'admin';
    isSidebarOpen: boolean;
    onCloseSidebar: () => void;
}

export default function Sidebar({ role, isSidebarOpen, onCloseSidebar }: SidebarProps) {
    const pathname = usePathname();

    // --- Menu Configurations ---
    const teacherMenu = [
        { label: 'Dashboard', href: '/dashboard', icon: Icons.Home },
        { label: 'Scan QR', href: '/attendance/qr', icon: Icons.Camera },
        { label: 'Riwayat', href: '/attendance', icon: Icons.Calendar },
        { label: 'Profil Saya', href: '#', icon: Icons.User },
    ];

    const adminMenu = [
        { label: 'Dashboard', href: '/admin/dashboard', icon: Icons.Home },
        { label: 'Data Guru', href: '/admin/teachers', icon: Icons.Users },
        { label: 'Sinkronisasi', href: '/admin/fingerprint', icon: Icons.Fingerprint },
        { label: 'Laporan', href: '/admin/reports/attendance', icon: Icons.Clipboard },
        { label: 'Jadwal Kerja', href: '/admin/settings/work-schedules', icon: Icons.Clock },
    ];

    const menuItems = role === 'admin' ? adminMenu : teacherMenu;

    const isActive = (path: string) => {
        // Exact match or sub-path match for admin sections if needed
        if (path === '#' || path === '') return false;
        return pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
        // Special case for dashboard root
        // if (path === '/dashboard' && pathname === '/dashboard') return true;
        // return pathname.startsWith(path);
    };

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-purple-800 text-purple-50 shadow-xl transition-transform duration-300 md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Header Logo */}
            <div className="p-6 bg-purple-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3 font-bold text-2xl text-white tracking-tight">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        {role === 'admin' ? (
                            <Icons.Users className="w-6 h-6 text-white" />
                        ) : (
                            <Icons.Fingerprint className="w-6 h-6 text-white" />
                        )}
                    </div>
                    <span>{role === 'admin' ? 'Admin' : 'Presensi'}</span>
                </div>
                <button onClick={onCloseSidebar} className="md:hidden text-white hover:text-purple-200 transition-colors">
                    <Icons.X />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${active
                                ? 'bg-white/10 text-white shadow-inner border border-white/5'
                                : 'text-purple-200 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-purple-300 group-hover:text-white'}`} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="p-6 border-t border-purple-700">
                <button className="flex items-center gap-3 px-4 py-3 w-full text-purple-200 hover:text-white transition-colors hover:bg-white/5 rounded-xl text-left">
                    <Icons.LogOut /> Logout
                </button>
            </div>
        </aside>
    );
}
