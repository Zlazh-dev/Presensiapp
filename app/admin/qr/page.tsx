'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/app/components/Icons';
import { QRCodeSVG } from 'qrcode.react';

interface QrSession {
    id: number;
    type: 'CHECK_IN' | 'CHECK_OUT';
    token: string;
    validFrom: string;
    validUntil: string;
}

export default function AdminQrDisplayPage() {
    const [activeSessions, setActiveSessions] = useState<QrSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isGenerating, setIsGenerating] = useState(false);
    const [scheduleSource, setScheduleSource] = useState<string | null>(null);

    // Modal state
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateType, setGenerateType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
    const [generateValidFrom, setGenerateValidFrom] = useState('');
    const [generateValidUntil, setGenerateValidUntil] = useState('');

    const fetchActiveSessions = async (retryOnEmpty = false) => {
        try {
            const response = await fetch('/api/v1/attendance/qr/active');
            if (response.ok) {
                const data = await response.json();
                const sessions = data.data || [];
                setActiveSessions(sessions);
                setLastUpdated(new Date());

                // If empty and retryOnEmpty is true (initial load), try auto-generate
                if (sessions.length === 0 && retryOnEmpty) {
                    await autoGenerateSessions();
                }
            }
        } catch (error) {
            console.error('Failed to fetch QR sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const autoGenerateSessions = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/v1/attendance/qr/auto-generate', {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                // Data format: { date, schedule: { name, ... }, sessions: [...] }
                setActiveSessions(data.sessions || []);
                setScheduleSource(data.schedule?.name || null);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to auto-generate sessions:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        // Initial fetch with auto-generate retry
        fetchActiveSessions(true);

        // Auto refresh every 30 seconds (without auto-generate retry)
        const interval = setInterval(() => fetchActiveSessions(false), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const payload: any = {
                type: generateType,
            };

            if (generateValidFrom) payload.validFrom = new Date(generateValidFrom).toISOString();
            if (generateValidUntil) payload.validUntil = new Date(generateValidUntil).toISOString();

            const response = await fetch('/api/v1/attendance/qr/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setShowGenerateModal(false);
                fetchActiveSessions(false);
                // Reset form
                setGenerateValidFrom('');
                setGenerateValidUntil('');
            } else {
                alert('Gagal generate QR');
            }
        } catch (error) {
            console.error('Error generating QR:', error);
            alert('Terjadi kesalahan');
        } finally {
            setIsGenerating(false);
        }
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    };

    const getSessionByType = (type: 'CHECK_IN' | 'CHECK_OUT') => {
        return activeSessions.find(s => s.type === type);
    };

    return (
        <div className="min-h-screen p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Display QR Presensi</h1>
                        <div className="flex flex-col mt-1">
                            <p className="text-slate-400 font-medium">
                                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            {scheduleSource && (
                                <p className="text-sm font-medium text-emerald-400 mt-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-500">
                                    <Icons.CheckCircle className="w-3.5 h-3.5" />
                                    <span>Jadwal Aktif: {scheduleSource}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-mono hidden md:inline-block">
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                        <button
                            onClick={() => fetchActiveSessions(false)}
                            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-purple-600 transition-colors shadow-sm"
                            title="Refresh Data"
                        >
                            <Icons.Refresh className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 hover:shadow-purple-200 transition-all flex items-center gap-2"
                        >
                            <Icons.Plus className="w-5 h-5" />
                            Generate QR
                        </button>
                    </div>
                </div>

                {/* QR Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <QrCard
                        title="QR Absen Masuk"
                        color="emerald"
                        session={getSessionByType('CHECK_IN')}
                        formatTime={formatTime}
                        emptyMessage="Belum ada QR Masuk aktif hari ini"
                    />
                    <QrCard
                        title="QR Absen Pulang"
                        color="amber"
                        session={getSessionByType('CHECK_OUT')}
                        formatTime={formatTime}
                        emptyMessage="Belum ada QR Pulang aktif hari ini"
                    />
                </div>
            </div>

            {/* Generate Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-100">Generate QR Baru</h3>
                            <button
                                onClick={() => setShowGenerateModal(false)}
                                className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <Icons.X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Tipe Presensi</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setGenerateType('CHECK_IN')}
                                        className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${generateType === 'CHECK_IN'
                                            ? 'border-emerald-500 bg-emerald-900/30 text-emerald-400'
                                            : 'border-slate-700 text-slate-400 hover:border-emerald-900/50 hover:text-slate-300'
                                            }`}
                                    >
                                        Absen Masuk
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGenerateType('CHECK_OUT')}
                                        className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${generateType === 'CHECK_OUT'
                                            ? 'border-amber-500 bg-amber-900/30 text-amber-400'
                                            : 'border-slate-700 text-slate-400 hover:border-amber-900/50 hover:text-slate-300'
                                            }`}
                                    >
                                        Absen Pulang
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Waktu Mulai (Opsional)</label>
                                <input
                                    type="datetime-local"
                                    value={generateValidFrom}
                                    onChange={(e) => setGenerateValidFrom(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium text-slate-100 [color-scheme:dark]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Waktu Selesai (Opsional)</label>
                                <input
                                    type="datetime-local"
                                    value={generateValidUntil}
                                    onChange={(e) => setGenerateValidUntil(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium text-slate-100 [color-scheme:dark]"
                                />
                                <p className="text-xs text-slate-500 mt-2">Default: Berlaku 2 jam dari sekarang</p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-900/30 border-t border-slate-700 flex gap-3">
                            <button
                                onClick={() => setShowGenerateModal(false)}
                                className="flex-1 py-3 px-4 bg-slate-900 border border-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-800 hover:text-white transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="flex-1 py-3 px-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg hover:shadow-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <Icons.Zap className="w-5 h-5" />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function QrCard({ title, color, session, formatTime, emptyMessage }: {
    title: string,
    color: 'emerald' | 'amber',
    session?: QrSession,
    formatTime: (iso: string) => string,
    emptyMessage: string
}) {
    const isEmerald = color === 'emerald';
    const bgClass = isEmerald ? 'bg-emerald-50' : 'bg-amber-50';
    const borderClass = isEmerald ? 'border-emerald-100' : 'border-amber-100';
    const textClass = isEmerald ? 'text-emerald-800' : 'text-amber-800';
    const ringClass = isEmerald ? 'ring-emerald-500/20' : 'ring-amber-500/20';
    const badgeClass = isEmerald ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';

    return (
        <div className={`relative overflow-hidden bg-slate-800 rounded-3xl shadow-xl border-2 ${session ? 'border-transparent' : 'border-slate-700 border-dashed'} flex flex-col items-center justify-center p-8 md:p-12 min-h-[500px] transition-all`}>
            {session ? (
                <>
                    <div className={`absolute top-0 right-0 left-0 h-2 ${isEmerald ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                    <div className="flex flex-col items-center space-y-6 w-full max-w-sm mx-auto text-center z-10">
                        <div className="space-y-2">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${badgeClass}`}>
                                AKTIF
                            </span>
                            <h2 className="text-3xl font-extrabold text-slate-100">{title}</h2>
                        </div>

                        <div className="p-6 bg-white rounded-3xl shadow-2xl ring-4 ring-offset-4 ring-offset-slate-800 ring-slate-700">
                            <QRCodeSVG
                                value={session.token}
                                size={256}
                                level="H"
                                includeMargin={true}
                                className="w-full h-auto"
                            />
                        </div>

                        <div className={`w-full py-4 px-6 rounded-2xl ${bgClass} border ${borderClass}`}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Icons.Clock className={`w-4 h-4 ${textClass}`} />
                                <span className={`text-xs font-bold uppercase tracking-wide ${textClass} opacity-70`}>Berlaku Pukul</span>
                            </div>
                            <p className={`text-2xl font-black ${textClass}`}>
                                {formatTime(session.validFrom)} - {formatTime(session.validUntil)}
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center space-y-4 opacity-50">
                    <div className="w-24 h-24 bg-slate-700/50 rounded-3xl mx-auto flex items-center justify-center">
                        <Icons.Maximize className="w-10 h-10 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-500">{emptyMessage}</h3>
                </div>
            )}
        </div>
    );
}
