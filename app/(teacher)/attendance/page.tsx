'use client';

import React, { useState, useEffect } from 'react';
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

interface ApiResponse {
    data: AttendanceRecord[];
    summary: AttendanceSummary;
}

// --- Helper Functions ---
const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'present': return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
        case 'late': return 'bg-amber-100 text-amber-700 ring-amber-200';
        case 'leave': return 'bg-blue-100 text-blue-700 ring-blue-200';
        case 'sick': return 'bg-purple-100 text-purple-700 ring-purple-200';
        case 'absent': return 'bg-rose-100 text-rose-700 ring-rose-200';
        default: return 'bg-gray-100 text-gray-700 ring-gray-200';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'present': return 'Hadir';
        case 'late': return 'Terlambat';
        case 'leave': return 'Izin';
        case 'sick': return 'Sakit';
        case 'absent': return 'Alpha';
        default: return '-';
    }
};

// Format date for input (YYYY-MM-DD)
const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
};

export default function AttendanceHistoryPage() {
    // State Management
    const [data, setData] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<AttendanceSummary>({
        total_days: 0,
        present: 0,
        late: 0,
        leave: 0,
        sick: 0,
        absent: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(formatDateForInput(firstDayOfMonth));
    const [endDate, setEndDate] = useState(formatDateForInput(lastDayOfMonth));
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);

    // TODO: Replace with actual auth - hardcoded teacher ID for now
    const TEMP_TEACHER_ID = 1;

    // Fetch attendance data
    const fetchAttendance = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                teacher_id: TEMP_TEACHER_ID.toString(),
                start_date: startDate,
                end_date: endDate,
            });

            const response = await fetch(`/api/v1/attendance/my?${params}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal mengambil data kehadiran');
            }

            const result: ApiResponse = await response.json();
            setData(result.data);
            setSummary(result.summary);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat memuat data');
            console.error('Fetch attendance error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load data on mount and when date filters change
    useEffect(() => {
        fetchAttendance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    // Handle filter apply
    const handleApplyFilter = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
    };

    // Loading State
    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                        <p className="text-slate-600 font-medium">Memuat data kehadiran...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <div className="text-red-600 font-bold text-lg mb-2">⚠️ Terjadi Kesalahan</div>
                    <p className="text-red-700 mb-4">{error}</p>
                    <button
                        onClick={fetchAttendance}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition-all"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">

            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Riwayat Kehadiran</h1>
                    <p className="text-slate-500 font-medium">Laporan lengkap aktivitas presensi anda.</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-bold border border-rose-100 hover:bg-rose-100 transition-colors shadow-sm">
                        <Icons.FileText className="w-4 h-4" /> PDF
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm">
                        <Icons.Download className="w-4 h-4" /> Excel
                    </button>
                </div>
            </div>

            {/* Filter & Summary Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Filters */}
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-purple-50 xl:col-span-1">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Icons.Filter className="w-4 h-4 text-purple-600" /> Filter Periode
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Mulai</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-700"
                                    value={tempStartDate}
                                    onChange={(e) => setTempStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Selesai</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-700"
                                    value={tempEndDate}
                                    onChange={(e) => setTempEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleApplyFilter}
                            className="w-full bg-purple-600 text-white font-bold py-2 rounded-xl shadow-md hover:bg-purple-700 transition-all active:scale-95"
                        >
                            Terapkan Filter
                        </button>
                    </div>
                </div>

                {/* Mini Stats Summary */}
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-purple-50 xl:col-span-2 flex flex-col justify-center">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Ringkasan Periode Ini</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Total', val: summary.total_days, color: 'text-slate-700', bg: 'bg-slate-50' },
                            { label: 'Hadir', val: summary.present, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Terlambat', val: summary.late, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Izin / Sakit', val: summary.leave + summary.sick, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Alpha', val: summary.absent, color: 'text-rose-600', bg: 'bg-rose-50' }
                        ].map((stat, idx) => (
                            <div key={idx} className={`${stat.bg} p-3 rounded-2xl flex flex-col items-center justify-center text-center border border-transparent hover:border-slate-100 transition-all`}>
                                <span className={`text-2xl font-bold ${stat.color}`}>{stat.val}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Attendance History List/Table */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800">Daftar Kehadiran</h2>

                {data.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-lg border border-purple-50 p-12 text-center">
                        <div className="text-slate-400 mb-2">
                            <Icons.Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        </div>
                        <p className="text-slate-500 font-medium">Tidak ada data kehadiran untuk periode ini</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-3xl shadow-lg border border-purple-50 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Masuk</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Pulang</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.map((rec, i) => (
                                        <tr key={i} className="hover:bg-purple-50/50 transition-colors">
                                            <td className="py-4 px-6 font-medium text-slate-700">{formatDate(rec.date)}</td>
                                            <td className="py-4 px-6 font-mono text-sm text-slate-600">{rec.check_in_time || '-'}</td>
                                            <td className="py-4 px-6 font-mono text-sm text-slate-600">{rec.check_out_time || '-'}</td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ring-1 ring-inset ${getStatusColor(rec.status)}`}>
                                                    {getStatusLabel(rec.status)}
                                                </span>
                                                {rec.is_late && <div className="text-[10px] text-amber-600 font-bold mt-1">+{rec.late_minutes}m</div>}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-500 italic max-w-xs truncate">
                                                {rec.notes || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                            {data.map((rec, i) => (
                                <div key={i} className="bg-white p-5 rounded-3xl shadow-md border border-purple-50 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-slate-800">{formatDate(rec.date)}</div>
                                            <div className="text-xs text-slate-400 mt-1">{new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'long' })}</div>
                                        </div>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ring-1 ring-inset ${getStatusColor(rec.status)}`}>
                                            {getStatusLabel(rec.status)}
                                        </span>
                                    </div>

                                    <div className="flex gap-4 border-t border-slate-100 pt-3">
                                        <div className="flex-1">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Datang</div>
                                            <div className="font-mono font-bold text-slate-700 text-lg">{rec.check_in_time || '--:--'}</div>
                                            {rec.is_late && <span className="text-[10px] text-amber-600 font-bold">Telat {rec.late_minutes}m</span>}
                                        </div>
                                        <div className="border-l border-slate-100 mx-2"></div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Pulang</div>
                                            <div className="font-mono font-bold text-slate-700 text-lg">{rec.check_out_time || '--:--'}</div>
                                        </div>
                                    </div>

                                    {rec.notes && (
                                        <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 italic border border-slate-100">
                                            "{rec.notes}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
