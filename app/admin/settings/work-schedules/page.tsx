'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/app/components/Icons';

// --- Types ---
type WorkScheduleTemplate = {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    lateToleranceMinutes: number;
    workingDays: string[];
    isDefault: boolean;
};

type WorkScheduleAssignment = {
    id: number;
    workScheduleId: number;
    workScheduleName: string;
    startDate: string;
    endDate: string;
    createdAt: string;
};

export default function WorkSchedulesSettingsPage() {
    // --- State: Templates ---
    const [templates, setTemplates] = useState<WorkScheduleTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [errorTemplates, setErrorTemplates] = useState<string | null>(null);

    // --- State: Template Modal ---
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<WorkScheduleTemplate | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // --- State: Assignments ---
    const [assignments, setAssignments] = useState<WorkScheduleAssignment[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(true);
    const [errorAssignments, setErrorAssignments] = useState<string | null>(null);

    // --- State: Assignment Filter & Form ---
    const [filterFrom, setFilterFrom] = useState<string>("");
    const [filterTo, setFilterTo] = useState<string>("");

    // Simple assignment form state (inline)
    const [newAssignTemplateId, setNewAssignTemplateId] = useState<number | ''>('');
    const [newAssignStart, setNewAssignStart] = useState('');
    const [newAssignEnd, setNewAssignEnd] = useState('');
    const [assignSubmitting, setAssignSubmitting] = useState(false);

    // --- Fetch Data ---
    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        setErrorTemplates(null);
        try {
            const res = await fetch('/api/v1/settings/work-schedules');
            if (!res.ok) throw new Error('Gagal memuat template jadwal.');
            const json = await res.json();
            setTemplates(json.data || []);
        } catch (err: any) {
            setErrorTemplates(err.message);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const fetchAssignments = async () => {
        setLoadingAssignments(true);
        setErrorAssignments(null);
        try {
            let url = '/api/v1/settings/work-schedule-assignments';
            const params = new URLSearchParams();
            if (filterFrom) params.append('from', filterFrom);
            if (filterTo) params.append('to', filterTo);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('Gagal memuat jadwal kalender.');
            const json = await res.json();
            setAssignments(json.data || []);
        } catch (err: any) {
            setErrorAssignments(err.message);
        } finally {
            setLoadingAssignments(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
        fetchAssignments();
    }, []);

    // --- Template Handlers ---
    const handleDeleteTemplate = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus template ini?')) return;
        try {
            const res = await fetch(`/api/v1/settings/work-schedules/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Gagal menghapus template.');
            }
            fetchTemplates();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSaveTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);

        const workingDays = formData.getAll('workingDays') as string[];

        const payload = {
            name: formData.get('name'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            lateToleranceMinutes: Number(formData.get('lateToleranceMinutes')),
            workingDays: workingDays,
            isDefault: formData.get('isDefault') === 'on',
        };

        try {
            const url = editingTemplate
                ? `/api/v1/settings/work-schedules/${editingTemplate.id}`
                : '/api/v1/settings/work-schedules';
            const method = editingTemplate ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Gagal menyimpan template.');
            }

            setIsTemplateModalOpen(false);
            setEditingTemplate(null);
            fetchTemplates();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    // --- Assignment Handlers ---
    const handleAddAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAssignTemplateId || !newAssignStart || !newAssignEnd) {
            alert('Mohon lengkapi form assignment.');
            return;
        }

        setAssignSubmitting(true);
        try {
            const res = await fetch('/api/v1/settings/work-schedule-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workScheduleId: Number(newAssignTemplateId),
                    startDate: newAssignStart,
                    endDate: newAssignEnd
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Gagal membuat assignment.');
            }

            // Checks for warnings if handled by backend, else just success
            const result = await res.json();
            if (result.warning) alert(`Perhatian: ${result.warning}`);

            setNewAssignTemplateId('');
            setNewAssignStart('');
            setNewAssignEnd('');
            fetchAssignments();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setAssignSubmitting(false);
        }
    };

    const handleDeleteAssignment = async (id: number) => {
        if (!confirm('Hapus assignment jadwal ini?')) return;
        try {
            const res = await fetch(`/api/v1/settings/work-schedule-assignments/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus assignment.');
            fetchAssignments();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pengaturan Jadwal Kerja</h1>
                <p className="text-slate-500 font-medium">Kelola template jam kerja dan penugasan jadwal khusus.</p>
            </div>

            {/* --- SECTION A: TEMPLATES --- */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Icons.Settings className="w-5 h-5 text-purple-600" /> Template Jadwal
                    </h2>
                    <button
                        onClick={() => { setEditingTemplate(null); setIsTemplateModalOpen(true); }}
                        className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg shadow hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <Icons.Plus className="w-4 h-4" /> Tambah Template
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-lg border border-purple-50 overflow-hidden">
                    {loadingTemplates ? (
                        <div className="p-8 text-center text-slate-500">Memuat template...</div>
                    ) : errorTemplates ? (
                        <div className="p-8 text-center">
                            <p className="text-red-500 mb-2">{errorTemplates}</p>
                            <button onClick={fetchTemplates} className="text-purple-600 hover:underline">Coba Lagi</button>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">Belum ada template jadwal.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-purple-50/50 border-b border-purple-100">
                                    <tr>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Nama Template</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase text-center">Jam Kerja</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase text-center">Toleransi</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Hari Kerja</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {templates.map(t => (
                                        <tr key={t.id} className="hover:bg-purple-50/30 transition-colors">
                                            <td className="py-4 px-6 font-bold text-slate-800">{t.name}</td>
                                            <td className="py-4 px-6 text-center text-slate-600 font-mono text-sm">
                                                {t.startTime} - {t.endTime}
                                            </td>
                                            <td className="py-4 px-6 text-center text-slate-600">
                                                {t.lateToleranceMinutes} m
                                            </td>
                                            <td className="py-4 px-6 text-slate-500 text-sm">
                                                {t.workingDays.join(', ')}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {t.isDefault ? (
                                                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md">
                                                        Default
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-[10px] font-bold uppercase">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right space-x-2">
                                                <button
                                                    onClick={() => { setEditingTemplate(t); setIsTemplateModalOpen(true); }}
                                                    className="text-amber-600 hover:text-amber-700 font-bold text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(t.id)}
                                                    className="text-rose-600 hover:text-rose-700 font-bold text-sm"
                                                >
                                                    Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* --- SECTION B: ASSIGNMENTS --- */}
            <section className="space-y-6 pt-6 border-t border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Icons.Calendar className="w-5 h-5 text-purple-600" /> Penugasan Jadwal (Kalender)
                    </h2>

                    {/* Filter */}
                    <form
                        onSubmit={(e) => { e.preventDefault(); fetchAssignments(); }}
                        className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm"
                    >
                        <input
                            type="date"
                            className="text-xs px-2 py-1.5 rounded-lg border-none focus:ring-0 text-slate-600"
                            value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                        />
                        <span className="text-slate-300">-</span>
                        <input
                            type="date"
                            className="text-xs px-2 py-1.5 rounded-lg border-none focus:ring-0 text-slate-600"
                            value={filterTo} onChange={e => setFilterTo(e.target.value)}
                        />
                        <button type="submit" className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">
                            <Icons.Search className="w-4 h-4" />
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Assignment (Mobile: Top, Desktop: Left/Sidebar Style) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-purple-50 sticky top-4">
                            <h3 className="font-bold text-slate-800 mb-4">Buat Jadwal Khusus</h3>
                            <form onSubmit={handleAddAssignment} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Pilih Template</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        value={newAssignTemplateId}
                                        onChange={e => setNewAssignTemplateId(Number(e.target.value))}
                                        required
                                    >
                                        <option value="">-- Pilih Template --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Mulai</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            value={newAssignStart}
                                            onChange={e => setNewAssignStart(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Selesai</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            value={newAssignEnd}
                                            onChange={e => setNewAssignEnd(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={assignSubmitting}
                                    className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-md disabled:opacity-50 text-sm"
                                >
                                    {assignSubmitting ? 'Menyimpan...' : 'Terapkan assignment'}
                                </button>
                                <p className="text-[10px] text-slate-400 leading-tight">
                                    *Jadwal default akan digunakan secara otomatis jika tidak ada assignment pada tanggal tersebut.
                                </p>
                            </form>
                        </div>
                    </div>

                    {/* Assignments List */}
                    <div className="lg:col-span-2 space-y-4">
                        {loadingAssignments ? (
                            <div className="text-center py-8 text-slate-500">Memuat assignment...</div>
                        ) : errorAssignments ? (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center border border-red-100">
                                {errorAssignments}
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100 border-dashed">
                                <Icons.Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 font-medium text-sm">Belum ada jadwal khusus di filter ini.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {assignments.map(a => (
                                    <div key={a.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-purple-200 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                                <Icons.Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{a.workScheduleName}</div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    {new Date(a.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    {' - '}
                                                    {new Date(a.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAssignment(a.id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Hapus Assignment"
                                        >
                                            <Icons.X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* --- MODAL TEMPLATE --- */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingTemplate ? 'Edit Template' : 'Buat Template Baru'}
                            </h3>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <Icons.X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTemplate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Nama Template</label>
                                <input
                                    name="name"
                                    type="text"
                                    defaultValue={editingTemplate?.name}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Contoh: Jadwal Normal, Jadwal Puasa"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Jam Masuk</label>
                                    <input
                                        name="startTime"
                                        type="time"
                                        defaultValue={editingTemplate?.startTime || "07:00"}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Jam Pulang</label>
                                    <input
                                        name="endTime"
                                        type="time"
                                        defaultValue={editingTemplate?.endTime || "15:00"}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Toleransi (Menit)</label>
                                    <input
                                        name="lateToleranceMinutes"
                                        type="number"
                                        min="0"
                                        defaultValue={editingTemplate?.lateToleranceMinutes || 10}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="isDefault"
                                            defaultChecked={editingTemplate?.isDefault}
                                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Set sebagai Default?</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Hari Kerja</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <label key={day} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100">
                                            <input
                                                type="checkbox"
                                                name="workingDays"
                                                value={day}
                                                defaultChecked={editingTemplate ? editingTemplate.workingDays.includes(day) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day)}
                                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                            />
                                            <span className="text-xs font-bold text-slate-600">{day}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsTemplateModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-md disabled:opacity-50"
                                >
                                    {formLoading ? 'Menyimpan...' : 'Simpan Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
