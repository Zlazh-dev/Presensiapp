'use client';

import React from 'react';
import { Icons } from '@/app/components/Icons';

// --- Types ---
interface AttendanceRecord {
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: 'present' | 'late' | 'leave' | 'sick' | 'absent';
    is_late: boolean;
    late_minutes: number;
    notes: string | null;
}

interface AttendanceSummary {
    total_days: number;
    present: number;
    late: number;
    leave: number;
    sick: number;
    absent: number;
}

interface AttendanceResponse {
    data: AttendanceRecord[];
    summary: AttendanceSummary;
}

// --- Mock Data ---
const mockSummary: AttendanceSummary = {
    total_days: 22,
    present: 20,
    late: 4,
    leave: 1,
    sick: 1,
    absent: 0
};

const mockHistory: AttendanceRecord[] = [
    { date: "2026-02-05", check_in_time: "06:55", check_out_time: null, status: "present", is_late: false, late_minutes: 0, notes: null },
    { date: "2026-02-04", check_in_time: "06:50", check_out_time: "15:05", status: "present", is_late: false, late_minutes: 0, notes: null },
    { date: "2026-02-03", check_in_time: "07:15", check_out_time: "15:30", status: "late", is_late: true, late_minutes: 15, notes: "Macet" },
    { date: "2026-02-02", check_in_time: "06:58", check_out_time: "15:00", status: "present", is_late: false, late_minutes: 0, notes: null },
    { date: "2026-02-01", check_in_time: null, check_out_time: null, status: "present", is_late: false, late_minutes: 0, notes: null }, // Weekend/Off logic skipped for brevity
];

export default function TeacherDashboardPage() {
    const { total_days, present, late, leave, sick, absent } = mockSummary;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard Presensi Saya</h1>
                    <p className="text-slate-500 font-medium">Ringkasan bulan <span className="text-purple-700 font-semibold">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span></p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Status Hari Ini</div>
                    <div className="text-emerald-600 font-bold flex items-center gap-2 justify-end">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Sudah Check-in
                    </div>
                </div>
            </header>

            {/* Cards Grid */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Hadir', val: present, color: 'text-emerald-700', bg: 'bg-emerald-100', icon: '✅' },
                    { label: 'Terlambat', val: late, color: 'text-amber-700', bg: 'bg-amber-100', icon: '⚠️' },
                    { label: 'Izin', val: leave, color: 'text-blue-700', bg: 'bg-blue-100', icon: '📩' },
                    { label: 'Sakit', val: sick, color: 'text-cyan-700', bg: 'bg-cyan-100', icon: '💊' },
                    { label: 'Alpha', val: absent, color: 'text-rose-700', bg: 'bg-rose-100', icon: '❌' },
                ].map((item, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl shadow-lg border border-purple-50 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform duration-300">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${item.bg}`}>
                            {item.icon}
                        </div>
                        <div className={`text-4xl font-black ${item.color} tracking-tighter`}>{item.val}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</div>
                    </div>
                ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Today's Status Card */}
                <div className="bg-gradient-to-br from-indigo-700 to-purple-800 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/20 transition-colors"></div>

                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Icons.Fingerprint className="w-6 h-6 text-purple-300" />
                        Status Hari Ini
                    </h2>

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="text-purple-200 text-xs font-bold uppercase mb-1">Check In</div>
                            <div className="text-4xl font-mono font-bold tracking-tight">06:55</div>
                        </div>
                        <div className="w-px h-12 bg-purple-500/50"></div>
                        <div>
                            <div className="text-purple-200 text-xs font-bold uppercase mb-1 text-right">Check Out</div>
                            <div className="text-4xl font-mono font-bold tracking-tight text-purple-300">--:--</div>
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/5">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300">
                                <Icons.TrendUp className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-emerald-300">Tepat Waktu</div>
                                <p className="text-xs text-purple-200 mt-1 leading-relaxed">Terima kasih sudah datang tepat waktu! Pertahankan kinerja anda.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent History */}
                <div className="bg-white rounded-3xl shadow-lg p-8 border border-purple-50 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-800">5 Hari Terakhir</h2>
                        <a href="/attendance" className="text-sm font-bold text-purple-600 hover:underline">Lihat Semua</a>
                    </div>

                    <div className="overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                                    <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Masuk</th>
                                    <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Pulang</th>
                                    <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockHistory.map((row, i) => (
                                    <tr key={i} className="hover:bg-purple-50/50 transition-colors border-b border-slate-50 last:border-0">
                                        <td className="py-4 font-medium text-slate-700">
                                            {new Date(row.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </td>
                                        <td className="py-4 font-mono text-sm text-slate-500">{row.check_in_time || '-'}</td>
                                        <td className="py-4 font-mono text-sm text-slate-500">{row.check_out_time || '-'}</td>
                                        <td className="py-4 text-right">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${row.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                                    row.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {row.status === 'late' ? `Telat ${row.late_minutes}m` : row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
