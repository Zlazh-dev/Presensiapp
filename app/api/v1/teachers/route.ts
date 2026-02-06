import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TeacherStatus } from '@prisma/client';

// GET /api/v1/teachers - Get all teachers with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusParam = searchParams.get('status');

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (statusParam && (statusParam === 'active' || statusParam === 'inactive')) {
      where.status = statusParam.toUpperCase() as TeacherStatus;
    }

    // Fetch teachers
    const teachers = await prisma.teacher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Transform response to match frontend expectations
    const data = teachers.map((teacher) => ({
      id: teacher.id,
      nip: teacher.nip,
      name: teacher.name,
      subject: teacher.subject,
      fingerprint_id: teacher.fingerprintId || '',
      status: teacher.status.toLowerCase(),
    }));

    return NextResponse.json({
      data,
      meta: {
        page: 1,
        per_page: data.length,
        total: data.length,
      },
    });
  } catch (error) {
    console.error('GET /api/v1/teachers error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/teachers - Create a new teacher
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nip, name, subject, fingerprint_id, status } = body;

    // Validate required fields
    if (!nip || !name || !subject) {
      return NextResponse.json(
        { message: 'NIP, name, and subject are required' },
        { status: 400 }
      );
    }

    // Check if NIP already exists
    const existing = await prisma.teacher.findUnique({
      where: { nip },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Teacher with this NIP already exists' },
        { status: 400 }
      );
    }

    // Create teacher
    const teacher = await prisma.teacher.create({
      data: {
        nip,
        name,
        subject,
        fingerprintId: fingerprint_id || null,
        status: status === 'inactive' ? TeacherStatus.INACTIVE : TeacherStatus.ACTIVE,
      },
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

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/teachers error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
