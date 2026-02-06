import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/v1/attendance/teacher/[id] - Get attendance history for a specific teacher (admin view)
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const teacherId = Number(params.id);

        // Validate teacher ID
        if (Number.isNaN(teacherId) || teacherId <= 0) {
            return NextResponse.json(
                { message: 'Invalid teacher ID' },
                { status: 400 }
            );
        }

        // Verify teacher exists
        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId },
        });

        if (!teacher) {
            return NextResponse.json(
                { message: 'Teacher not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Build date range (default to current month if not provided)
        const now = new Date();
        const start = startDate
            ? new Date(startDate + 'T00:00:00')
            : new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month

        const end = endDate
            ? new Date(endDate + 'T23:59:59')
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Last day of current month

        // Fetch attendance records
        const attendances = await prisma.attendance.findMany({
            where: {
                teacherId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        // Transform data to match API response format
        const data = attendances.map(att => ({
            date: att.date.toISOString().split('T')[0], // YYYY-MM-DD
            check_in_time: att.checkInTime
                ? att.checkInTime.toISOString().substring(11, 16) // HH:mm
                : null,
            check_out_time: att.checkOutTime
                ? att.checkOutTime.toISOString().substring(11, 16) // HH:mm
                : null,
            status: att.status.toLowerCase(),
            is_late: att.lateMinutes > 0,
            late_minutes: att.lateMinutes,
            notes: att.notes,
        }));

        // Calculate summary
        const summary = {
            total_days: attendances.length,
            present: attendances.filter(a => a.status === 'PRESENT').length,
            late: attendances.filter(a => a.status === 'LATE').length,
            leave: attendances.filter(a => a.status === 'LEAVE').length,
            sick: attendances.filter(a => a.status === 'SICK').length,
            absent: attendances.filter(a => a.status === 'ABSENT').length,
        };

        return NextResponse.json({
            data,
            summary,
            teacher: {
                id: teacher.id,
                nip: teacher.nip,
                name: teacher.name,
                subject: teacher.subject,
            },
        });
    } catch (error) {
        console.error('GET /api/v1/attendance/teacher/[id] error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
