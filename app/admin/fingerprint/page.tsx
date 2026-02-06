'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/app/components/Icons';

interface Teacher {
    id: number;
    nip: string;
    name: string;
    subject: string;
    fingerprint_id: string;
    status: string;
}

interface FingerprintLog {
    fingerprint_id: string;
    scanned_at: string;
    raw_type: 'IN' | 'OUT';
}

interface ImportResult {
    imported: number;
    skipped: number;
    processed_date_range: {
        start: string | null;
        end: string | null;
    };
    samples?: Array<{
        teacher_name: string;
        teacher_nip: string;
        date: string;
        check_in: string | null;
        check_out: string | null;
        status: string;
        late_minutes: number;
    }>;
}

// Sample data for testing (can be replaced with actual file parsing)
const SAMPLE_LOGS: FingerprintLog[] = [
    { fingerprint_id: "FP-001", scanned_at: "2026-02-05T06:55:00.000Z", raw_type: "IN" },
    { fingerprint_id: "FP-001", scanned_at: "2026-02-05T15:10:00.000Z", raw_type: "OUT" },
    { fingerprint_id: "FP-002", scanned_at: "2026-02-05T06:50:00.000Z", raw_type: "IN" },
    { fingerprint_id: "FP-002", scanned_at: "2026-02-05T15:05:00.000Z", raw_type: "OUT" },
    { fingerprint_id: "FP-003", scanned_at: "2026-02-05T07:15:00.000Z", raw_type: "IN" },
    { fingerprint_id: "FP-003", scanned_at: "2026-02-05T15:30:00.000Z", raw_type: "OUT" },
];

