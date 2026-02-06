import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const response = NextResponse.json({
            message: 'Logged out successfully',
        });

        // Clear auth cookie
        response.cookies.set('auth_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('POST /api/v1/auth/logout error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
