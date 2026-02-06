import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TeacherStatus } from '@prisma/client';

// PUT /api/v1/teachers/[id] - Update a teacher
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const id = Number(params.id);

        if (Number.isNaN(id) || id <= 0) {
            return NextResponse.json(
                { message: 'Invalid teacher ID' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { nip, name, subject, fingerprint_id, status } = body;

        // Check if teacher exists
        const existing = await prisma.teacher.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { message: 'Teacher not found' },
                { status: 404 }
            );
        }

        // Build update data
        const updateData: any = {};
        if (nip !== undefined) updateData.nip = nip;
        if (name !== undefined) updateData.name = name;
        if (subject !== undefined) updateData.subject = subject;
        if (fingerprint_id !== undefined) updateData.fingerprintId = fingerprint_id || null;
        if (status !== undefined) {
            updateData.status = status === 'inactive' ? TeacherStatus.INACTIVE : TeacherStatus.ACTIVE;
        }

        // Update teacher
        const teacher = await prisma.teacher.update({
            where: { id },
            data: updateData,
        });

        // Transform response
        const response = {
            id: teacher.id,
            nip: teacher.nip,
            name: teacher.name,
            subject: teacher.subject,
            fingerprint_id: teacher.fingerprintId || '',
            status: teacher.status.toLowerCase(),
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('PUT /api/v1/teachers/[id] error:', error);

        // Handle unique constraint violation
        if (error?.code === 'P2002') {
            return NextResponse.json(
                { message: 'Teacher with this NIP already exists' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/v1/teachers/[id] - Delete a teacher
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const id = Number(params.id);

        if (Number.isNaN(id) || id <= 0) {
            return NextResponse.json(
                { message: 'Invalid teacher ID' },
                { status: 400 }
            );
        }

        // Check if teacher exists
        const existing = await prisma.teacher.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { message: 'Teacher not found' },
                { status: 404 }
            );
        }

        // Delete teacher (CASCADE will delete related attendance records)
        await prisma.teacher.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Teacher deleted' });
    } catch (error) {
        console.error('DELETE /api/v1/teachers/[id] error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
