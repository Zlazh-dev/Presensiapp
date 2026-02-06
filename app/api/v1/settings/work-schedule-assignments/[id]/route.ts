import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/v1/settings/work-schedule-assignments/[id] - Delete assignment
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const assignmentId = parseInt(id);

        if (isNaN(assignmentId)) {
            return NextResponse.json(
                { message: 'Invalid assignment ID' },
                { status: 400 }
            );
        }

        // Check if assignment exists
        const existing = await prisma.workScheduleAssignment.findUnique({
            where: { id: assignmentId }
        });

        if (!existing) {
            return NextResponse.json(
                { message: 'Assignment not found' },
                { status: 404 }
            );
        }

        // Delete assignment
        await prisma.workScheduleAssignment.delete({
            where: { id: assignmentId }
        });

        return NextResponse.json({
            message: 'Assignment deleted successfully'
        });
    } catch (error) {
        console.error('DELETE /api/v1/settings/work-schedule-assignments/[id] error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
