import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper: Get date at midnight (00:00:00)
function getDateAtMidnight(dateStr?: string): Date {
    if (dateStr) {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

// GET /api/v1/attendance/qr/active - Get active QR sessions for display
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        // Get date (default to today)
        const date = getDateAtMidnight(dateParam || undefined);
        const now = new Date();

        // Find active QR sessions for this date
        const qrSessions = await prisma.qrSession.findMany({
            where: {
                date,
                isActive: true,
                validUntil: {
                    gte: now, // Only return sessions that haven't expired
                },
            },
            orderBy: {
                type: 'asc', // CHECK_IN first, then CHECK_OUT
            },
        });

        // Transform response
        const data = qrSessions.map((session: (typeof qrSessions)[number]) => ({
            id: session.id,
            type: session.type,
            token: session.token,
            validFrom: session.validFrom.toISOString(),
            validUntil: session.validUntil.toISOString(),
        }));

        return NextResponse.json({
            date: date.toISOString().split('T')[0],
            data,
        });

    } catch (error) {
        console.error('GET /api/v1/attendance/qr/active error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
