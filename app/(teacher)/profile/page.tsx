'use client';

import { Icons } from '@/app/components/Icons';

export default function ProfilePage() {
    return (
        <div className="min-h-screen p-6 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-20 h-20 bg-purple-900/50 rounded-full flex items-center justify-center border border-purple-500/20">
                            <Icons.User className="w-10 h-10 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-100">Profil Saya</h1>
                            <p className="text-slate-400">Informasi akun Anda</p>
                        </div>
                    </div>

                    <div className="space-y-6 border-t border-slate-700 pt-6">
                        <div className="bg-purple-900/20 border border-purple-900/50 rounded-xl p-6 text-center">
                            <Icons.AlertCircle className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                            <h3 className="font-bold text-slate-200 mb-2">Halaman Profil</h3>
                            <p className="text-sm text-slate-400">
                                Fitur pengaturan profil akan segera tersedia. Anda dapat mengelola informasi akun, mengubah password, dan mengatur preferensi di sini.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
                                <div className="flex items-center space-x-3 mb-2">
                                    <Icons.User className="w-5 h-5 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap</span>
                                </div>
                                <div className="text-slate-200 font-medium">-</div>
                            </div>

                            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
                                <div className="flex items-center space-x-3 mb-2">
                                    <Icons.FileText className="w-5 h-5 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-400 uppercase">NIP</span>
                                </div>
                                <div className="text-slate-200 font-medium">-</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
