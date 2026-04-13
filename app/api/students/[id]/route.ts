import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianRelation: z.string().optional(),
  department: z.string().optional(),
  enrollmentDate: z.string().optional(),
  academicYear: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const student = await prisma.student.findFirst({
    where: { id, instituteId: auth.instituteId },
    include: {
      enrollments: {
        include: {
          programOffering: {
            include: { program: true, term: true },
          },
        },
      },
      studentFees: {
        include: { fee: true, payments: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(student);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.student.findFirst({
    where: { id, instituteId: auth.instituteId },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { enrollmentDate, dateOfBirth, email, ...rest } =
      updateSchema.parse(body);

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...rest,
        email: email || null,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
    });

    return NextResponse.json(student);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/students/[id]
 * - If student has payment transactions → Block deletion (suggest archive)
 * - If no payments → Hard delete student + their fees + enrollments
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check student exists and belongs to institute
  const student = await prisma.student.findFirst({
    where: { id, instituteId: auth.instituteId },
    include: {
      studentFees: {
        include: { payments: true },
      },
    },
  });

  if (!student)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if any payments exist
  const hasPayments = student.studentFees.some(
    (fee) => fee.payments.length > 0,
  );

  if (hasPayments) {
    return NextResponse.json(
      {
        error: "Cannot delete student with payment history",
        code: "HAS_PAYMENTS",
        message:
          "This student has recorded payments. Archive them instead to preserve financial records.",
      },
      { status: 400 },
    );
  }

  // No payments - safe to hard delete
  // Delete in order: enrollments, studentFees, then student
  await prisma.$transaction([
    prisma.enrollment.deleteMany({ where: { studentId: id } }),
    prisma.studentFee.deleteMany({ where: { studentId: id } }),
    prisma.student.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/students/[id]
 * Supports archiving/unarchiving students
 * Body: { action: "archive" | "unarchive" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.student.findFirst({
    where: { id, instituteId: auth.instituteId },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  if (action === "archive") {
    const student = await prisma.student.update({
      where: { id },
      data: { status: "archived" },
    });
    return NextResponse.json(student);
  }

  if (action === "unarchive") {
    const student = await prisma.student.update({
      where: { id },
      data: { status: "active" },
    });
    return NextResponse.json(student);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
