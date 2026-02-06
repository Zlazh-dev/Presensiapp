import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus } from '@prisma/client';

// Helper: Parse month string (YYYY-MM) to start and end dates
function parseMonth(monthStr: string): { startDate: Date; endDate: Date } | null {
    const regex = /^\d{4}-\d{2}$/;
    if (!regex.test(monthStr)) {
        return null;
    }

    const [year, month] = monthStr.split('-').map(Number);
    if (month < 1 || month > 12) {
        return null;
    }

    const startDate = new Date(year, month - 1, 1); // month is 0-indexed in JS
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    return { startDate, endDate };
}

// Helper: Get day name from Date object (e.g., "Mon", "Tue")
function getDayName(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
}

// Helper: Generate list of working dates in a month based on workingDays
function getWorkingDates(startDate: Date, endDate: Date, workingDays: string[]): Date[] {
    const workingDates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
        const dayName = getDayName(current);
        if (workingDays.includes(dayName)) {
            workingDates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }

    return workingDates;
}

// Helper: Format date to YYYY-MM-DD string
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// GET /api/v1/reports/attendance/summary - Get monthly attendance summary
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const teacherIdParam = searchParams.get('teacherId');

        // Validate month parameter
        if (!month) {
            return NextResponse.json(
                { message: 'Month parameter is required (format: YYYY-MM)' },
                { status: 400 }
            );
        }

        const dateRange = parseMonth(month);
        if (!dateRange) {
            return NextResponse.json(
                { message: 'Invalid month format. Use YYYY-MM (e.g., 2025-02)' },
                { status: 400 }
            );
        }

        const { startDate, endDate } = dateRange;

        // Parse optional teacherId filter
        let teacherIdFilter: number | null = null;
        if (teacherIdParam) {
            teacherIdFilter = Number(teacherIdParam);
            if (Number.isNaN(teacherIdFilter) || teacherIdFilter <= 0) {
                return NextResponse.json(
                    { message: 'Invalid teacherId parameter' },
                    { status: 400 }
                );
            }
        }

        // Get work schedule to determine working days
        const workSchedule = await prisma.workSchedule.findFirst({
            orderBy: { createdAt: 'desc' },
        });

        const workingDays = workSchedule?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const workingDates = getWorkingDates(startDate, endDate, workingDays);
        const totalWorkingDays = workingDates.length;

        // Build teacher filter
        const teacherWhere: any = {
            status: 'ACTIVE',
        };
        if (teacherIdFilter) {
            teacherWhere.id = teacherIdFilter;
        }

        // Fetch all active teachers (or specific teacher if filtered)
        const teachers = await prisma.teacher.findMany({
            where: teacherWhere,
            select: {
                id: true,
                name: true,
                nip: true,
                subject: true,
            },
            orderBy: { name: 'asc' },
        });

        // Fetch attendance records for the month
        const attendanceWhere: any = {
            date: {
                gte: startDate,
                lte: endDate,
            },
        };
        if (teacherIdFilter) {
            attendanceWhere.teacherId = teacherIdFilter;
        }

        const attendances = await prisma.attendance.findMany({
            where: attendanceWhere,
            select: {
                teacherId: true,
                status: true,
                lateMinutes: true,
            },
        });

        // Group attendance by teacherId for efficient lookup
        const attendanceByTeacher = new Map<number, typeof attendances>();
        for (const attendance of attendances) {
            if (!attendanceByTeacher.has(attendance.teacherId)) {
                attendanceByTeacher.set(attendance.teacherId, []);
            }
            attendanceByTeacher.get(attendance.teacherId)!.push(attendance);
        }

        // Calculate summary for each teacher
        const data = teachers.map(teacher => {
            const teacherAttendances = attendanceByTeacher.get(teacher.id) || [];

            // Count by status
            const presentCount = teacherAttendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
            const lateCount = teacherAttendances.filter(a => a.status === AttendanceStatus.LATE).length;
            const leaveCount = teacherAttendances.filter(a => a.status === AttendanceStatus.LEAVE).length;
            const sickCount = teacherAttendances.filter(a => a.status === AttendanceStatus.SICK).length;
            const absentCount = teacherAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;

            // Calculate total late minutes
            const totalLateMinutes = teacherAttendances.reduce((sum, a) => sum + a.lateMinutes, 0);

            return {
                teacherId: teacher.id,
                teacherName: teacher.name,
                nip: teacher.nip,
                subject: teacher.subject,
                totalDays: totalWorkingDays,
                presentCount,
                lateCount,
                leaveCount,
                sickCount,
                absentCount,
                totalLateMinutes,
            };
        });

        // Response
        return NextResponse.json({
            month,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            totalTeachers: teachers.length,
            data,
        });
    } catch (error) {
        console.error('GET /api/v1/reports/attendance/summary error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
