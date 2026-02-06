import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { QrSessionType } from '@prisma/client';
import crypto from 'crypto';

interface GenerateQrRequest {
    type: 'CHECK_IN' | 'CHECK_OUT';
    date?: string; // YYYY-MM-DD format
    validFrom?: string; // ISO datetime
    validUntil?: string; // ISO datetime
}

// Helper: Generate random token
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex'); // 64 characters
}

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

// POST /api/v1/attendance/qr/generate - Generate QR token for attendance
export async function POST(request: NextRequest) {
    try {
        const body: GenerateQrRequest = await request.json();

        // Validate type
        if (!body.type || !['CHECK_IN', 'CHECK_OUT'].includes(body.type)) {
            return NextResponse.json(
                { message: 'Invalid type. Must be CHECK_IN or CHECK_OUT' },
                { status: 400 }
            );
        }

        // Parse dates
        const date = getDateAtMidnight(body.date);
        const now = new Date();

        // Default time range: now to now+2hours if not provided
        const validFrom = body.validFrom ? new Date(body.validFrom) : now;
        const validUntil = body.validUntil ? new Date(body.validUntil) : new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // Validate time range
        if (validUntil <= validFrom) {
            return NextResponse.json(
                { message: 'validUntil must be after validFrom' },
                { status: 400 }
            );
        }

        // Deactivate existing active sessions for this date+type
        await prisma.qrSession.updateMany({
            where: {
                date,
                type: body.type as QrSessionType,
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        // Generate new token
        const token = generateToken();

        // Create new QR session
        const qrSession = await prisma.qrSession.create({
            data: {
                type: body.type as QrSessionType,
                token,
                date,
                validFrom,
                validUntil,
                isActive: true,
            },
        });

        // Return response
        return NextResponse.json({
            id: qrSession.id,
            type: qrSession.type,
            token: qrSession.token,
            date: qrSession.date.toISOString().split('T')[0],
            validFrom: qrSession.validFrom.toISOString(),
            validUntil: qrSession.validUntil.toISOString(),
            isActive: qrSession.isActive,
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/v1/attendance/qr/generate error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
