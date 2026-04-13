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
  status: z.string().optional().default("active"),
  fees: z.array(feeSchema).optional(),
  programOfferingId: z.string().min(1, "Class selection is required"),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const programOfferingId = searchParams.get("programOfferingId");

  const students = await prisma.student.findMany({
    where: {
      instituteId: auth.instituteId,
      status: { not: "archived" },
      ...(programOfferingId
        ? {
            enrollments: {
              some: { programOfferingId },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { firstName: "asc" },
    include: {
      studentFees: {
        select: {
          amountDue: true,
          amountPaid: true,
        },
      },
    },
  });

  // Calculate fee aggregates for each student
  const studentsWithFeeAggregates = students.map((student) => {
    const totalDue = student.studentFees.reduce(
      (sum, fee) => sum + Number(fee.amountDue),
      0,
    );
    const totalPaid = student.studentFees.reduce(
      (sum, fee) => sum + Number(fee.amountPaid),
      0,
    );
    const { studentFees, ...rest } = student;
    return {
      ...rest,
      amountPaid: totalPaid,
      balanceDue: totalDue - totalPaid,
    };
  });

  return NextResponse.json(studentsWithFeeAggregates);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const instituteId = auth.instituteId;

  try {
    const body = await req.json();
    const {
      enrollmentDate,
      dateOfBirth,
      fees,
      programOfferingId,
      email,
      ...rest
    } = schema.parse(body);

    // Verify program offering exists and belongs to institute
    const programOffering = await prisma.programOffering.findFirst({
      where: { id: programOfferingId },
      include: { program: true, term: true },
    });
    if (
      !programOffering ||
      programOffering.program.instituteId !== instituteId
    ) {
      return NextResponse.json(
        { error: "Selected class not found" },
        { status: 400 },
      );
    }

    // Create student with fees and enrollment in a transaction
    // Use retry logic to handle race conditions with studentId generation
    const MAX_RETRIES = 5;
    let result;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        result = await prisma.$transaction(async (tx) => {
          // Auto-generate studentId inside transaction: STU-YYYY-NNN
          // studentId is globally unique, so query ALL students (not just this institute)
          const year = new Date().getFullYear();
          const prefix = `STU-${year}-`;

          const lastStudent = await tx.student.findFirst({
            where: {
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
          // Add attempt offset to ensure each retry tries a different number
          const studentId = `${prefix}${String(nextNumber + attempt).padStart(3, "0")}`;

          // Create the student with department from program
          const student = await tx.student.create({
            data: {
              ...rest,
              email: email || undefined,
              studentId,
              department: programOffering.program.department || rest.department,
              enrollmentDate: enrollmentDate
                ? new Date(enrollmentDate)
                : undefined,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
              instituteId,
            },
          });

          // Create enrollment linking student to program offering
          await tx.enrollment.create({
            data: {
              studentId: student.id,
              programOfferingId: programOffering.id,
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
                    type: feeData.type || "one_time",
                    instituteId,
                  },
                });
              }

              // Create StudentFee record associated with the program offering
              await tx.studentFee.create({
                data: {
                  studentId: student.id,
                  feeId: fee.id,
                  amountDue: feeData.amount,
                  dueDate: new Date(), // Default to today, can be customized
                  status: "PENDING",
                  programOfferingId: programOffering.id,
                },
              });
            }
          }

          return student;
        });

        // If we get here, transaction succeeded
        break;
      } catch (txError: unknown) {
        // Check if it's a unique constraint error (Prisma P2002) on studentId
        const isPrismaUniqueError =
          txError !== null &&
          typeof txError === "object" &&
          "code" in txError &&
          txError.code === "P2002";

        if (isPrismaUniqueError && attempt < MAX_RETRIES - 1) {
          // Retry on unique constraint violation
          continue;
        }
        throw txError;
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error("Student creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
