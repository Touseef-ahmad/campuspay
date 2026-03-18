import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
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
      enrollments: { include: { course: true, term: true } },
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
    const { enrollmentDate, ...rest } = updateSchema.parse(body);

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...rest,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
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
