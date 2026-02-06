import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/v1/attendance/my - Get attendance history for logged-in teacher
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Temporary: get teacher_id from query (will be replaced with auth later)
        const teacherIdParam = searchParams.get('teacher_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Validate teacher_id
        if (!teacherIdParam) {
            return NextResponse.json(
                { message: 'teacher_id is required' },
                { status: 400 }
            );
        }

        const teacherId = Number(teacherIdParam);
        if (Number.isNaN(teacherId) || teacherId <= 0) {
            return NextResponse.json(
                { message: 'Invalid teacher_id' },
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
        const data = attendances.map((att: (typeof attendances)[number]) => ({
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
            present: attendances.filter(
                (a: (typeof attendances)[number]) => a.status === 'PRESENT'
            ).length,
            late: attendances.filter(
                (a: (typeof attendances)[number]) => a.status === 'LATE'
            ).length,
            leave: attendances.filter(
                (a: (typeof attendances)[number]) => a.status === 'LEAVE'
            ).length,
            sick: attendances.filter(
                (a: (typeof attendances)[number]) => a.status === 'SICK'
            ).length,
            absent: attendances.filter(
                (a: (typeof attendances)[number]) => a.status === 'ABSENT'
            ).length,
        };

        return NextResponse.json({
            data,
            summary,
        });
    } catch (error) {
        console.error('GET /api/v1/attendance/my error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
