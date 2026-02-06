import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { username: 'admin001' },
        update: {},
        create: {
            username: 'admin001',
            name: 'Admin TU',
            passwordHash: adminPassword,
            role: 'ADMIN',
        },
    });
    console.log('✅ Created admin user:', admin.username);

    // Create teacher users
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacher1 = await prisma.user.upsert({
        where: { username: 'teacher001' },
        update: {},
        create: {
            username: 'teacher001',
            name: 'Budi Santoso',
            passwordHash: teacherPassword,
            role: 'TEACHER',
        },
    });
    console.log('✅ Created teacher user:', teacher1.username);

    // Create sample teachers
    const teachers = [
        {
            nip: '198501012010011001',
            name: 'Budi Santoso',
            subject: 'Matematika',
            fingerprintId: 'FP-001',
        },
        {
            nip: '199002022015022002',
            name: 'Siti Aminah',
            subject: 'Bahasa Indonesia',
            fingerprintId: 'FP-002',
        },
        {
            nip: '198803032012031003',
            name: 'Ahmad Dahlan',
            subject: 'IPA',
            fingerprintId: 'FP-003',
        },
        {
            nip: '199204042018042004',
            name: 'Dewi Sartika',
            subject: 'Bahasa Inggris',
            fingerprintId: 'FP-004',
        },
        {
            nip: '198005052005051005',
            name: 'Ki Hajar',
            subject: 'Sejarah',
            fingerprintId: 'FP-005',
        },
    ];

    for (const teacher of teachers) {
        const created = await prisma.teacher.upsert({
            where: { nip: teacher.nip },
            update: {},
            create: teacher,
        });
        console.log('✅ Created teacher:', created.name);
    }

    console.log('✨ Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
