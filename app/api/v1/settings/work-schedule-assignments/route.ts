import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/v1/settings/work-schedule-assignments
//   Query params: workScheduleId?, active?
//   Auth: ADMIN/PRINCIPAL only
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

        // Parse query params
        const { searchParams } = new URL(request.url);
        const workScheduleId = searchParams.get('workScheduleId');
        const active = searchParams.get('active');

        const where: any = {};

        if (workScheduleId) {
            const id = parseInt(workScheduleId);
            if (isNaN(id)) {
                return NextResponse.json(
                    { message: 'Invalid workScheduleId format' },
                    { status: 400 }
                );
            }
            where.workScheduleId = id;
        }

        if (active === 'true') {
            // Filter for active assignments (endDate >= today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            where.endDate = {
                gte: today
            };
        }

        // Fetch assignments with related work schedule
        const assignments = await prisma.workScheduleAssignment.findMany({
            where,
            include: {
                workSchedule: true
            },
            orderBy: [
                { startDate: 'desc' }
            ]
        });

        // Format response
        const data = assignments.map((assignment) => ({
            id: assignment.id,
            work_schedule_id: assignment.workScheduleId,
            start_date: assignment.startDate.toISOString().split('T')[0],
            end_date: assignment.endDate.toISOString().split('T')[0],
            work_schedule: {
                id: assignment.workSchedule.id,
                name: assignment.workSchedule.name,
                start_time: assignment.workSchedule.startTime,
                end_time: assignment.workSchedule.endTime,
            },
            created_at: assignment.createdAt.toISOString(),
            updated_at: assignment.updatedAt.toISOString(),
        }));

        return NextResponse.json({ data });
    } catch (error) {
        console.error('GET /api/v1/settings/work-schedule-assignments error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/v1/settings/work-schedule-assignments
//   Body: { workScheduleId, startDate, endDate }
//   Auth: ADMIN/PRINCIPAL only
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

        // Parse body
        const body = await request.json();
        const { workScheduleId, startDate, endDate } = body;

        // Validate required fields
        if (!workScheduleId || !startDate || !endDate) {
            return NextResponse.json(
                { message: 'Missing required fields: workScheduleId, startDate, endDate' },
                { status: 400 }
            );
        }

        // Validate workScheduleId
        if (typeof workScheduleId !== 'number' || workScheduleId <= 0) {
            return NextResponse.json(
                { message: 'Invalid workScheduleId: must be a positive number' },
                { status: 400 }
            );
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate)) {
            return NextResponse.json(
                { message: 'Invalid startDate format. Use YYYY-MM-DD' },
                { status: 400 }
            );
        }
        if (!dateRegex.test(endDate)) {
            return NextResponse.json(
                { message: 'Invalid endDate format. Use YYYY-MM-DD' },
                { status: 400 }
            );
        }

        // Parse dates
        const startDateObj = new Date(startDate + 'T00:00:00');
        const endDateObj = new Date(endDate + 'T00:00:00');

        // Validate dates are valid
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return NextResponse.json(
                { message: 'Invalid date values' },
                { status: 400 }
            );
        }

        // Validate startDate is before endDate
        if (endDateObj <= startDateObj) {
            return NextResponse.json(
                { message: 'endDate must be after startDate' },
                { status: 400 }
            );
        }

        // Check if work schedule exists
        const workSchedule = await prisma.workSchedule.findUnique({
            where: { id: workScheduleId }
        });

        if (!workSchedule) {
            return NextResponse.json(
                { message: 'Work schedule not found' },
                { status: 404 }
            );
        }

        // TODO: Check for overlapping assignments
        // For MVP, we'll log a warning but allow creation
        // Future enhancement: Return 400 if overlap detected
        const overlapping = await prisma.workScheduleAssignment.findFirst({
            where: {
                OR: [
                    // New period starts during existing period
                    {
                        AND: [
                            { startDate: { lte: startDateObj } },
                            { endDate: { gte: startDateObj } }
                        ]
                    },
                    // New period ends during existing period
                    {
                        AND: [
                            { startDate: { lte: endDateObj } },
                            { endDate: { gte: endDateObj } }
                        ]
                    },
                    // New period completely contains existing period
                    {
                        AND: [
                            { startDate: { gte: startDateObj } },
                            { endDate: { lte: endDateObj } }
                        ]
                    }
                ]
            }
        });

        if (overlapping) {
            console.warn('[WARNING] Creating overlapping work schedule assignment:', {
                new: { startDate, endDate, workScheduleId },
                existing: {
                    id: overlapping.id,
                    startDate: overlapping.startDate.toISOString().split('T')[0],
                    endDate: overlapping.endDate.toISOString().split('T')[0],
                    workScheduleId: overlapping.workScheduleId
                }
            });

            // For now, return error instead of allowing overlap
            return NextResponse.json(
                {
                    message: 'Assignment overlaps with existing assignment',
                    existing_assignment: {
                        id: overlapping.id,
                        start_date: overlapping.startDate.toISOString().split('T')[0],
                        end_date: overlapping.endDate.toISOString().split('T')[0],
                        work_schedule_id: overlapping.workScheduleId
                    }
                },
                { status: 400 }
            );
        }

        // Create assignment
        const assignment = await prisma.workScheduleAssignment.create({
            data: {
                workScheduleId,
                startDate: startDateObj,
                endDate: endDateObj,
            },
            include: {
                workSchedule: true
            }
        });

        // Format response
        const data = {
            id: assignment.id,
            work_schedule_id: assignment.workScheduleId,
            start_date: assignment.startDate.toISOString().split('T')[0],
            end_date: assignment.endDate.toISOString().split('T')[0],
            work_schedule: {
                id: assignment.workSchedule.id,
                name: assignment.workSchedule.name,
            },
            created_at: assignment.createdAt.toISOString(),
            updated_at: assignment.updatedAt.toISOString(),
        };

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/settings/work-schedule-assignments error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
