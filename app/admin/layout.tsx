'use client';

import React, { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { Icons } from '@/app/components/Icons';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-purple-50 font-sans text-slate-800 flex flex-col md:flex-row">
            <Sidebar role="admin" isSidebarOpen={isSidebarOpen} onCloseSidebar={() => setIsSidebarOpen(false)} />

            <main className="flex-1 min-h-screen transition-all md:w-[calc(100%-16rem)]">
                {/* Mobile Header (Part of Layout now) */}
                <div className="md:hidden bg-purple-800 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-30">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Icons.Users className="w-6 h-6" /> Admin Panel
                    </div>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-lg">
                        <Icons.Menu className="w-6 h-6" />
                    </button>
                </div>

                {children}
            </main>
        </div>
    );
}
