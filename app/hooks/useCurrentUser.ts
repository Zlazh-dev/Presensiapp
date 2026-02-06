'use client';

import { useState, useEffect } from 'react';

interface User {
    id: number;
    name: string;
    username: string;
    role: 'ADMIN' | 'TEACHER' | 'PRINCIPAL';
}

export function useCurrentUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/v1/auth/me');

                if (response.status === 401) {
                    // Not authenticated
                    setUser(null);
                    setError(null);
                } else if (!response.ok) {
                    throw new Error('Failed to fetch user');
                } else {
                    const data = await response.json();
                    setUser(data.user);
                    setError(null);
                }
            } catch (err) {
                console.error('Error fetching current user:', err);
                setError('Failed to load user');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return { user, loading, error };
}
