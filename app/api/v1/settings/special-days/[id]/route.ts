import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

// DELETE /api/v1/settings/special-days/:id
//   Auth: ADMIN/PRINCIPAL only
//   Behavior: Delete special day by ID
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        // Await params and parse ID
        const { id } = await params;
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
            return NextResponse.json(
                { message: 'Invalid ID format' },
                { status: 400 }
            );
        }

        // Check if exists
        const specialDay = await prisma.specialDay.findUnique({
            where: { id: parsedId },
        });

        if (!specialDay) {
            return NextResponse.json(
                { message: 'Special day not found' },
                { status: 404 }
            );
        }

        // Delete
        await prisma.specialDay.delete({
            where: { id: parsedId },
        });

        return NextResponse.json(
            { message: 'Special day deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('DELETE /api/v1/settings/special-days/:id error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
