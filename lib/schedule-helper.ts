import { prisma } from '@/lib/prisma';

/**
 * Helper function to get the effective work schedule for a given date.
 * 
 * This function checks for special day configurations and returns the appropriate
 * schedule, either from a SpecialDay or from the regular WorkSchedule.
 * 
 * TODO: Integration points for attendance calculation:
 * 1. In attendance check-in/out endpoints (QR, fingerprint), call this function
 *    to get the effective schedule before calculating late minutes and status.
 * 2. In attendance report generation, use this to correctly label overtime hours.
 * 3. Consider adding a field to Attendance model to track if it's a special day
 *    (e.g., `specialDayId Int?` with relation to SpecialDay).
 * 
 * @param date - The date to check (Date object or string "YYYY-MM-DD")
 * @param teacherId - Optional teacher ID for future per-teacher schedule customization
 * @returns Effective schedule object or null if no schedule found
 */
export async function getEffectiveScheduleForDate(
    date: Date | string,
    teacherId?: number
): Promise<{
    source: 'special_day' | 'regular_schedule' | 'none';
    startTime: string | null;
    endTime: string | null;
    lateToleranceMinutes: number;
    isOvertime: boolean;
    specialDayInfo?: {
        id: number;
        name: string;
        type: string;
        notes: string | null;
    };
} | null> {
    try {
        // Normalize date to Date object at midnight
        const dateObj = typeof date === 'string'
            ? new Date(date + 'T00:00:00')
            : new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // Step 1: Check for special day configuration
        const specialDay = await prisma.specialDay.findUnique({
            where: { date: dateObj },
        });

        if (specialDay) {
            // TODO: Handle different special day types:
            // - "HOLIDAY": Return schedule with indication that no work is expected
            // - "CUSTOM_SCHEDULE": Use startTime/endTime from special day
            // - "OVERTIME": Regular schedule + overtime flag for hours outside normal

            if (specialDay.type === 'HOLIDAY') {
                // No work expected on holidays
                return {
                    source: 'special_day',
                    startTime: null,
                    endTime: null,
                    lateToleranceMinutes: 0,
                    isOvertime: false,
                    specialDayInfo: {
                        id: specialDay.id,
                        name: specialDay.name,
                        type: specialDay.type,
                        notes: specialDay.notes,
                    },
                };
            }

            if (specialDay.type === 'CUSTOM_SCHEDULE' && specialDay.startTime && specialDay.endTime) {
                // Use custom schedule times
                return {
                    source: 'special_day',
                    startTime: specialDay.startTime,
                    endTime: specialDay.endTime,
                    lateToleranceMinutes: 15, // TODO: Make this configurable or inherit from regular schedule
                    isOvertime: specialDay.isOvertime,
                    specialDayInfo: {
                        id: specialDay.id,
                        name: specialDay.name,
                        type: specialDay.type,
                        notes: specialDay.notes,
                    },
                };
            }

            if (specialDay.type === 'OVERTIME') {
                // TODO: For overtime days, we might want to return BOTH regular schedule
                // and overtime schedule. For now, just flag it as overtime.
                // The attendance calculation logic should use regular schedule for
                // PRESENT/LATE status, and mark hours outside regular schedule as overtime.

                // Fallback to regular schedule but with overtime flag
                // (continue to step 2 below, but we'll add the overtime flag)
            }
        }

        // Step 2: Get regular work schedule
        // TODO: This is a simplified version. In production, you should:
        // 1. Check WorkScheduleAssignment to find active assignment for this date
        // 2. Get the WorkSchedule referenced by that assignment
        // 3. Check if the day of week is in workingDays array

        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dayMapping: Record<string, string> = {
            'Mon': 'Mon',
            'Tue': 'Tue',
            'Wed': 'Wed',
            'Thu': 'Thu',
            'Fri': 'Fri',
            'Sat': 'Sat',
            'Sun': 'Sun',
        };
        const dayCode = dayMapping[dayOfWeek];

        // Get default schedule (for now, just get the first default schedule)
        const defaultSchedule = await prisma.workSchedule.findFirst({
            where: { isDefault: true },
        });

        if (!defaultSchedule) {
            // No default schedule found
            return null;
        }

        // Check if this day is a working day
        if (!defaultSchedule.workingDays.includes(dayCode)) {
            // Not a working day according to regular schedule
            // But if there's a special day (overtime), still return schedule
            if (specialDay && specialDay.type === 'OVERTIME') {
                return {
                    source: 'special_day',
                    startTime: specialDay.startTime || defaultSchedule.startTime,
                    endTime: specialDay.endTime || defaultSchedule.endTime,
                    lateToleranceMinutes: defaultSchedule.lateToleranceMinutes,
                    isOvertime: true,
                    specialDayInfo: {
                        id: specialDay.id,
                        name: specialDay.name,
                        type: specialDay.type,
                        notes: specialDay.notes,
                    },
                };
            }
            return null;
        }

        // Return regular schedule
        // If there was an OVERTIME special day, flag it
        const result = {
            source: 'regular_schedule' as const,
            startTime: defaultSchedule.startTime,
            endTime: defaultSchedule.endTime,
            lateToleranceMinutes: defaultSchedule.lateToleranceMinutes,
            isOvertime: false,
        };

        if (specialDay && specialDay.type === 'OVERTIME') {
            return {
                ...result,
                source: 'special_day' as const,
                isOvertime: true,
                specialDayInfo: {
                    id: specialDay.id,
                    name: specialDay.name,
                    type: specialDay.type,
                    notes: specialDay.notes,
                },
            };
        }

        return result;
    } catch (error) {
        console.error('getEffectiveScheduleForDate error:', error);
        return null;
    }
}

/**
 * TODO: Future enhancement - Calculate overtime hours
 * 
 * This function should calculate how many hours fall outside the regular schedule
 * and should be counted as overtime.
 * 
 * @param checkInTime - Actual check-in timestamp
 * @param checkOutTime - Actual check-out timestamp
 * @param regularStartTime - Regular schedule start time "HH:mm"
 * @param regularEndTime - Regular schedule end time "HH:mm"
 * @returns Object with regular hours and overtime hours
 */
export function calculateOvertimeHours(
    checkInTime: Date,
    checkOutTime: Date,
    regularStartTime: string,
    regularEndTime: string
): {
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
} {
    // TODO: Implement overtime calculation logic
    // This is a placeholder for future implementation

    const totalMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
    const totalHours = totalMinutes / 60;

    return {
        regularHours: totalHours,
        overtimeHours: 0,
        totalHours,
    };
}
