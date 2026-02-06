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

// PUT /api/v1/settings/work-schedules/[id] - Update schedule template
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
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

        const { id } = await context.params;
        const scheduleId = parseInt(id);

        if (isNaN(scheduleId)) {
            return NextResponse.json(
                { message: 'Invalid schedule ID' },
                { status: 400 }
            );
        }

        // Check if schedule exists
        const existing = await prisma.workSchedule.findUnique({
            where: { id: scheduleId }
        });

        if (!existing) {
            return NextResponse.json(
                { message: 'Schedule template not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { name, startTime, endTime, lateToleranceMinutes, workingDays, isDefault } = body;

        // Validation
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return NextResponse.json(
                    { message: 'Template name cannot be empty' },
                    { status: 400 }
                );
            }

            if (name.length > 255) {
                return NextResponse.json(
                    { message: 'Template name too long (max 255 characters)' },
                    { status: 400 }
                );
            }

            // Check for duplicate name (excluding current record)
            const duplicate = await prisma.workSchedule.findFirst({
                where: {
                    name: name.trim(),
                    id: { not: scheduleId }
                }
            });

            if (duplicate) {
                return NextResponse.json(
                    { message: 'Template name already exists' },
                    { status: 400 }
                );
            }
        }

        if (startTime !== undefined && !isValidTimeFormat(startTime)) {
            return NextResponse.json(
                { message: 'Invalid start time format. Use HH:MM (e.g., 07:00)' },
                { status: 400 }
            );
        }

        if (endTime !== undefined && !isValidTimeFormat(endTime)) {
            return NextResponse.json(
                { message: 'Invalid end time format. Use HH:MM (e.g., 15:00)' },
                { status: 400 }
            );
        }

        // Validate end time is after start time
        const finalStartTime = startTime || existing.startTime;
        const finalEndTime = endTime || existing.endTime;

        const [startH, startM] = finalStartTime.split(':').map(Number);
        const [endH, endM] = finalEndTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (endMinutes <= startMinutes) {
            return NextResponse.json(
                { message: 'End time must be after start time' },
                { status: 400 }
            );
        }

        if (lateToleranceMinutes !== undefined && (typeof lateToleranceMinutes !== 'number' || lateToleranceMinutes < 0)) {
            return NextResponse.json(
                { message: 'Late tolerance must be a non-negative number' },
                { status: 400 }
            );
        }

        if (workingDays !== undefined && !isValidWorkingDays(workingDays)) {
            return NextResponse.json(
                { message: 'Invalid working days. Use array of: Mon, Tue, Wed, Thu, Fri, Sat, Sun' },
                { status: 400 }
            );
        }

        // Check if unsetting the only default
        if (isDefault === false && existing.isDefault) {
            const otherDefaults = await prisma.workSchedule.count({
                where: {
                    isDefault: true,
                    id: { not: scheduleId }
                }
            });

            if (otherDefaults === 0) {
                return NextResponse.json(
                    { message: 'Cannot unset default: at least one default schedule is required' },
                    { status: 400 }
                );
            }
        }

        // If setting this as default, unset other defaults
        if (isDefault === true && !existing.isDefault) {
            await prisma.workSchedule.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        // Update schedule
        const updateData: any = {};
        if (name !== undefined) updateData.name = name.trim();
        if (startTime !== undefined) updateData.startTime = startTime;
        if (endTime !== undefined) updateData.endTime = endTime;
        if (lateToleranceMinutes !== undefined) updateData.lateToleranceMinutes = lateToleranceMinutes;
        if (workingDays !== undefined) updateData.workingDays = workingDays;
        if (isDefault !== undefined) updateData.isDefault = isDefault;

        const updated = await prisma.workSchedule.update({
            where: { id: scheduleId },
            data: updateData
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT /api/v1/settings/work-schedules/[id] error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/v1/settings/work-schedules/[id] - Delete schedule template
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
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

        const { id } = await context.params;
        const scheduleId = parseInt(id);

        if (isNaN(scheduleId)) {
            return NextResponse.json(
                { message: 'Invalid schedule ID' },
                { status: 400 }
            );
        }

        // Check if schedule exists
        const existing = await prisma.workSchedule.findUnique({
            where: { id: scheduleId },
            include: {
                assignments: true
            }
        });

        if (!existing) {
            return NextResponse.json(
                { message: 'Schedule template not found' },
                { status: 404 }
            );
        }

        // Check if used in assignments
        if (existing.assignments.length > 0) {
            return NextResponse.json(
                { message: `Cannot delete schedule template: currently used in ${existing.assignments.length} assignment(s)` },
                { status: 400 }
            );
        }

        // Check if it's the only default
        if (existing.isDefault) {
            const otherDefaults = await prisma.workSchedule.count({
                where: {
                    isDefault: true,
                    id: { not: scheduleId }
                }
            });

            if (otherDefaults === 0) {
                return NextResponse.json(
                    { message: 'Cannot delete the only default schedule template' },
                    { status: 400 }
                );
            }
        }

        // Delete schedule
        await prisma.workSchedule.delete({
            where: { id: scheduleId }
        });

        return NextResponse.json({
            message: 'Schedule template deleted successfully'
        });
    } catch (error) {
        console.error('DELETE /api/v1/settings/work-schedules/[id] error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
