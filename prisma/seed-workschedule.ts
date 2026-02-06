import { prisma } from '../lib/prisma';

async function seedWorkSchedule() {
    console.log('🌱 Seeding work schedule...');

    // Create work schedule
    const schedule = await prisma.workSchedule.upsert({
        where: { id: 1 },
        update: {},
        create: {
            startTime: '07:00',
            endTime: '15:00',
            lateToleranceMinutes: 10,
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        },
    });

    console.log('✅ Work schedule created:', schedule);
    console.log('   Start Time:', schedule.startTime);
    console.log('   Late Tolerance:', schedule.lateToleranceMinutes, 'minutes');
    console.log('✨ Work schedule seeding complete!');
}

seedWorkSchedule()
    .catch((e) => {
        console.error('❌ Error seeding work schedule:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
