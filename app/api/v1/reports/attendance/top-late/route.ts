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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return { startDate, endDate };
}

// Helper: Get current month in YYYY-MM format
function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Helper: Format date to YYYY-MM-DD
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// GET /api/v1/reports/attendance/top-late - Get top late teachers for a month
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month');
        const limitParam = searchParams.get('limit');

        // Determine month
        let month: string;
        let startDate: Date;
        let endDate: Date;

        if (monthParam) {
            const dateRange = parseMonth(monthParam);
            if (!dateRange) {
                return NextResponse.json(
                    { message: 'Invalid month format. Use YYYY-MM (e.g., 2025-02)' },
                    { status: 400 }
                );
            }
            month = monthParam;
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        } else {
            month = getCurrentMonth();
            const dateRange = parseMonth(month)!;
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        }

        // Parse limit
        const limit = limitParam ? Number(limitParam) : 3;
        if (Number.isNaN(limit) || limit < 1) {
            return NextResponse.json(
                { message: 'Invalid limit parameter' },
                { status: 400 }
            );
        }

        // Fetch all LATE attendance in the month
        const lateAttendances = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: AttendanceStatus.LATE,
            },
            select: {
                teacherId: true,
                lateMinutes: true,
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

        // Group by teacherId and aggregate
        const teacherLateMap = new Map<number, {
            teacher: { id: number; name: string; nip: string; subject: string };
            lateCount: number;
            totalLateMinutes: number;
        }>();

        for (const attendance of lateAttendances) {
            const teacherId = attendance.teacherId;
            if (!teacherLateMap.has(teacherId)) {
                teacherLateMap.set(teacherId, {
                    teacher: attendance.teacher,
                    lateCount: 0,
                    totalLateMinutes: 0,
                });
            }
            const entry = teacherLateMap.get(teacherId)!;
            entry.lateCount++;
            entry.totalLateMinutes += attendance.lateMinutes;
        }

        // Convert to array and sort
        const topLate = Array.from(teacherLateMap.values())
            .sort((a, b) => {
                // Primary sort: totalLateMinutes desc
                if (b.totalLateMinutes !== a.totalLateMinutes) {
                    return b.totalLateMinutes - a.totalLateMinutes;
                }
                // Tie-break: lateCount desc
                return b.lateCount - a.lateCount;
            })
            .slice(0, limit)
            .map(entry => ({
                teacherId: entry.teacher.id,
                teacherName: entry.teacher.name,
                nip: entry.teacher.nip,
                subject: entry.teacher.subject,
                lateCount: entry.lateCount,
                totalLateMinutes: entry.totalLateMinutes,
            }));

        // Response
        return NextResponse.json({
            month,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            limit,
            data: topLate,
        });
    } catch (error) {
        console.error('GET /api/v1/reports/attendance/top-late error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
