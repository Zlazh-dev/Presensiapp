'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/app/components/Icons';

// --- Types ---
interface Teacher {
    id: number;
    nip: string;
    name: string;
    subject: string;
    fingerprint_id: string;
    status: 'active' | 'inactive';
}

interface FormData {
    nip: string;
    name: string;
    subject: string;
    fingerprint_id: string;
    status: 'active' | 'inactive';
}

export default function AdminTeachersPage() {
    // State Management
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [formData, setFormData] = useState<FormData>({
        nip: '',
        name: '',
        subject: '',
        fingerprint_id: '',
        status: 'active',
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch Teachers from API
    const fetchTeachers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/v1/teachers');

            if (!response.ok) {
                throw new Error('Gagal mengambil data guru');
            }

            const result = await response.json();
            setTeachers(result.data || []);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat memuat data');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        fetchTeachers();
    }, []);

    // Filter teachers client-side
    const filteredTeachers = teachers.filter(teacher => {
        const matchesSearch =
            teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.nip.includes(searchTerm) ||
            teacher.subject.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || teacher.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    // Open modal for new teacher
    const handleAddNew = () => {
        setEditingTeacher(null);
        setFormData({
            nip: '',
            name: '',
            subject: '',
            fingerprint_id: '',
            status: 'active',
        });
        setIsModalOpen(true);
    };

    // Open modal for editing
    const handleEdit = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setFormData({
            nip: teacher.nip,
            name: teacher.name,
            subject: teacher.subject,
            fingerprint_id: teacher.fingerprint_id || '',
            status: teacher.status,
        });
        setIsModalOpen(true);
    };

    // Handle form submission (Create or Update)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = editingTeacher
                ? `/api/v1/teachers/${editingTeacher.id}`
                : '/api/v1/teachers';

            const method = editingTeacher ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menyimpan data');
            }

            // Success - refresh data and close modal
            await fetchTeachers();
            setIsModalOpen(false);
            alert(editingTeacher ? 'Data guru berhasil diperbarui' : 'Guru baru berhasil ditambahkan');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
            console.error('Submit error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async (teacher: Teacher) => {
        const confirmed = confirm(`Apakah Anda yakin ingin menghapus guru ${teacher.name}?`);
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/v1/teachers/${teacher.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menghapus data');
            }

            // Success - refresh data
            await fetchTeachers();
            alert('Guru berhasil dihapus');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
            console.error('Delete error:', err);
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                        <p className="text-slate-400 font-medium">Memuat data guru...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-6 text-center">
                    <div className="text-red-400 font-bold text-lg mb-2">⚠️ Terjadi Kesalahan</div>
                    <p className="text-red-300 mb-4">{error}</p>
                    <button
                        onClick={fetchTeachers}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition-all"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Data Guru</h1>
                    <p className="text-slate-400 font-medium">Kelola data guru dan ID fingerprint.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200 transition-all active:scale-95"
                >
                    <Icons.Plus className="w-5 h-5" /> Tambah Guru
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-700 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Cari nama, NIP, atau mata pelajaran..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-slate-100 placeholder-slate-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer font-medium text-slate-300 min-w-[150px]"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                </select>
            </div>

            {/* Teachers Table */}
            <div className="bg-slate-800 rounded-3xl shadow-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900/50 border-b border-slate-700">
                            <tr>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Identitas Guru</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Mata Pelajaran</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Fingerprint ID</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredTeachers.map((teacher) => (
                                <tr key={teacher.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="font-bold text-slate-200">{teacher.name}</div>
                                        <div className="text-sm font-mono text-slate-500">{teacher.nip}</div>
                                    </td>
                                    <td className="py-4 px-6 text-sm font-medium text-slate-400">
                                        {teacher.subject}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="bg-slate-900 text-slate-400 px-3 py-1 rounded-lg font-mono text-sm font-bold border border-slate-700">
                                            {teacher.fingerprint_id || '-'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ring-1 ring-inset ${teacher.status === 'active'
                                            ? 'bg-emerald-900/30 text-emerald-400 ring-emerald-900/50'
                                            : 'bg-slate-900/50 text-slate-500 ring-slate-700'
                                            }`}>
                                            {teacher.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(teacher)}
                                                className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Icons.Edit />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(teacher)}
                                                className="p-2 text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <Icons.Trash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTeachers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                                        Tidak ada data guru yang ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-700">
                        <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-100">
                                {editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-200"
                                disabled={submitting}
                            >
                                <Icons.X />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-100 placeholder-slate-500"
                                        placeholder="Contoh: Budi Santoso"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">NIP</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-100 placeholder-slate-500"
                                        placeholder="198xxxxxx"
                                        value={formData.nip}
                                        onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Mata Pelajaran</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-100 placeholder-slate-500"
                                    placeholder="Contoh: Matematika"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    disabled={submitting}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Fingerprint ID</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-100 placeholder-slate-500"
                                        placeholder="FP-xxx"
                                        value={formData.fingerprint_id}
                                        onChange={(e) => setFormData({ ...formData, fingerprint_id: e.target.value })}
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-100"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                        disabled={submitting}
                                    >
                                        <option value="active">Aktif</option>
                                        <option value="inactive">Nonaktif</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors"
                                    disabled={submitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
