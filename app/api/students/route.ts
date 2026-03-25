import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const feeSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  type: z.string().optional().default("custom"),
});

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  department: z.string().optional(),
  enrollmentDate: z.string().optional(),
  academicYear: z.string().optional(),
  status: z.string().optional().default("active"),
  fees: z.array(feeSchema).optional(),
  courseId: z.string().min(1, "Program is required"),
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
      status: { not: "archived" },
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

  const instituteId = auth.instituteId;

  try {
    const body = await req.json();
    const { enrollmentDate, fees, courseId, ...rest } = schema.parse(body);

    // Verify course exists and belongs to institute
    const course = await prisma.course.findFirst({
      where: { id: courseId, instituteId },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Selected program not found" },
        { status: 400 },
      );
    }

    // Auto-generate studentId: STU-YYYY-NNN
    // Find the highest existing number for this year to avoid duplicates
    const year = new Date().getFullYear();
    const prefix = `STU-${year}-`;

    const lastStudent = await prisma.student.findFirst({
      where: {
        instituteId,
        studentId: { startsWith: prefix },
      },
      orderBy: { studentId: "desc" },
      select: { studentId: true },
    });

    let nextNumber = 1;
    if (lastStudent?.studentId) {
      const match = lastStudent.studentId.match(/STU-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const studentId = `${prefix}${String(nextNumber).padStart(3, "0")}`;

    // Find or create a default academic term for enrollment
    let term = await prisma.academicTerm.findFirst({
      where: { instituteId },
      orderBy: { startDate: "desc" },
    });
    if (!term) {
      // Create a default term if none exists
      term = await prisma.academicTerm.create({
        data: {
          name: `${year} Academic Year`,
          startDate: new Date(`${year}-01-01`),
          endDate: new Date(`${year}-12-31`),
          instituteId,
        },
      });
    }

    // Create student with fees and enrollment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the student with department from course
      const student = await tx.student.create({
        data: {
          ...rest,
          studentId,
          department: course.department || rest.department,
          enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
          instituteId,
        },
      });

      // Create enrollment linking student to course/program
      await tx.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          termId: term.id,
        },
      });

      // If fees are provided, create Fee templates if they don't exist and StudentFee records
      if (fees && fees.length > 0) {
        for (const feeData of fees) {
          // Find or create the fee template
          let fee = await tx.fee.findFirst({
            where: {
              instituteId,
              name: feeData.name,
            },
          });

          if (!fee) {
            fee = await tx.fee.create({
              data: {
                name: feeData.name,
                defaultAmount: feeData.amount,
                type: feeData.type || "custom",
                instituteId,
              },
            });
          }

          // Create StudentFee record
          await tx.studentFee.create({
            data: {
              studentId: student.id,
              feeId: fee.id,
              amountDue: feeData.amount,
              dueDate: new Date(), // Default to today, can be customized
              status: "PENDING",
            },
          });
        }
      }

      return student;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
