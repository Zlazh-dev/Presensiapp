'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icons } from '@/app/components/Icons';

export default function TeacherDashboardPage() {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    return (
        <div className="min-h-screen p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Welcome Header */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">
                        Selamat Datang, Guru! 👋
                    </h1>
                    <p className="text-slate-500">Portal Presensi Guru</p>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-4xl font-bold text-purple-600">
                                    {formatTime(currentTime)}
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                    {formatDate(currentTime)}
                                </div>
                            </div>
                            <Icons.Clock className="w-16 h-16 text-purple-200" />
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link
                        href="/attendance/qr"
                        className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1 border-2 border-transparent hover:border-purple-200"
                    >
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Icons.Camera className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">
                                    Scan QR Code
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Presensi masuk/keluar dengan QR
                                </p>
                            </div>
                            <Icons.Zap className="w-5 h-5 text-purple-400" />
                        </div>
                    </Link>

                    <Link
                        href="/attendance"
                        className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1 border-2 border-transparent hover:border-indigo-200"
                    >
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <Icons.Calendar className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">
                                    Riwayat Presensi
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Lihat histori kehadiran Anda
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Info Card */}
                <div className="bg-purple-600 text-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-start space-x-4">
                        <Icons.AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-lg mb-2">Petunjuk Presensi</h3>
                            <ul className="space-y-1 text-purple-50 text-sm">
                                <li>• Pastikan Anda scan QR saat check-in di pagi hari</li>
                                <li>• Jangan lupa scan QR saat check-out sebelum pulang</li>
                                <li>• Riwayat presensi dapat dilihat di menu "Riwayat Presensi"</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
