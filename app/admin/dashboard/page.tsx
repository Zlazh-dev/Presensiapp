'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/app/components/Icons';

// --- Types ---
interface TopLateTeacher {
    teacherId: number;
    teacherName: string;
    nip: string;
    subject: string;
    lateMinutes: number;
}

interface TodaySummary {
    date: string;
    totalTeachers: number;
    presentCount: number;
    lateCount: number;
    leaveCount: number;
    sickCount: number;
    absentCount: number;
    topLateToday: TopLateTeacher[];
}

interface TopLateMonthlyTeacher {
    teacherId: number;
    teacherName: string;
    nip: string;
    subject: string;
    lateCount: number;
    totalLateMinutes: number;
}

interface TopLateMonthlyResponse {
    month: string;
    startDate: string;
    endDate: string;
    limit: number;
    data: TopLateMonthlyTeacher[];
}

export default function AdminDashboardPage() {
    // --- State ---
    const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
    const [loadingToday, setLoadingToday] = useState(true);
    const [errorToday, setErrorToday] = useState<string | null>(null);

    const [topLateMonthly, setTopLateMonthly] = useState<TopLateMonthlyResponse | null>(null);
    const [loadingTopLate, setLoadingTopLate] = useState(true);
    const [errorTopLate, setErrorTopLate] = useState<string | null>(null);

    // --- Fetch Data ---
    const fetchTodaySummary = async () => {
        setLoadingToday(true);
        setErrorToday(null);
        try {
            const res = await fetch('/api/v1/reports/attendance/today');
            if (!res.ok) throw new Error('Gagal memuat ringkasan hari ini.');
            const data = await res.json();
            setTodaySummary(data);
        } catch (err: any) {
            setErrorToday(err.message);
        } finally {
            setLoadingToday(false);
        }
    };

    const fetchTopLateMonthly = async () => {
        setLoadingTopLate(true);
        setErrorTopLate(null);
        try {
            const res = await fetch('/api/v1/reports/attendance/top-late'); // Default: current month
            if (!res.ok) throw new Error('Gagal memuat data keterlambatan bulanan.');
            const data = await res.json();
            setTopLateMonthly(data);
        } catch (err: any) {
            setErrorTopLate(err.message);
        } finally {
            setLoadingTopLate(false);
        }
    };

    useEffect(() => {
        fetchTodaySummary();
        fetchTopLateMonthly();
    }, []);

    // --- Helpers ---
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatMonth = (monthStr: string) => {
        // monthStr is YYYY-MM
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };

    // --- Components ---
    const LoadingState = () => (
        <div className="flex items-center justify-center p-8 bg-white rounded-3xl shadow-lg border border-purple-50 h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
    );

    const ErrorState = ({ message, onRetry }: { message: string, onRetry: () => void }) => (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center h-full">
            <Icons.AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-red-700 font-medium mb-4">{message}</p>
            <button onClick={onRetry} className="text-sm font-bold text-red-600 hover:underline">
                Coba Lagi
            </button>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Dashboard Admin</h1>
                    <p className="text-slate-400 font-medium">
                        Pantauan kehadiran hari ini, <span className="text-purple-400 font-semibold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <a href="/admin/reports/attendance" className="px-4 py-2 bg-slate-800 text-purple-300 text-sm font-bold border border-slate-700 rounded-lg shadow-sm hover:bg-slate-700 transition-colors flex items-center gap-2">
                        <Icons.FileText className="w-4 h-4" /> Laporan Bulanan
                    </a>
                    <a href="/admin/fingerprint" className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-purple-700 transition-colors flex items-center gap-2">
                        <Icons.Fingerprint className="w-4 h-4" /> Sync Mesin
                    </a>
                </div>
            </header>

            {/* --- SECTION 1: TODAY'S SUMMARY --- */}
            {loadingToday ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-[120px] bg-slate-800 rounded-3xl animate-pulse"></div>)}
                </div>
            ) : errorToday ? (
                <ErrorState message={errorToday} onRetry={fetchTodaySummary} />
            ) : todaySummary && (
                <div className="space-y-8">
                    {/* Stats Grid */}
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Guru', val: todaySummary.totalTeachers, color: 'text-purple-300', bg: 'bg-purple-900/50', icon: <Icons.Users className="w-6 h-6" /> },
                            { label: 'Hadir', val: todaySummary.presentCount, color: 'text-emerald-400', bg: 'bg-emerald-900/30', icon: <Icons.CheckCircle className="w-6 h-6" /> },
                            { label: 'Terlambat', val: todaySummary.lateCount, color: 'text-amber-400', bg: 'bg-amber-900/30', icon: <Icons.AlertCircle className="w-6 h-6" /> },
                            { label: 'Tidak Hadir', val: todaySummary.absentCount + todaySummary.leaveCount + todaySummary.sickCount, color: 'text-rose-400', bg: 'bg-rose-900/30', icon: <Icons.X className="w-6 h-6" /> },
                        ].map((item, idx) => (
                            <div key={idx} className="bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-700 flex items-center gap-4 hover:translate-y-[-2px] transition-transform duration-300">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${item.bg} ${item.color}`}>
                                    {item.icon}
                                </div>
                                <div>
                                    <div className={`text-3xl font-bold ${item.color} leading-none`}>{item.val}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{item.label}</div>
                                </div>
                            </div>
                        ))}
                    </section>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* --- SECTION 2: TODAY'S LATE LIST --- */}
                <div className="bg-slate-800 rounded-3xl shadow-lg p-8 border border-slate-700 xl:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                            Guru Terlambat Hari Ini
                        </h2>
                        {todaySummary && todaySummary.lateCount > 0 && (
                            <span className="text-xs font-bold bg-amber-900/50 text-amber-500 px-3 py-1 rounded-full border border-amber-900">
                                Total: {todaySummary.lateCount}
                            </span>
                        )}
                    </div>

                    {loadingToday ? (
                        <div className="animate-pulse space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-700 rounded-xl"></div>)}
                        </div>
                    ) : (todaySummary?.topLateToday && todaySummary.topLateToday.length > 0) ? (
                        <div className="space-y-4">
                            {todaySummary.topLateToday.map((teacher) => (
                                <div key={teacher.teacherId} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-2xl border border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-amber-900/50 flex items-center justify-center text-amber-500 font-bold text-lg">
                                            !
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200">{teacher.teacherName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{teacher.subject} • NIP: {teacher.nip}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-amber-500">{teacher.lateMinutes}m</div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">Keterlambatan</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                                <Icons.CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="text-slate-300 font-bold mb-1">Semua Datang Tepat Waktu</p>
                            <p className="text-slate-500 text-sm">Tidak ada guru yang terlambat hari ini.</p>
                        </div>
                    )}
                </div>

                {/* --- SECTION 3: MONTHLY TOP LATE --- */}
                <div className="bg-slate-800 rounded-3xl shadow-lg p-8 border border-slate-700 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <Icons.TrendUp className="text-rose-500 w-5 h-5" />
                            Top Terlambat
                        </h2>
                        {topLateMonthly && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-700 px-2 py-1 rounded-lg">
                                {formatMonth(topLateMonthly.month)}
                            </span>
                        )}
                    </div>

                    {loadingTopLate ? (
                        <div className="animate-pulse space-y-4 flex-1">
                            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-700 rounded-xl"></div>)}
                        </div>
                    ) : errorTopLate ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-rose-400 text-sm">{errorTopLate}</p>
                        </div>
                    ) : (topLateMonthly?.data && topLateMonthly.data.length > 0) ? (
                        <div className="space-y-4 flex-1">
                            {topLateMonthly.data.map((teacher, index) => (
                                <div key={teacher.teacherId} className="p-4 rounded-2xl border border-slate-700 bg-slate-700/30 relative overflow-hidden group hover:border-rose-900 hover:bg-rose-900/10 transition-colors">
                                    <div className="absolute top-0 right-0 bg-slate-700 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg group-hover:bg-rose-900 group-hover:text-rose-400 transition-colors">
                                        RANK #{index + 1}
                                    </div>

                                    <div className="mb-2">
                                        <div className="font-bold text-slate-200 leading-tight">{teacher.teacherName}</div>
                                        <div className="text-xs text-slate-500">{teacher.subject}</div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50">
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase">Total Menit</div>
                                            <div className="text-lg font-bold text-rose-500">{teacher.totalLateMinutes}m</div>
                                        </div>
                                        <div className="w-px h-8 bg-slate-700"></div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase">Frekuensi</div>
                                            <div className="text-lg font-bold text-slate-400">{teacher.lateCount}x</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                            <Icons.CheckCircle className="w-12 h-12 text-emerald-500/50 mb-3" />
                            <p className="text-slate-400 font-medium text-sm">Belum ada keterlambatan bulan ini.</p>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-slate-700">
                        <a href="/admin/reports/attendance" className="block w-full text-center text-sm font-bold text-purple-400 hover:text-purple-300 hover:underline">
                            Lihat Laporan Lengkap →
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
