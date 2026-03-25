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

  const instituteId = auth.instituteId;

  try {
    const body = await req.json();
    const { enrollmentDate, fees, ...rest } = schema.parse(body);

    // Auto-generate studentId: STU-YYYY-NNN
    const year = new Date().getFullYear();
    const count = await prisma.student.count({
      where: { instituteId },
    });
    const studentId = `STU-${year}-${String(count + 1).padStart(3, "0")}`;

    // Create student with fees in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the student
      const student = await tx.student.create({
        data: {
          ...rest,
          studentId,
          enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
          instituteId,
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
