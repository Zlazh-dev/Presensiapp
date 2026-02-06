import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper: Parse date string YYYY-MM-DD
function parseDate(dateStr: string): Date | null {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
        return null;
    }

    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
}

// Helper: Format date to YYYY-MM-DD
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// GET /api/v1/settings/work-schedule-assignments - List assignments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');

        let where: any = {};

        // Filter by date range if provided
        if (fromParam || toParam) {
            const from = fromParam ? parseDate(fromParam) : null;
            const to = toParam ? parseDate(toParam) : null;

            if (fromParam && !from) {
                return NextResponse.json(
                    { message: 'Invalid from date format. Use YYYY-MM-DD' },
                    { status: 400 }
                );
            }

            if (toParam && !to) {
                return NextResponse.json(
                    { message: 'Invalid to date format. Use YYYY-MM-DD' },
                    { status: 400 }
                );
            }

            // Find assignments that overlap with [from, to] range
            if (from && to) {
                where = {
                    AND: [
                        { startDate: { lte: to } },
                        { endDate: { gte: from } }
                    ]
                };
            } else if (from) {
                where = { endDate: { gte: from } };
            } else if (to) {
                where = { startDate: { lte: to } };
            }
        }

        const assignments = await prisma.workScheduleAssignment.findMany({
            where,
            include: {
                workSchedule: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { startDate: 'asc' }
            ]
        });

        // Format response
        const data = assignments.map(a => ({
            id: a.id,
            workScheduleId: a.workScheduleId,
            workScheduleName: a.workSchedule.name,
            startDate: formatDate(a.startDate),
            endDate: formatDate(a.endDate),
            createdAt: a.createdAt.toISOString()
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

// POST /api/v1/settings/work-schedule-assignments - Create assignment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { workScheduleId, startDate, endDate } = body;

        // Validation
        if (typeof workScheduleId !== 'number') {
            return NextResponse.json(
                { message: 'Work schedule ID is required' },
                { status: 400 }
            );
        }

        if (!startDate || typeof startDate !== 'string') {
            return NextResponse.json(
                { message: 'Start date is required' },
                { status: 400 }
            );
        }

        if (!endDate || typeof endDate !== 'string') {
            return NextResponse.json(
                { message: 'End date is required' },
                { status: 400 }
            );
        }

        const start = parseDate(startDate);
        if (!start) {
            return NextResponse.json(
                { message: 'Invalid start date format. Use YYYY-MM-DD' },
                { status: 400 }
            );
        }

        const end = parseDate(endDate);
        if (!end) {
            return NextResponse.json(
                { message: 'Invalid end date format. Use YYYY-MM-DD' },
                { status: 400 }
            );
        }

        if (end < start) {
            return NextResponse.json(
                { message: 'End date must be after or equal to start date' },
                { status: 400 }
            );
        }

        // Check if work schedule exists
        const schedule = await prisma.workSchedule.findUnique({
            where: { id: workScheduleId }
        });

        if (!schedule) {
            return NextResponse.json(
                { message: 'Work schedule template not found' },
                { status: 404 }
            );
        }

        // Check for overlaps (warning, not blocking)
        const overlaps = await prisma.workScheduleAssignment.findMany({
            where: {
                AND: [
                    { startDate: { lte: end } },
                    { endDate: { gte: start } }
                ]
            },
            include: {
                workSchedule: {
                    select: { name: true }
                }
            }
        });

        // Create assignment
        const assignment = await prisma.workScheduleAssignment.create({
            data: {
                workScheduleId,
                startDate: start,
                endDate: end
            },
            include: {
                workSchedule: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        const response: any = {
            id: assignment.id,
            workScheduleId: assignment.workScheduleId,
            workScheduleName: assignment.workSchedule.name,
            startDate: formatDate(assignment.startDate),
            endDate: formatDate(assignment.endDate),
            createdAt: assignment.createdAt.toISOString()
        };

        // Add warning if overlaps exist
        if (overlaps.length > 0) {
            response.warning = `Assignment overlaps with ${overlaps.length} existing assignment(s)`;
        }

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/settings/work-schedule-assignments error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
