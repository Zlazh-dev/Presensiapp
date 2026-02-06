import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper: Validate time format HH:MM
function isValidTimeFormat(time: string): boolean {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(time);
}

// Helper: Validate working days
const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function isValidWorkingDays(days: string[]): boolean {
    return Array.isArray(days) && days.every(day => VALID_DAYS.includes(day));
}

// GET /api/v1/settings/work-schedules - List all schedule templates
export async function GET(request: NextRequest) {
    try {
        // Auth check
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json(
                { message: 'Unauthenticated' },
                { status: 401 }
            );
        }

        const { verifyAuthToken } = await import('@/lib/auth');
        const payload = await verifyAuthToken(token);
        if (!payload) {
            return NextResponse.json(
                { message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Fetch user and check role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
            return NextResponse.json(
                { message: 'Only ADMIN or PRINCIPAL can access this endpoint' },
                { status: 403 }
            );
        }

        const schedules = await prisma.workSchedule.findMany({
            include: {
                _count: {
                    select: { assignments: true }
                }
            },
            orderBy: [
                { isDefault: 'desc' }, // Default first
                { name: 'asc' }
            ]
        });

        return NextResponse.json({ data: schedules });
    } catch (error) {
        console.error('GET /api/v1/settings/work-schedules error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/v1/settings/work-schedules - Create new schedule template
export async function POST(request: NextRequest) {
    try {
        // Auth check
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json(
                { message: 'Unauthenticated' },
                { status: 401 }
            );
        }

        const { verifyAuthToken } = await import('@/lib/auth');
        const payload = await verifyAuthToken(token);
        if (!payload) {
            return NextResponse.json(
                { message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Fetch user and check role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
            return NextResponse.json(
                { message: 'Only ADMIN or PRINCIPAL can access this endpoint' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, startTime, endTime, lateToleranceMinutes, workingDays, isDefault } = body;

        // Validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { message: 'Template name is required' },
                { status: 400 }
            );
        }

        if (name.length > 255) {
            return NextResponse.json(
                { message: 'Template name too long (max 255 characters)' },
                { status: 400 }
            );
        }

        if (!startTime || !isValidTimeFormat(startTime)) {
            return NextResponse.json(
                { message: 'Invalid start time format. Use HH:MM (e.g., 07:00)' },
                { status: 400 }
            );
        }

        if (!endTime || !isValidTimeFormat(endTime)) {
            return NextResponse.json(
                { message: 'Invalid end time format. Use HH:MM (e.g., 15:00)' },
                { status: 400 }
            );
        }

        // Validate end time is after start time
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (endMinutes <= startMinutes) {
            return NextResponse.json(
                { message: 'End time must be after start time' },
                { status: 400 }
            );
        }

        if (typeof lateToleranceMinutes !== 'number' || lateToleranceMinutes < 0) {
            return NextResponse.json(
                { message: 'Late tolerance must be a non-negative number' },
                { status: 400 }
            );
        }

        if (!isValidWorkingDays(workingDays)) {
            return NextResponse.json(
                { message: 'Invalid working days. Use array of: Mon, Tue, Wed, Thu, Fri, Sat, Sun' },
                { status: 400 }
            );
        }

        // Check for duplicate name
        const existing = await prisma.workSchedule.findFirst({
            where: { name: name.trim() }
        });

        if (existing) {
            return NextResponse.json(
                { message: 'Template name already exists' },
                { status: 400 }
            );
        }

        // If setting this as default, unset other defaults
        if (isDefault) {
            await prisma.workSchedule.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        // Create template
        const schedule = await prisma.workSchedule.create({
            data: {
                name: name.trim(),
                startTime,
                endTime,
                lateToleranceMinutes,
                workingDays,
                isDefault: isDefault || false
            }
        });

        return NextResponse.json(schedule, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/settings/work-schedules error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
