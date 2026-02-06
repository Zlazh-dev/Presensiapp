import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus, FingerprintType } from '@prisma/client';

interface FingerprintLogInput {
    fingerprint_id: string;
    scanned_at: string; // ISO datetime string
    raw_type: 'IN' | 'OUT';
}

interface ImportRequest {
    logs: FingerprintLogInput[];
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

// Helper: Build assignment cache for date range (OPTIMIZED FOR BULK IMPORT)
async function buildScheduleCache(minDate: Date, maxDate: Date): Promise<{
    dateToScheduleMap: Map<string, any>;
    defaultSchedule: any | null;
}> {
    // Fetch all assignments overlapping the date range
    const assignments = await prisma.workScheduleAssignment.findMany({
        where: {
            AND: [
                { startDate: { lte: maxDate } },
                { endDate: { gte: minDate } }
            ]
        },
        include: {
            workSchedule: true
        }
    });

    // Fetch all work schedules (to get default)
    const allSchedules = await prisma.workSchedule.findMany();
    const defaultSchedule = allSchedules.find(s => s.isDefault) || allSchedules[0] || null;

    // Build date → WorkSchedule map
    const dateToScheduleMap = new Map<string, any>();

    // For each date in range, find applicable assignment
    const currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
        const dateStr = getDateString(currentDate);

        // Find assignment that covers this date
        const assignment = assignments.find(a => {
            const assignStart = new Date(a.startDate);
            const assignEnd = new Date(a.endDate);
            assignEnd.setHours(23, 59, 59, 999); // Include end date
            return currentDate >= assignStart && currentDate <= assignEnd;
        });

        if (assignment) {
            dateToScheduleMap.set(dateStr, assignment.workSchedule);
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return { dateToScheduleMap, defaultSchedule };
}

// POST /api/v1/fingerprint/import - Import fingerprint logs and process attendance
export async function POST(request: NextRequest) {
    try {
        const body: ImportRequest = await request.json();

        // Validate input
        if (!body.logs || !Array.isArray(body.logs)) {
            return NextResponse.json(
                { message: 'Invalid request body - logs array required' },
                { status: 400 }
            );
        }

        let imported = 0;
        let skipped = 0;
        const savedLogs: any[] = [];
        let minDate = new Date('9999-12-31');
        let maxDate = new Date('1970-01-01');

        // Step 1: Save raw logs to FingerprintLog table
        for (const log of body.logs) {
            try {
                // Validate log format
                if (!log.fingerprint_id || !log.scanned_at || !log.raw_type) {
                    skipped++;
                    continue;
                }

                if (!['IN', 'OUT'].includes(log.raw_type)) {
                    skipped++;
                    continue;
                }

                const scannedAt = new Date(log.scanned_at);
                if (isNaN(scannedAt.getTime())) {
                    skipped++;
                    continue;
                }

                // Insert to FingerprintLog
                const savedLog = await prisma.fingerprintLog.create({
                    data: {
                        fingerprintId: log.fingerprint_id,
                        scannedAt,
                        rawType: log.raw_type as FingerprintType,
                    },
                });

                savedLogs.push(savedLog);
                imported++;

                // Track date range
                if (scannedAt < minDate) minDate = new Date(scannedAt);
                if (scannedAt > maxDate) maxDate = new Date(scannedAt);
            } catch (err) {
                console.error('Error saving log:', err);
                skipped++;
            }
        }

        // If no logs imported, return early
        if (imported === 0) {
            return NextResponse.json({
                imported: 0,
                skipped,
                processed_date_range: { start: null, end: null },
                samples: []
            });
        }

        // Step 2: Build schedule cache for the date range (SINGLE QUERY)
        const { dateToScheduleMap, defaultSchedule } = await buildScheduleCache(minDate, maxDate);

        if (!defaultSchedule) {
            return NextResponse.json(
                { message: 'No work schedule configured. Please create a default schedule first.' },
                { status: 400 }
            );
        }

        // Step 3: Group logs by teacher and date
        const teacherMap = await prisma.teacher.findMany({
            select: {
                id: true,
                fingerprintId: true,
            },
        });

        const fingerprintToTeacherMap = new Map(
            teacherMap.filter(t => t.fingerprintId).map(t => [t.fingerprintId!, t.id])
        );

        // Group logs: Map<teacherId_date, logs[]>
        const groupedLogs = new Map<string, any[]>();
        for (const log of savedLogs) {
            const teacherId = fingerprintToTeacherMap.get(log.fingerprintId);
            if (!teacherId) continue; // Skip logs without matching teacher

            const dateStr = getDateString(log.scannedAt);
            const key = `${teacherId}_${dateStr}`;

            if (!groupedLogs.has(key)) {
                groupedLogs.set(key, []);
            }
            groupedLogs.get(key)!.push(log);
        }

        // Step 4: Process each group with DYNAMIC schedule per date
        const samples: any[] = [];
        for (const [key, logs] of groupedLogs.entries()) {
            const [teacherIdStr, dateStr] = key.split('_');
            const teacherId = parseInt(teacherIdStr);
            const date = new Date(dateStr + 'T00:00:00');

            // ✅ GET SCHEDULE FOR THIS SPECIFIC DATE (O(1) lookup)
            const schedule = dateToScheduleMap.get(dateStr) || defaultSchedule;

            if (!schedule) {
                console.error(`No schedule found for date ${dateStr}`);
                continue;
            }

            const startTimeMinutes = timeToMinutes(schedule.startTime);
            const tolerance = schedule.lateToleranceMinutes;

            // Sort logs by time
            logs.sort((a, b) => a.scannedAt.getTime() - b.scannedAt.getTime());

            // Find check-in (first IN) and check-out (last OUT)
            const checkInLog = logs.find(l => l.rawType === 'IN');
            const checkOutLog = [...logs].reverse().find(l => l.rawType === 'OUT');

            const checkInTime = checkInLog?.scannedAt || null;
            const checkOutTime = checkOutLog?.scannedAt || null;

            // Calculate status using schedule-specific parameters
            let status: AttendanceStatus = AttendanceStatus.ABSENT;
            let lateMinutes = 0;

            if (checkInTime) {
                // Use UTC hours/minutes to avoid timezone issues
                const checkInMinutes = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes();
                const allowedTime = startTimeMinutes + tolerance;

                if (checkInMinutes <= allowedTime) {
                    status = AttendanceStatus.PRESENT;
                } else {
                    status = AttendanceStatus.LATE;
                    lateMinutes = Math.max(0, checkInMinutes - allowedTime);
                }
            }

            // Upsert attendance record
            const attendance = await prisma.attendance.upsert({
                where: {
                    teacherId_date: {
                        teacherId,
                        date,
                    },
                },
                update: {
                    checkInTime,
                    checkOutTime,
                    status,
                    lateMinutes,
                },
                create: {
                    teacherId,
                    date,
                    checkInTime,
                    checkOutTime,
                    status,
                    lateMinutes,
                },
                include: {
                    teacher: {
                        select: {
                            name: true,
                            nip: true,
                        },
                    },
                },
            });

            // Add to samples (limit to 5)
            if (samples.length < 5) {
                samples.push({
                    teacher_name: attendance.teacher.name,
                    teacher_nip: attendance.teacher.nip,
                    date: getDateString(attendance.date),
                    check_in: checkInTime ? checkInTime.toISOString().substring(11, 16) : null,
                    check_out: checkOutTime ? checkOutTime.toISOString().substring(11, 16) : null,
                    status: status.toLowerCase(),
                    late_minutes: lateMinutes,
                    schedule_used: schedule.name, // ✅ Show which schedule was used
                });
            }
        }

        // Response
        return NextResponse.json({
            imported,
            skipped,
            processed_date_range: {
                start: imported > 0 ? getDateString(minDate) : null,
                end: imported > 0 ? getDateString(maxDate) : null,
            },
            samples,
        });
    } catch (error) {
        console.error('POST /api/v1/fingerprint/import error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
