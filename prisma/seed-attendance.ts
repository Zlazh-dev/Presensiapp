import { prisma } from '../lib/prisma';

async function seedAttendance() {
    console.log('🌱 Seeding attendance data...');

    // Create attendance records for teacher ID 1 (Budi Santoso)
    const teacherId = 1;

    const attendanceData = [
        // February 2026
        {
            teacherId,
            date: new Date('2026-02-05T00:00:00'),
            checkInTime: new Date('2026-02-05T06:55:00'),
            checkOutTime: null,
            status: 'PRESENT' as const,
            lateMinutes: 0,
            notes: null,
        },
        {
            teacherId,
            date: new Date('2026-02-04T00:00:00'),
            checkInTime: new Date('2026-02-04T06:50:00'),
            checkOutTime: new Date('2026-02-04T15:05:00'),
            status: 'PRESENT' as const,
            lateMinutes: 0,
            notes: null,
        },
        {
            teacherId,
            date: new Date('2026-02-03T00:00:00'),
            checkInTime: new Date('2026-02-03T07:15:00'),
            checkOutTime: new Date('2026-02-03T15:30:00'),
            status: 'LATE' as const,
            lateMinutes: 15,
            notes: 'Macet di jalan tol',
        },
        {
            teacherId,
            date: new Date('2026-02-02T00:00:00'),
            checkInTime: new Date('2026-02-02T06:58:00'),
            checkOutTime: new Date('2026-02-02T15:00:00'),
            status: 'PRESENT' as const,
            lateMinutes: 0,
            notes: null,
        },
        {
            teacherId,
            date: new Date('2026-02-01T00:00:00'),
            checkInTime: null,
            checkOutTime: null,
            status: 'ABSENT' as const,
            lateMinutes: 0,
            notes: null,
        },
        // January 2026
        {
            teacherId,
            date: new Date('2026-01-31T00:00:00'),
            checkInTime: null,
            checkOutTime: null,
            status: 'LEAVE' as const,
            lateMinutes: 0,
            notes: 'Izin acara keluarga',
        },
        {
            teacherId,
            date: new Date('2026-01-30T00:00:00'),
            checkInTime: new Date('2026-01-30T06:45:00'),
            checkOutTime: new Date('2026-01-30T15:15:00'),
            status: 'PRESENT' as const,
            lateMinutes: 0,
            notes: null,
        },
        {
            teacherId,
            date: new Date('2026-01-29T00:00:00'),
            checkInTime: new Date('2026-01-29T06:52:00'),
            checkOutTime: new Date('2026-01-29T15:10:00'),
            status: 'PRESENT' as const,
            lateMinutes: 0,
            notes: null,
        },
        {
            teacherId,
            date: new Date('2026-01-28T00:00:00'),
            checkInTime: null,
            checkOutTime: null,
            status: 'SICK' as const,
            lateMinutes: 0,
            notes: 'Flu dan demam',
        },
    ];

    // Insert attendance records using upsert to avoid duplicates
    for (const record of attendanceData) {
        await prisma.attendance.upsert({
            where: {
                teacherId_date: {
                    teacherId: record.teacherId,
                    date: record.date,
                },
            },
            update: {},
            create: record,
        });
    }

    console.log(`✅ Created ${attendanceData.length} attendance records for teacher ID ${teacherId}`);
    console.log('✨ Attendance seeding complete!');
}

seedAttendance()
    .catch((e) => {
        console.error('❌ Error seeding attendance:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
