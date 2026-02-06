'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/app/components/Icons';

// --- Types ---
interface AttendanceSummaryRow {
    teacherId: number;
    teacherName: string;
    nip: string;
    subject: string;
    totalDays: number;
    presentCount: number;
    lateCount: number;
    leaveCount: number;
    sickCount: number;
    absentCount: number;
    totalLateMinutes: number;
}

interface Teacher {
    id: number;
    name: string;
    nip: string;
}

interface ReportResponse {
    month: string;
    startDate: string;
    endDate: string;
    totalTeachers: number;
    data: AttendanceSummaryRow[];
}

// --- Helper: Format Month YYYY-MM ---
const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export default function AttendanceReportPage() {
    // --- State ---
    const [month, setMonth] = useState<string>(getCurrentMonth());
    const [mode, setMode] = useState<'all' | 'single'>('all');
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

    // Data State
    const [data, setData] = useState<AttendanceSummaryRow[]>([]);
    const [totalTeachers, setTotalTeachers] = useState<number>(0);
    const [teachersList, setTeachersList] = useState<Teacher[]>([]);

    // UI State
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // --- Fetch Teachers List (for Dropdown) ---
    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const response = await fetch('/api/v1/teachers');
                if (response.ok) {
                    const result = await response.json();
                    // Assumes /api/v1/teachers returns { data: Teacher[], meta: ... } 
                    // or just Teachers[] based on previous implementation.
                    // Checking previous implementation from memory/context: 
                    // It returns { data: [...], meta: ... }
                    setTeachersList(result.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch teachers:', err);
            }
        };
        fetchTeachers();
    }, []);

    // --- Fetch Report Data ---
    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        setData([]);

        try {
            let url = `/api/v1/reports/attendance/summary?month=${month}`;

            if (mode === 'single' && selectedTeacherId) {
                url += `&teacherId=${selectedTeacherId}`;
            }

            const response = await fetch(url);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal memuat laporan kehadiran.');
            }

            const reportData = result as ReportResponse;
            setData(reportData.data);
            setTotalTeachers(reportData.totalTeachers);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat mengambil data.');
            console.error('Fetch report error:', err);
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---
    const handleRefresh = (e: React.FormEvent) => {
        e.preventDefault();
        fetchReport();
    };

    const handleExportCSV = () => {
        if (data.length === 0) return;

        // CSV Header
        const headers = ['No', 'NIP', 'Nama', 'Mapel', 'Total Hari Kerja', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha', 'Total Menit Terlambat'];

        // CSV Rows
        const rows = data.map((row, index) => [
            index + 1,
            `"${row.nip}"`, // Quote NIP to prevent Excel scientific notation
            `"${row.teacherName}"`,
            `"${row.subject}"`,
            row.totalDays,
            row.presentCount,
            row.lateCount,
            row.leaveCount,
            row.sickCount,
            row.absentCount,
            row.totalLateMinutes
        ]);

        // Combine
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `laporan_kehadiran_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Initial fetch on mount or just wait for user action?
    // User request: "Tombol Tampilkan / Refresh -> trigger fetch".
    // Usually fetching on mount is good UX, but let's stick to explicit action or effect on dependencies?
    // Let's fetch on mount + whenever month/mode/teacherId changes effectively acts as "auto-refresh" which is nicer.
    // BUT the requirement explicitely asked for a button. 
    // I will include `fetchReport` in useEffect dependency of `month` if I want auto-fetch, 
    // but to be safe and follow "Tombol trigger fetch", I'll just do it on mount and button click.
    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Laporan Bulanan</h1>
                <p className="text-slate-400 font-medium">Rekapitulasi kehadiran guru per bulan.</p>
            </div>

            {/* Controls Section */}
            <div className="bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-700">
                <form onSubmit={handleRefresh} className="flex flex-col md:flex-row gap-4 items-end">

                    {/* Month Filter */}
                    <div className="w-full md:w-1/4">
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Bulan</label>
                        <input
                            type="month"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            required
                        />
                    </div>

                    {/* Mode Filter */}
                    <div className="w-full md:w-1/4">
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Mode Laporan</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                            value={mode}
                            onChange={(e) => {
                                setMode(e.target.value as 'all' | 'single');
                                if (e.target.value === 'all') setSelectedTeacherId(null);
                            }}
                        >
                            <option value="all">Semua Guru</option>
                            <option value="single">Per Guru</option>
                        </select>
                    </div>

                    {/* Teacher Dropdown (Conditional) */}
                    {mode === 'single' && (
                        <div className="w-full md:w-1/4">
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Pilih Guru</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                value={selectedTeacherId || ''}
                                onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
                                required={mode === 'single'}
                            >
                                <option value="" disabled>-- Pilih Guru --</option>
                                {teachersList.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.nip})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-full md:w-auto flex gap-2 ml-auto">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-md disabled:opacity-50"
                        >
                            <Icons.Search className="w-4 h-4" />
                            {loading ? 'Memuat...' : 'Tampilkan'}
                        </button>

                        <button
                            type="button"
                            onClick={handleExportCSV}
                            disabled={data.length === 0 || loading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </form>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-6 text-center">
                    <p className="text-red-400 font-bold mb-2">{error}</p>
                    <button
                        onClick={fetchReport}
                        className="text-sm text-red-300 underline hover:no-underline"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* Report Table */}
            {!loading && !error && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-200">
                            Hasil Laporan
                        </h2>
                        <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-xs font-bold">
                            Total: {totalTeachers} Guru
                        </span>
                    </div>

                    {data.length === 0 ? (
                        <div className="bg-slate-800 rounded-3xl p-12 text-center shadow-lg border border-slate-700">
                            <p className="text-slate-400 font-medium">Belum ada data kehadiran untuk periode ini.</p>
                        </div>
                    ) : (
                        <div className="bg-slate-800 rounded-3xl shadow-lg border border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-900/50 border-b border-slate-700">
                                        <tr>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-12">No</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">NIP</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Mapel</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Hari Kerja</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Hadir</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Telat</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Izin</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Sakit</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Alpha</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Total Telat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {data.map((row, index) => (
                                            <tr key={row.teacherId} className="hover:bg-slate-700/50 transition-colors">
                                                <td className="py-4 px-6 text-center font-medium text-slate-500">{index + 1}</td>
                                                <td className="py-4 px-6 font-mono text-sm text-slate-400">{row.nip}</td>
                                                <td className="py-4 px-6 font-bold text-slate-200">{row.teacherName}</td>
                                                <td className="py-4 px-6 text-slate-400">{row.subject}</td>
                                                <td className="py-4 px-6 text-center font-bold text-slate-300">{row.totalDays}</td>
                                                <td className="py-4 px-6 text-center font-bold text-emerald-400 bg-emerald-900/30">{row.presentCount}</td>
                                                <td className="py-4 px-6 text-center font-bold text-amber-400 bg-amber-900/30">{row.lateCount}</td>
                                                <td className="py-4 px-6 text-center font-bold text-blue-400">{row.leaveCount}</td>
                                                <td className="py-4 px-6 text-center font-bold text-cyan-400">{row.sickCount}</td>
                                                <td className="py-4 px-6 text-center font-bold text-rose-400 bg-rose-900/30">{row.absentCount}</td>
                                                <td className="py-4 px-6 text-center text-sm font-medium text-slate-400">
                                                    {row.totalLateMinutes > 0 ? `${row.totalLateMinutes}m` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Loading Indicator */}
            {loading && (
                <div className="flex justify-center py-12">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mb-4"></div>
                        <p className="text-slate-400 font-medium">Memuat data laporan...</p>
                    </div>
                </div>
            )}

        </div>
    );
}
