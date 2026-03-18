import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  department: z.string().optional(),
  enrollmentDate: z.string().optional(),
  academicYear: z.string().optional(),
  status: z.string().optional().default("active"),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";

  const students = await prisma.student.findMany({
    where: {
      instituteId: auth.instituteId,
      OR: search
        ? [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { enrollmentDate, ...rest } = schema.parse(body);

    // Auto-generate studentId: STU-YYYY-NNN
    const year = new Date().getFullYear();
    const count = await prisma.student.count({
      where: { instituteId: auth.instituteId },
    });
    const studentId = `STU-${year}-${String(count + 1).padStart(3, "0")}`;

    const student = await prisma.student.create({
      data: {
        ...rest,
        studentId,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
        instituteId: auth.instituteId,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
