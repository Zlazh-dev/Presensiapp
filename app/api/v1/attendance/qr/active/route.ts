import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper: Parse date parameter and return Date at midnight, or null if invalid
function parseDateParam(dateStr?: string | null): Date | null {
    // No date provided or "today" - use current date
    if (!dateStr || dateStr === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }

    // Try to parse as YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
        return null; // Invalid format
    }

    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) {
        return null; // Invalid date
    }

    return date;
}

// GET /api/v1/attendance/qr/active - Get active QR sessions for display
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        // Parse and validate date
        const date = parseDateParam(dateParam);
        if (!date) {
            return NextResponse.json(
                { message: 'Invalid date format. Use YYYY-MM-DD or "today".' },
                { status: 400 }
            );
        }

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
