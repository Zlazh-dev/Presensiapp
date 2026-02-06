'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/app/components/Icons';
import WorkScheduleManager from './work-schedule-manager';

type SpecialDay = {
    id: number;
    date: string;        // "YYYY-MM-DD"
    name: string;
    type: string;        // "OVERTIME" | "CUSTOM_SCHEDULE" | "HOLIDAY"
    start_time?: string;  // "HH:mm" | null
    end_time?: string;    // "HH:mm" | null
    is_overtime: boolean;
    notes?: string | null;
};

export default function SettingsPage() {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        date: new Date().toISOString().slice(0, 10),
        name: '',
        type: 'CUSTOM_SCHEDULE',
        startTime: '',
        endTime: '',
        isOvertime: false,
        notes: '',
    });

    useEffect(() => {
        fetchSpecialDays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month]);

    const fetchSpecialDays = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/v1/settings/special-days?month=${month}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Gagal memuat data');
            }
            const data = await res.json();
            setSpecialDays(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload = {
                date: formData.date,
                name: formData.name,
                type: formData.type,
                startTime: formData.startTime || null,
                endTime: formData.endTime || null,
                isOvertime: formData.isOvertime,
                notes: formData.notes || null,
            };

            const res = await fetch('/api/v1/settings/special-days', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Gagal menyimpan data');
            }

            setSuccessMessage('Data berhasil disimpan');
            fetchSpecialDays(); // Refresh list

            // Reset form (keep date same for convenience?)
            setFormData({
                date: formData.date,
                name: '',
                type: 'CUSTOM_SCHEDULE',
                startTime: '',
                endTime: '',
                isOvertime: false,
                notes: '',
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus konfigurasi hari ini?')) return;

        try {
            const res = await fetch(`/api/v1/settings/special-days/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Gagal menghapus data');
            }

            setSuccessMessage('Data berhasil dihapus');
            fetchSpecialDays(); // Refresh list
        } catch (err: any) {
            setError(err.message);
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'OVERTIME': return 'Lembur / Tambahan';
            case 'CUSTOM_SCHEDULE': return 'Jadwal Khusus';
            case 'HOLIDAY': return 'Hari Libur';
            default: return type;
        }
    };

    const getTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'OVERTIME': return 'bg-amber-900/30 text-amber-400 border-amber-700/50';
            case 'CUSTOM_SCHEDULE': return 'bg-blue-900/30 text-blue-400 border-blue-700/50';
            case 'HOLIDAY': return 'bg-rose-900/30 text-rose-400 border-rose-700/50';
            default: return 'bg-slate-700 text-slate-300 border-slate-600';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Pengaturan Hari Khusus & Lembur</h1>
                    <p className="text-slate-400">Kelola jadwal khusus, hari libur, dan aturan lembur</p>
                </div>
                <div>
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm [color-scheme:dark]"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-rose-900/20 border border-rose-800 text-rose-300 px-4 py-3 rounded-xl flex items-center space-x-2">
                    <Icons.AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-900/20 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl flex items-center space-x-2">
                    <Icons.CheckCircle className="w-5 h-5" />
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Column */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 sticky top-6">
                        <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
                            <Icons.Plus className="w-5 h-5 text-purple-400" />
                            <span>Tambah / Edit Hari Khusus</span>
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tanggal</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nama Event</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Contoh: Rapat Guru, Pulang Awal"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tipe</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="CUSTOM_SCHEDULE">Jadwal Khusus (Custom Time)</option>
                                    <option value="OVERTIME">Lembur / Extra Hours</option>
                                    <option value="HOLIDAY">Hari Libur / Tidak Masuk</option>
                                </select>
                            </div>

                            {formData.type !== 'HOLIDAY' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Jam Mulai</label>
                                        <input
                                            type="time"
                                            name="startTime"
                                            value={formData.startTime}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Jam Selesai</label>
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        name="isOvertime"
                                        checked={formData.isOvertime}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-purple-600 rounded bg-slate-900 border-slate-600 focus:ring-purple-500 focus:ring-offset-slate-800"
                                    />
                                    <span className="text-sm text-slate-300 group-hover:text-slate-100 font-medium transition-colors">Hitung sebagai lembur</span>
                                </label>
                                <p className="text-xs text-slate-500 mt-1 ml-6">
                                    Jika dicentang, jam di luar jadwal reguler akan dihitung sebagai jam lembur.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Catatan (Opsional)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.CheckCircle className="w-5 h-5" />
                                        <span>Simpan / Update</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Column */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                                <Icons.Calendar className="w-5 h-5 text-slate-400" />
                                <span>Daftar Hari Khusus ({month})</span>
                            </h2>
                            <button
                                onClick={fetchSpecialDays}
                                className="text-slate-400 hover:text-purple-400 transition-colors bg-slate-700/50 p-2 rounded-lg hover:bg-slate-700"
                                title="Refresh data"
                            >
                                <Icons.Refresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading && specialDays.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 animate-pulse">
                                Memuat data...
                            </div>
                        ) : specialDays.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                    <Icons.Calendar className="w-8 h-8 text-slate-500" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-200 mb-1">Belum ada data</h3>
                                <p className="text-slate-400 text-sm">Belum ada hari khusus yang dikonfigurasi untuk bulan ini.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700">
                                {specialDays.map((day) => (
                                    <div key={day.id} className="p-5 hover:bg-slate-700/50 transition-colors group">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-1">
                                                    <span className="font-bold text-slate-100 text-lg">
                                                        {new Date(day.date).getDate()}
                                                    </span>
                                                    <span className="text-slate-400 font-medium text-sm">
                                                        {formatDate(day.date)}
                                                    </span>
                                                </div>

                                                <h3 className="font-bold text-slate-200 mb-2 text-lg">{day.name}</h3>

                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getTypeBadgeClass(day.type)}`}>
                                                        {getTypeLabel(day.type)}
                                                    </span>

                                                    {day.type !== 'HOLIDAY' && day.start_time && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600 flex items-center">
                                                            <Icons.Clock className="w-3 h-3 mr-1 text-slate-400" />
                                                            {day.start_time} - {day.end_time || '?'}
                                                        </span>
                                                    )}

                                                    {day.is_overtime && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-900/30 text-amber-500 border border-amber-800 flex items-center">
                                                            <Icons.Zap className="w-3 h-3 mr-1" />
                                                            Lembur
                                                        </span>
                                                    )}
                                                </div>

                                                {day.notes && (
                                                    <p className="text-sm text-slate-400 italic mt-2 bg-slate-900/50 p-2 rounded border border-slate-800 inline-block">
                                                        "{day.notes}"
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-start">
                                                <button
                                                    onClick={() => handleDelete(day.id)}
                                                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/50"
                                                    title="Hapus"
                                                >
                                                    <Icons.Trash className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="border-t border-slate-700 my-8 pt-8">
                <WorkScheduleManager />
            </div>
        </div>
    );
}
