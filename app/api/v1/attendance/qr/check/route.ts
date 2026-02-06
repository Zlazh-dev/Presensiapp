import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus, QrSessionType } from '@prisma/client';

interface CheckQrRequest {
    token: string;
}

// Helper: Parse time string "HH:MM" to minutes from midnight
function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Helper: Get date string (YYYY-MM-DD) from Date object
function getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Helper: Get schedule for a specific date (reused from fingerprint import)
async function getScheduleForDate(date: Date): Promise<any | null> {
    const dateStr = getDateString(date);

    // Find assignment covering this date
    const assignment = await prisma.workScheduleAssignment.findFirst({
        where: {
            AND: [
                { startDate: { lte: date } },
                { endDate: { gte: date } },
            ],
        },
        include: {
            workSchedule: true,
        },
    });

    if (assignment) {
        return assignment.workSchedule;
    }

    // Fall back to default schedule
    const defaultSchedule = await prisma.workSchedule.findFirst({
        where: { isDefault: true },
    });

    return defaultSchedule;
}

// POST /api/v1/attendance/qr/check - Teacher scans QR and records attendance
export async function POST(request: NextRequest) {
    try {
        const body: CheckQrRequest = await request.json();

        if (!body.token) {
            return NextResponse.json(
                { message: 'Token is required' },
                { status: 400 }
            );
        }

        // TODO: Get authenticated user from session/auth context
        // For now, we'll use a placeholder. In production, implement proper auth.
        // Example: const session = await getServerSession(authOptions);
        // const user = await prisma.user.findUnique({ where: { id: session.user.id } });

        // PLACEHOLDER: Get user from header (for testing)
        const userId = request.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json(
                { message: 'Authentication required. Please provide x-user-id header for testing.' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Validate user is a teacher
        if (user.role !== 'TEACHER') {
            return NextResponse.json(
                { message: 'Only teachers can use QR attendance' },
                { status: 403 }
            );
        }

        // Find teacher by matching username to NIP
        const teacher = await prisma.teacher.findFirst({
            where: { nip: user.username },
        });

        if (!teacher) {
            return NextResponse.json(
                { message: 'Teacher record not found for this user' },
                { status: 404 }
            );
        }

        // Validate QR token
        const now = new Date();
        const qrSession = await prisma.qrSession.findUnique({
            where: { token: body.token },
        });

        if (!qrSession || !qrSession.isActive) {
            return NextResponse.json(
                { message: 'Invalid QR code' },
                { status: 400 }
            );
        }

        // Check if token is within valid time range
        if (now < qrSession.validFrom || now > qrSession.validUntil) {
            return NextResponse.json(
                { message: 'QR code has expired or is not yet valid' },
                { status: 400 }
            );
        }

        // Get work schedule for this date
        const schedule = await getScheduleForDate(qrSession.date);
        if (!schedule) {
            return NextResponse.json(
                { message: 'No work schedule configured for this date' },
                { status: 400 }
            );
        }

        const startTimeMinutes = timeToMinutes(schedule.startTime);
        const tolerance = schedule.lateToleranceMinutes;

        // Prepare attendance data based on QR type
        const attendanceData: any = {
            teacherId: teacher.id,
            date: qrSession.date,
        };

        if (qrSession.type === QrSessionType.CHECK_IN) {
            attendanceData.checkInTime = now;

            // Calculate status and late minutes
            const checkInMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
            const allowedTime = startTimeMinutes + tolerance;

            if (checkInMinutes <= allowedTime) {
                attendanceData.status = AttendanceStatus.PRESENT;
                attendanceData.lateMinutes = 0;
            } else {
                attendanceData.status = AttendanceStatus.LATE;
                attendanceData.lateMinutes = Math.max(0, checkInMinutes - allowedTime);
            }
        } else {
            // CHECK_OUT
            attendanceData.checkOutTime = now;
            // Don't modify status/lateMinutes for check-out
        }

        // Upsert attendance record
        const attendance = await prisma.attendance.upsert({
            where: {
                teacherId_date: {
                    teacherId: teacher.id,
                    date: qrSession.date,
                },
            },
            update: qrSession.type === QrSessionType.CHECK_IN
                ? {
                    checkInTime: attendanceData.checkInTime,
                    status: attendanceData.status,
                    lateMinutes: attendanceData.lateMinutes,
                }
                : {
                    checkOutTime: attendanceData.checkOutTime,
                },
            create: qrSession.type === QrSessionType.CHECK_IN
                ? {
                    teacherId: teacher.id,
                    date: qrSession.date,
                    checkInTime: attendanceData.checkInTime,
                    status: attendanceData.status,
                    lateMinutes: attendanceData.lateMinutes,
                }
                : {
                    teacherId: teacher.id,
                    date: qrSession.date,
                    checkOutTime: attendanceData.checkOutTime,
                    status: AttendanceStatus.ABSENT, // Will be updated when check-in happens
                    lateMinutes: 0,
                },
        });

        // Return response
        return NextResponse.json({
            message: qrSession.type === QrSessionType.CHECK_IN ? 'Check-in recorded' : 'Check-out recorded',
            date: getDateString(qrSession.date),
            type: qrSession.type,
            attendance: {
                teacherId: attendance.teacherId,
                date: getDateString(attendance.date),
                checkInTime: attendance.checkInTime?.toISOString() || null,
                checkOutTime: attendance.checkOutTime?.toISOString() || null,
                status: attendance.status,
                lateMinutes: attendance.lateMinutes,
            },
        });

    } catch (error) {
        console.error('POST /api/v1/attendance/qr/check error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
