import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus } from '@prisma/client';

// Helper: Get start and end of today (local date)
function getTodayRange(): { startOfDay: Date; endOfDay: Date } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startOfDay, endOfDay };
}

// Helper: Format date to YYYY-MM-DD
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// GET /api/v1/reports/attendance/today - Get today's attendance summary
export async function GET(request: NextRequest) {
    try {
        const { startOfDay, endOfDay } = getTodayRange();
        const todayDate = formatDate(startOfDay);

        // Fetch all active teachers
        const teachers = await prisma.teacher.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true },
        });

        const totalTeachers = teachers.length;

        // Fetch today's attendance for all active teachers
        const attendances = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                teacherId: {
                    in: teachers.map(t => t.id),
                },
            },
            select: {
                status: true,
                lateMinutes: true,
                teacherId: true,
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        nip: true,
                        subject: true,
                    },
                },
            },
        });

        // Count by status
        const presentCount = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const lateCount = attendances.filter(a => a.status === AttendanceStatus.LATE).length;
        const leaveCount = attendances.filter(a => a.status === AttendanceStatus.LEAVE).length;
        const sickCount = attendances.filter(a => a.status === AttendanceStatus.SICK).length;
        const absentCount = attendances.filter(a => a.status === AttendanceStatus.ABSENT).length;

        // Get top late teachers today (max 3, sorted by lateMinutes desc)
        const lateToday = attendances
            .filter(a => a.status === AttendanceStatus.LATE)
            .sort((a, b) => b.lateMinutes - a.lateMinutes)
            .slice(0, 3)
            .map(a => ({
                teacherId: a.teacher.id,
                teacherName: a.teacher.name,
                nip: a.teacher.nip,
                subject: a.teacher.subject,
                lateMinutes: a.lateMinutes,
            }));

        // Response
        return NextResponse.json({
            date: todayDate,
            totalTeachers,
            presentCount,
            lateCount,
            leaveCount,
            sickCount,
            absentCount,
            topLateToday: lateToday,
        });
    } catch (error) {
        console.error('GET /api/v1/reports/attendance/today error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
