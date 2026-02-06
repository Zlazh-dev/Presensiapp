import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

// GET /api/v1/settings/special-days
//   Query: month=YYYY-MM (optional) to filter by month
//   Auth: ADMIN/PRINCIPAL only
//   Response: List of special days sorted by date ASC
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Auth check
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json(
                { message: 'Unauthenticated' },
                { status: 401 }
            );
        }

        const payload = await verifyAuthToken(token);
        if (!payload) {
            return NextResponse.json(
                { message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Fetch user and check role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
            return NextResponse.json(
                { message: 'Only ADMIN or PRINCIPAL can access this endpoint' },
                { status: 403 }
            );
        }

        // Build filter
        const month = searchParams.get('month'); // Format: YYYY-MM
        const where: any = {};

        if (month) {
            // Validate month format
            if (!/^\d{4}-\d{2}$/.test(month)) {
                return NextResponse.json(
                    { message: 'Invalid month format. Use YYYY-MM' },
                    { status: 400 }
                );
            }

            const [year, monthStr] = month.split('-');
            const yearNum = parseInt(year);
            const monthNum = parseInt(monthStr);

            // First day of month
            const startDate = new Date(yearNum, monthNum - 1, 1);
            // First day of next month
            const endDate = new Date(yearNum, monthNum, 1);

            where.date = {
                gte: startDate,
                lt: endDate,
            };
        }

        // Fetch special days
        const specialDays = await prisma.specialDay.findMany({
            where,
            orderBy: {
                date: 'asc',
            },
        });

        // Format response
        const data = specialDays.map((day) => ({
            id: day.id,
            date: day.date.toISOString().split('T')[0], // YYYY-MM-DD
            name: day.name,
            type: day.type,
            start_time: day.startTime,
            end_time: day.endTime,
            is_overtime: day.isOvertime,
            notes: day.notes,
            created_at: day.createdAt.toISOString(),
            updated_at: day.updatedAt.toISOString(),
        }));

        return NextResponse.json({ data });
    } catch (error) {
        console.error('GET /api/v1/settings/special-days error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/v1/settings/special-days
//   Body: { date: "YYYY-MM-DD", name, type, startTime?, endTime?, isOvertime?, notes? }
//   Auth: ADMIN/PRINCIPAL only
//   Behavior: Upsert by date
export async function POST(request: NextRequest) {
    try {
        // Auth check
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json(
                { message: 'Unauthenticated' },
                { status: 401 }
            );
        }

        const payload = await verifyAuthToken(token);
        if (!payload) {
            return NextResponse.json(
                { message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Fetch user and check role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
            return NextResponse.json(
                { message: 'Only ADMIN or PRINCIPAL can access this endpoint' },
                { status: 403 }
            );
        }

        // Parse body
        const body = await request.json();
        const { date, name, type, startTime, endTime, isOvertime, notes } = body;

        // Validate required fields
        if (!date || !name || !type) {
            return NextResponse.json(
                { message: 'Missing required fields: date, name, type' },
                { status: 400 }
            );
        }

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json(
                { message: 'Invalid date format. Use YYYY-MM-DD' },
                { status: 400 }
            );
        }

        // Validate time format if provided (HH:mm)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (startTime && !timeRegex.test(startTime)) {
            return NextResponse.json(
                { message: 'Invalid startTime format. Use HH:mm (e.g., 08:00)' },
                { status: 400 }
            );
        }
        if (endTime && !timeRegex.test(endTime)) {
            return NextResponse.json(
                { message: 'Invalid endTime format. Use HH:mm (e.g., 17:00)' },
                { status: 400 }
            );
        }

        // Parse date
        const dateObj = new Date(date + 'T00:00:00');

        // Upsert special day
        const specialDay = await prisma.specialDay.upsert({
            where: { date: dateObj },
            update: {
                name,
                type,
                startTime: startTime || null,
                endTime: endTime || null,
                isOvertime: isOvertime !== undefined ? isOvertime : false,
                notes: notes || null,
            },
            create: {
                date: dateObj,
                name,
                type,
                startTime: startTime || null,
                endTime: endTime || null,
                isOvertime: isOvertime !== undefined ? isOvertime : false,
                notes: notes || null,
            },
        });

        // Format response
        const data = {
            id: specialDay.id,
            date: specialDay.date.toISOString().split('T')[0],
            name: specialDay.name,
            type: specialDay.type,
            start_time: specialDay.startTime,
            end_time: specialDay.endTime,
            is_overtime: specialDay.isOvertime,
            notes: specialDay.notes,
            created_at: specialDay.createdAt.toISOString(),
            updated_at: specialDay.updatedAt.toISOString(),
        };

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/settings/special-days error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
