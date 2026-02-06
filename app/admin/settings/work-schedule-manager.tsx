'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/app/components/Icons';

type WorkSchedule = {
    id: number;
    name: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    lateToleranceMinutes: number;
    workingDays: string[];
    isDefault: boolean;
    _count: { assignments: number };
};

const DAYS_MAP: Record<string, string> = {
    'Mon': 'Senin',
    'Tue': 'Selasa',
    'Wed': 'Rabu',
    'Thu': 'Kamis',
    'Fri': 'Jumat',
    'Sat': 'Sabtu',
    'Sun': 'Minggu'
};

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WorkScheduleManager() {
    const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        startTime: '07:00',
        endTime: '15:00',
        lateToleranceMinutes: 15,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        isDefault: false
    });

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/settings/work-schedules');
            if (!res.ok) throw new Error('Gagal memuat jadwal kerja');
            const result = await res.json();
            setSchedules(result.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            if (name === 'isDefault') {
                setFormData(prev => ({ ...prev, isDefault: checked }));
            } else if (name === 'day') {
                // Handle working days array
                const day = value;
                setFormData(prev => {
                    const days = checked
                        ? [...prev.workingDays, day]
                        : prev.workingDays.filter(d => d !== day);

                    // Sort days to keep order
                    const sortedDays = ALL_DAYS.filter(d => days.includes(d));
                    return { ...prev, workingDays: sortedDays };
                });
            }
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleEdit = (schedule: WorkSchedule) => {
        setEditingId(schedule.id);
        setFormData({
            name: schedule.name,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            lateToleranceMinutes: schedule.lateToleranceMinutes,
            workingDays: schedule.workingDays,
            isDefault: schedule.isDefault
        });
        setError(null);
        setSuccessMessage(null);

        // Scroll to form (top)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            name: '',
            startTime: '07:00',
            endTime: '15:00',
            lateToleranceMinutes: 15,
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            isDefault: false
        });
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Frontend validation
        if (!formData.name.trim()) return setError('Nama jadwal wajib diisi');
        if (formData.workingDays.length === 0) return setError('Pilih minimal satu hari kerja');

        const [startH, startM] = formData.startTime.split(':').map(Number);
        const [endH, endM] = formData.endTime.split(':').map(Number);
        if ((endH * 60 + endM) <= (startH * 60 + startM)) {
            return setError('Jam selesai harus setelah jam mulai');
        }

        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const url = editingId
                ? `/api/v1/settings/work-schedules/${editingId}`
                : '/api/v1/settings/work-schedules';

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Gagal menyimpan jadwal');
            }

            setSuccessMessage(editingId ? 'Jadwal berhasil diperbarui' : 'Jadwal berhasil dibuat');
            fetchSchedules();
            if (!editingId) {
                // Reset form only on create
                setFormData({
                    name: '',
                    startTime: '07:00',
                    endTime: '15:00',
                    lateToleranceMinutes: 15,
                    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    isDefault: false
                });
            } else {
                // If editing, exit edit mode
                setEditingId(null);
                setFormData({
                    name: '',
                    startTime: '07:00',
                    endTime: '15:00',
                    lateToleranceMinutes: 15,
                    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    isDefault: false
                });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Hapus jadwal "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;

        try {
            const res = await fetch(`/api/v1/settings/work-schedules/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Gagal menghapus jadwal');
            }

            setSuccessMessage('Jadwal berhasil dihapus');
            fetchSchedules();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Icons.Clock className="w-6 h-6 text-purple-400" />
                        Pengaturan Jadwal Reguler
                    </h2>
                    <p className="text-slate-400">Kelola template jam kerja reguler dan penugasan</p>
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
                        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
                            {editingId ? (
                                <Icons.Edit className="w-5 h-5 text-purple-400" />
                            ) : (
                                <Icons.Plus className="w-5 h-5 text-purple-400" />
                            )}
                            <span>{editingId ? 'Edit Jadwal' : 'Buat Jadwal Baru'}</span>
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nama Jadwal</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Contoh: Reguler, Puasa, Shift 1"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Jam Masuk</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Jam Pulang</label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Toleransi Terlambat (Menit)</label>
                                <input
                                    type="number"
                                    name="lateToleranceMinutes"
                                    value={formData.lateToleranceMinutes}
                                    onChange={handleInputChange}
                                    min="0"
                                    required
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Hari Kerja</label>
                                <div className="grid grid-cols-2 gap-y-2">
                                    {ALL_DAYS.map(day => (
                                        <label key={day} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="day"
                                                value={day}
                                                checked={formData.workingDays.includes(day)}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 text-purple-600 rounded bg-slate-900 border-slate-600 focus:ring-purple-500"
                                            />
                                            <span className="text-sm text-slate-300">{DAYS_MAP[day]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-700 mt-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="isDefault"
                                        checked={formData.isDefault}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-purple-600 rounded bg-slate-900 border-slate-600 focus:ring-purple-500"
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-slate-200 block">Jadikan Jadwal Default</span>
                                        <span className="text-xs text-slate-500 block">Akan menggantikan default sebelumnya</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-lg transition-colors border border-slate-600"
                                    >
                                        Batal
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30"
                                >
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Icons.CheckCircle className="w-5 h-5" />
                                    )}
                                    <span>{editingId ? 'Update' : 'Simpan'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* List Column */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-lg font-bold text-slate-100">Daftar Jadwal</h3>
                            <button
                                onClick={fetchSchedules}
                                className="text-slate-400 hover:text-purple-400 transition-colors bg-slate-700/50 p-2 rounded-lg hover:bg-slate-700"
                                title="Refresh"
                            >
                                <Icons.Refresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading && schedules.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 animate-pulse">Memuat jadwal...</div>
                        ) : schedules.length === 0 ? (
                            <div className="p-12 text-center">
                                <Icons.Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-200">Belum ada jadwal</h3>
                                <p className="text-slate-500 mt-1">Silakan buat jadwal reguler baru.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700">
                                {schedules.map((schedule) => (
                                    <div key={schedule.id} className="p-5 hover:bg-slate-700/30 transition-colors group">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-bold text-slate-100 text-lg">{schedule.name}</h4>
                                                    {schedule.isDefault && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-900/40 text-purple-300 border border-purple-700/50">
                                                            DEFAULT
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <Icons.Clock className="w-4 h-4 text-slate-500" />
                                                        <span className="text-slate-200 font-medium">
                                                            {schedule.startTime} - {schedule.endTime}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5" title="Toleransi Terlambat">
                                                        <Icons.AlertCircle className="w-4 h-4 text-slate-500" />
                                                        <span>
                                                            Toleransi: <span className="text-slate-200">{schedule.lateToleranceMinutes} mnt</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mb-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {ALL_DAYS.map(day => (
                                                            <span
                                                                key={day}
                                                                className={`px-2 py-0.5 rounded text-xs border ${schedule.workingDays.includes(day)
                                                                        ? 'bg-slate-700 text-slate-200 border-slate-600 font-medium'
                                                                        : 'bg-slate-800/50 text-slate-600 border-transparent line-through'
                                                                    }`}
                                                            >
                                                                {DAYS_MAP[day].substring(0, 3)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {schedule._count.assignments > 0 ? (
                                                    <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-900/30 px-2 py-1 rounded w-fit">
                                                        <Icons.Calendar className="w-3 h-3" />
                                                        Digunakan di {schedule._count.assignments} periode aktif
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-600 italic">Belum digunakan</div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 self-start sm:self-center">
                                                <button
                                                    onClick={() => handleEdit(schedule)}
                                                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-lg transition-colors border border-transparent hover:border-blue-900/50"
                                                    title="Edit"
                                                >
                                                    <Icons.Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(schedule.id, schedule.name)}
                                                    disabled={schedule._count.assignments > 0}
                                                    className={`p-2 rounded-lg transition-colors border border-transparent ${schedule._count.assignments > 0
                                                            ? 'text-slate-600 cursor-not-allowed'
                                                            : 'text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 hover:border-rose-900/50'
                                                        }`}
                                                    title={schedule._count.assignments > 0 ? "Tidak bisa hapus (sedang digunakan)" : "Hapus"}
                                                >
                                                    <Icons.Trash className="w-4 h-4" />
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
        </div>
    );
}