export default function FingerprintSyncPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
    const [teacherError, setTeacherError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch teachers on mount
    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                setIsLoadingTeachers(true);
                const response = await fetch('/api/v1/teachers');
                if (!response.ok) {
                    throw new Error('Gagal mengambil data guru');
                }
                const data = await response.json();
                setTeachers(data.data || []);
            } catch (err: any) {
                setTeacherError(err.message || 'Terjadi kesalahan saat mengambil data guru');
                console.error('Error fetching teachers:', err);
            } finally {
                setIsLoadingTeachers(false);
            }
        };

        fetchTeachers();
    }, []);

    // Parse CSV file
    const parseCSV = async (file: File): Promise<FingerprintLog[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const lines = text.trim().split('\n');
                    const logs: FingerprintLog[] = [];

                    // Skip header if exists
                    const startIndex = lines[0].toLowerCase().includes('fingerprint') ? 1 : 0;

                    for (let i = startIndex; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        const parts = line.split(',');
                        if (parts.length >= 3) {
                            logs.push({
                                fingerprint_id: parts[0].trim(),
                                scanned_at: parts[1].trim(),
                                raw_type: parts[2].trim().toUpperCase() as 'IN' | 'OUT',
                            });
                        }
                    }

                    resolve(logs);
                } catch (err) {
                    reject(new Error('Format file CSV tidak valid'));
                }
            };
            reader.onerror = () => reject(new Error('Gagal membaca file'));
            reader.readAsText(file);
        });
    };

    // --- Handlers ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleProcess = async () => {
        if (!file) {
            setError('Silakan pilih file terlebih dahulu');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setResult(null);

        try {
            // Parse the uploaded file
            const logs = await parseCSV(file);

            if (logs.length === 0) {
                throw new Error('File tidak mengandung data yang valid');
            }

            const response = await fetch('/api/v1/fingerprint/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    logs: logs,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memproses data');
            }

            const data: ImportResult = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat memproses data');
            console.error('Import error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            present: 'bg-emerald-900/30 text-emerald-400 ring-emerald-900/50',
            late: 'bg-amber-900/30 text-amber-400 ring-amber-900/50',
            absent: 'bg-rose-900/30 text-rose-400 ring-rose-900/50',
        };
        const labels: Record<string, string> = {
            present: 'Hadir',
            late: 'Terlambat',
            absent: 'Alpha',
        };
        return (
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ring-1 ring-inset ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">

            {/* Header */}
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Sinkronisasi Data</h1>
                <p className="text-slate-400 font-medium">Upload file log dari mesin fingerprint (.dat / .xls) untuk sinkronisasi kehadiran.</p>
            </div>

            {/* Teacher List Section */}
            <div className="bg-slate-800 rounded-3xl shadow-lg border border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
                    <Icons.Users className="w-5 h-5 text-purple-400" />
                    Daftar Guru & Fingerprint ID
                </h2>

                {isLoadingTeachers ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-sm text-slate-500 mt-2">Memuat data guru...</p>
                    </div>
                ) : teacherError ? (
                    <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-4">
                        <p className="text-sm text-red-400">{teacherError}</p>
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="bg-amber-900/20 border border-amber-900/50 rounded-xl p-4">
                        <p className="text-sm text-amber-400">Belum ada data guru. Silakan tambahkan guru terlebih dahulu.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-900/50 border-b border-slate-700">
                                <tr>
                                    <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase">NIP</th>
                                    <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase">Nama</th>
                                    <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase">Mata Pelajaran</th>
                                    <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase">Fingerprint ID</th>
                                    <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {teachers.map((teacher) => (
                                    <tr key={teacher.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="py-3 px-4 font-mono text-slate-400">{teacher.nip}</td>
                                        <td className="py-3 px-4 font-bold text-slate-200">{teacher.name}</td>
                                        <td className="py-3 px-4 text-slate-400">{teacher.subject}</td>
                                        <td className="py-3 px-4">
                                            {teacher.fingerprint_id ? (
                                                <span className="font-mono text-purple-400 font-bold">{teacher.fingerprint_id}</span>
                                            ) : (
                                                <span className="text-xs text-slate-600 italic">Belum diset</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${teacher.status === 'active'
                                                ? 'bg-emerald-900/30 text-emerald-400'
                                                : 'bg-slate-900/50 text-slate-500'
                                                }`}>
                                                {teacher.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Explanation Card */}
            <div className="bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border border-purple-700/50 rounded-3xl p-6 text-white shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                        <Icons.Fingerprint className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold mb-1">Panduan Singkat</h3>
                        <p className="text-purple-100 text-sm leading-relaxed mb-4 opacity-90">
                            Pastikan format file yang diupload sesuai dengan standar mesin fingerprint X100. Sistem akan otomatis mencocokkan ID Fingerprint dengan Data Guru.
                        </p>
                        <div className="flex gap-4 text-xs font-bold uppercase tracking-wider text-purple-200">
                            <span className="flex items-center gap-1"><Icons.Check className="w-3 h-3" /> Format .XLS / .DAT support</span>
                            <span className="flex items-center gap-1"><Icons.Check className="w-3 h-3" /> Auto-sync jadwal</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-slate-800 rounded-3xl shadow-lg border border-slate-700 p-6 space-y-6">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Icons.Upload className="w-5 h-5 text-purple-400" />
                    Upload File Log
                </h2>

                {/* Drag & Drop Area */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-12 transition-all text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-900/10 ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-slate-700'
                        }`}
                >
                    {file ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-3 text-emerald-500">
                                <Icons.FileText className="w-12 h-12" />
                            </div>
                            <p className="font-bold text-slate-200">{file.name}</p>
                            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                            <button
                                onClick={() => setFile(null)}
                                className="text-xs text-rose-500 hover:text-rose-400 font-bold mt-2"
                            >
                                Hapus File
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="mx-auto w-16 h-16 bg-purple-900/30 rounded-2xl flex items-center justify-center">
                                <Icons.Upload className="w-8 h-8 text-purple-500" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-300 mb-1">Drag & drop file di sini</p>
                                <p className="text-sm text-slate-500">atau klik untuk pilih file</p>
                            </div>
                            <input
                                type="file"
                                accept=".dat,.xls,.xlsx,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="inline-block px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all cursor-pointer shadow-lg shadow-purple-900/50"
                            >
                                Pilih File
                            </label>
                        </div>
                    )}
                </div>

                {/* Process Button */}
                <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Memproses...
                        </>
                    ) : (
                        <>
                            <Icons.Zap className="w-5 h-5" />
                            Upload & Proses
                        </>
                    )}
                </button>

                {/* Note */}
                <p className="text-xs text-slate-500 text-center">
                    <strong>Catatan:</strong> File yang diupload akan diproses secara otomatis. Pastikan format sesuai dengan standar mesin fingerprint.
                </p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Icons.AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900 mb-1">Proses Gagal</h3>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Section */}
            {result && (
                <div className="bg-slate-800 rounded-3xl shadow-lg border border-emerald-900/30 p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 rounded-2xl">
                            <Icons.CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Proses Berhasil!</h2>
                            <p className="text-sm text-slate-500">Data fingerprint telah diproses dan disinkronkan.</p>
                        </div>
                    </div>

                    {/* Stats */}
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-emerald-900/20 p-4 rounded-xl text-center border border-emerald-900/30">
                            <div className="text-3xl font-bold text-emerald-500">{result.imported}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase mt-1">Imported</div>
                        </div>
                        <div className="bg-amber-900/20 p-4 rounded-xl text-center border border-amber-900/30">
                            <div className="text-3xl font-bold text-amber-500">{result.skipped}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase mt-1">Skipped</div>
                        </div>
                        <div className="bg-blue-900/20 p-4 rounded-xl text-center border border-blue-900/30 col-span-2 md:col-span-1">
                            <div className="text-sm font-bold text-blue-400">
                                {formatDate(result.processed_date_range.start)} - {formatDate(result.processed_date_range.end)}
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase mt-1">Periode</div>
                        </div>
                    </div>

                    {/* Samples Table */}
                    {result.samples && result.samples.length > 0 && (
                        <div>
                            <h3 className="font-bold text-slate-300 mb-3">Contoh Data Terproses:</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-slate-900/50 border-b border-slate-700">
                                        <tr>
                                            <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase">Guru</th>
                                            <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase">Tanggal</th>
                                            <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase">Masuk</th>
                                            <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase">Pulang</th>
                                            <th className="py-3 px-4 font-bold text-xs text-slate-400 uppercase text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {result.samples.map((sample, idx) => (
                                            <tr key={idx} className="hover:bg-slate-700/30">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-200">{sample.teacher_name}</div>
                                                    <div className="text-xs font-mono text-slate-400">{sample.teacher_nip}</div>
                                                </td>
                                                <td className="py-3 px-4 text-slate-400">{formatDate(sample.date)}</td>
                                                <td className="py-3 px-4 font-mono text-slate-400">{sample.check_in || '-'}</td>
                                                <td className="py-3 px-4 font-mono text-slate-400">{sample.check_out || '-'}</td>
                                                <td className="py-3 px-4 text-center">
                                                    {getStatusBadge(sample.status)}
                                                    {sample.late_minutes > 0 && (
                                                        <div className="text-[10px] text-amber-500 font-bold mt-1">+{sample.late_minutes}m</div>
                                                    )}
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
        </div>
    );
}
