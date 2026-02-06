import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { QrSessionType } from '@prisma/client';
import crypto from 'crypto';

// Helper: Generate random token
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Helper: Add/subtract minutes from a time string (HH:mm)
function adjustTime(timeStr: string, minutesOffset: number, baseDate: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    result.setMinutes(result.getMinutes() + minutesOffset);
    return result;
}

// POST /api/v1/attendance/qr/auto-generate
//   Automatically generate CHECKIN and CHECKOUT QR sessions based on effective work schedule
export async function POST(request: NextRequest) {
    try {
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Find effective work schedule for today
        // First, check if there's an assignment covering today
        const assignment = await prisma.workScheduleAssignment.findFirst({
            where: {
                startDate: { lte: today },
                endDate: { gte: today },
            },
            include: {
                workSchedule: true,
            },
            orderBy: {
                createdAt: 'desc', // If multiple, take most recent
            },
        });

        let effectiveSchedule;

        if (assignment) {
            // Use the assigned schedule
            effectiveSchedule = assignment.workSchedule;
        } else {
            // Use default schedule
            effectiveSchedule = await prisma.workSchedule.findFirst({
                where: { isDefault: true },
            });
        }

        if (!effectiveSchedule) {
            return NextResponse.json(
                { message: 'No work schedule found. Please set a default schedule or create an assignment.' },
                { status: 404 }
            );
        }

        // 2. Calculate time windows based on schedule
        const { startTime, endTime } = effectiveSchedule;

        // CHECKIN window: startTime - 15 min to startTime + 30 min
        const checkinValidFrom = adjustTime(startTime, -15, today);
        const checkinValidUntil = adjustTime(startTime, 30, today);

        // CHECKOUT window: endTime - 30 min to endTime + 15 min
        const checkoutValidFrom = adjustTime(endTime, -30, today);
        const checkoutValidUntil = adjustTime(endTime, 15, today);

        // 3. Deactivate old sessions for today
        await prisma.qrSession.updateMany({
            where: {
                date: today,
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        // 4. Create CHECKIN session
        const checkinSession = await prisma.qrSession.create({
            data: {
                type: 'CHECK_IN' as QrSessionType,
                token: generateToken(),
                date: today,
                validFrom: checkinValidFrom,
                validUntil: checkinValidUntil,
                isActive: true,
            },
        });

        // 5. Create CHECKOUT session
        const checkoutSession = await prisma.qrSession.create({
            data: {
                type: 'CHECK_OUT' as QrSessionType,
                token: generateToken(),
                date: today,
                validFrom: checkoutValidFrom,
                validUntil: checkoutValidUntil,
                isActive: true,
            },
        });

        // 6. Return response
        return NextResponse.json({
            date: today.toISOString().split('T')[0],
            schedule: {
                name: effectiveSchedule.name,
                startTime: effectiveSchedule.startTime,
                endTime: effectiveSchedule.endTime,
                source: assignment ? 'assignment' : 'default',
            },
            sessions: [
                {
                    id: checkinSession.id,
                    type: checkinSession.type,
                    token: checkinSession.token,
                    validFrom: checkinSession.validFrom.toISOString(),
                    validUntil: checkinSession.validUntil.toISOString(),
                    isActive: checkinSession.isActive,
                },
                {
                    id: checkoutSession.id,
                    type: checkoutSession.type,
                    token: checkoutSession.token,
                    validFrom: checkoutSession.validFrom.toISOString(),
                    validUntil: checkoutSession.validUntil.toISOString(),
                    isActive: checkoutSession.isActive,
                },
            ],
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/v1/attendance/qr/auto-generate error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
