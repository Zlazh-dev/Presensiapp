'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import { useEffect } from 'react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { user, loading: userLoading } = useCurrentUser();

    // Redirect if already logged in
    useEffect(() => {
        if (!userLoading && user) {
            if (user.role === 'TEACHER') {
                router.push('/attendance/qr');
            } else {
                router.push('/admin');
            }
        }
    }, [user, userLoading, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Redirect based on role
            if (data.user.role === 'TEACHER') {
                router.push('/attendance/qr');
            } else {
                // ADMIN or PRINCIPAL
                router.push('/admin');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    if (userLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }

    return (

        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-slate-100 mb-2">
                            Presensi Guru
                        </h1>
                        <p className="text-slate-400">Silakan login untuk melanjutkan</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-900/30 border border-rose-900/50 rounded-lg text-rose-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-slate-300 mb-2"
                            >
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 placeholder-slate-500"
                                placeholder="Masukkan username"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-slate-300 mb-2"
                            >
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 placeholder-slate-500"
                                placeholder="Masukkan password"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Memproses...' : 'Masuk'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
