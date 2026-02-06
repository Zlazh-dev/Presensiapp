import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signAuthToken } from '@/lib/auth';

interface LoginRequest {
    username: string;
    password: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: LoginRequest = await request.json();

        if (!body.username || !body.password) {
            return NextResponse.json(
                { message: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Find user by username
        const user = await prisma.user.findUnique({
            where: { username: body.username },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(body.password, user.passwordHash);

        if (!isValidPassword) {
            return NextResponse.json(
                { message: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Create JWT token
        const token = await signAuthToken({
            userId: user.id,
            role: user.role,
        });

        // Create response with user data
        const response = NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
            },
        });

        // Set HTTP-only cookie
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 hour
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('POST /api/v1/auth/login error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
