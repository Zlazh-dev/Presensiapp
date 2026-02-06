'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/app/components/Icons';

interface AttendanceRecord {
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
    is_late: boolean;
    late_minutes: number;
    notes: string | null;
}

interface AttendanceSummary {
    total_days: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    sick: number;
}

export default function AttendanceHistoryPage() {
    const router = useRouter();
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<AttendanceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        fetchAttendance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month]);

    const fetchAttendance = async () => {
        setLoading(true);
        setError(null);

        try {
            // Build date range based on selected month
            // If month is "2026-02", start="2026-02-01"
            const [year, monthStr] = month.split('-');
            const yearNum = parseInt(year);
            const monthNum = parseInt(monthStr);

            // Last day of month
            const lastDay = new Date(yearNum, monthNum, 0).getDate();

            const startDate = `${month}-01`;
            const endDate = `${month}-${lastDay}`;

            const res = await fetch(`/api/v1/attendance/my?start_date=${startDate}&end_date=${endDate}`);

            if (res.status === 401) {
                // Unauthenticated
                router.push('/login');
                return;
            }

            if (!res.ok) {
                const errData = await res.json();

                // Specific error handling for "Teacher not found"
                if (res.status === 404 && errData.message === 'Teacher not found for current user') {
                    throw new Error('Akun ini belum terhubung ke data guru. Silakan hubungi admin.');
                }

                throw new Error(errData.message || 'Gagal memuat data presensi');
            }

            const data = await res.json();
            setAttendances(data.data || []);
            setSummary(data.summary || null);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        // Status from backend is lowercase: 'present', 'late', 'absent', 'leave', 'sick'
        // Normalize to upper for mapping if needed, or just use lowercase keys
        const normalizedStatus = status.toLowerCase();

        const styles: Record<string, string> = {
            present: 'bg-emerald-900/30 text-emerald-400 ring-1 ring-emerald-900/50',
            late: 'bg-amber-900/30 text-amber-400 ring-1 ring-amber-900/50',
            absent: 'bg-rose-900/30 text-rose-400 ring-1 ring-rose-900/50',
            leave: 'bg-blue-900/30 text-blue-400 ring-1 ring-blue-900/50',
            sick: 'bg-purple-900/30 text-purple-400 ring-1 ring-purple-900/50',
        };

        const labels: Record<string, string> = {
            present: 'Hadir',
            late: 'Terlambat',
            absent: 'Tidak Hadir',
            leave: 'Izin',
            sick: 'Sakit',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[normalizedStatus] || 'bg-slate-800 text-slate-400 ring-1 ring-slate-700'}`}>
                {labels[normalizedStatus] || status}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="min-h-screen p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
                            Riwayat Presensi
                        </h1>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                        />
                    </div>

                    {/* Summary */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                            <div className="bg-emerald-900/30 rounded-xl p-4 text-center border border-emerald-900/50">
                                <div className="text-2xl font-bold text-emerald-400">{summary.present}</div>
                                <div className="text-xs text-emerald-500 font-medium">Hadir</div>
                            </div>
                            <div className="bg-amber-900/30 rounded-xl p-4 text-center border border-amber-900/50">
                                <div className="text-2xl font-bold text-amber-400">{summary.late}</div>
                                <div className="text-xs text-amber-500 font-medium">Terlambat</div>
                            </div>
                            <div className="bg-rose-900/30 rounded-xl p-4 text-center border border-rose-900/50">
                                <div className="text-2xl font-bold text-rose-400">{summary.absent}</div>
                                <div className="text-xs text-rose-500 font-medium">Tidak Hadir</div>
                            </div>
                            <div className="bg-blue-900/30 rounded-xl p-4 text-center border border-blue-900/50">
                                <div className="text-2xl font-bold text-blue-400">{summary.leave}</div>
                                <div className="text-xs text-blue-500 font-medium">Izin</div>
                            </div>
                            <div className="bg-purple-900/30 rounded-xl p-4 text-center border border-purple-900/50">
                                <div className="text-2xl font-bold text-purple-400">{summary.sick}</div>
                                <div className="text-xs text-purple-500 font-medium">Sakit</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Attendance List */}
                <div className="bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-700">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <Icons.AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                            <p className="text-rose-400 font-medium">{error}</p>
                            <button
                                onClick={fetchAttendance}
                                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    ) : attendances.length === 0 ? (
                        <div className="text-center py-12">
                            <Icons.Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">Belum ada data presensi</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {attendances.map((record, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700/50"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-purple-900/50 rounded-xl flex items-center justify-center">
                                            <Icons.Calendar className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200">
                                                {formatDate(record.date)}
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                Masuk: {record.check_in_time || '-'} • Keluar: {record.check_out_time || '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {record.late_minutes > 0 && (
                                            <span className="text-xs text-amber-500 font-medium">
                                                +{record.late_minutes}m
                                            </span>
                                        )}
                                        {getStatusBadge(record.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
