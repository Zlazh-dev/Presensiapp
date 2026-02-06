import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';
import type { Attendance } from '@prisma/client';

// GET /api/v1/attendance/my - Get attendance history for logged-in teacher
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Get token from cookie
        const token = request.cookies.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthenticated' },
                { status: 401 }
            );
        }

        // Verify token
        const payload = await verifyAuthToken(token);

        if (!payload) {
            return NextResponse.json(
                { message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Fetch user from database with teacher relation
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { teacher: true },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user is a teacher
        if (user.role !== 'TEACHER') {
            return NextResponse.json(
                { message: 'Only TEACHER can access this endpoint' },
                { status: 403 }
            );
        }

        // Check if user has teacher record
        if (!user.teacher) {
            return NextResponse.json(
                { message: 'Teacher not found for current user' },
                { status: 404 }
            );
        }

        const teacherId = user.teacher.id;

        // Get date range from query params
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
                teacherId: teacherId,
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
        const data = attendances.map((att: Attendance) => ({
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
            present: attendances.filter((a: Attendance) => a.status === 'PRESENT').length,
            late: attendances.filter((a: Attendance) => a.status === 'LATE').length,
            leave: attendances.filter((a: Attendance) => a.status === 'LEAVE').length,
            sick: attendances.filter((a: Attendance) => a.status === 'SICK').length,
            absent: attendances.filter((a: Attendance) => a.status === 'ABSENT').length,
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
