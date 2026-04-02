import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const initializeSchema = z.object({
  sourceOfferingId: z.string(),
  targetOfferingId: z.string(),
  studentIds: z.array(z.string()).min(1),
});

// GET: Fetch enrollments for a source offering (used to populate student selection)
export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sourceOfferingId = searchParams.get("sourceOfferingId");

  if (!sourceOfferingId) {
    return NextResponse.json(
      { error: "Missing sourceOfferingId" },
      { status: 400 },
    );
  }

  // Verify the offering belongs to this institute
  const offering = await prisma.programOffering.findFirst({
    where: {
      id: sourceOfferingId,
      program: { instituteId: auth.instituteId },
    },
  });

  if (!offering) {
    return NextResponse.json({ error: "Offering not found" }, { status: 404 });
  }

  // Fetch enrollments with student info
  const enrollments = await prisma.enrollment.findMany({
    where: { programOfferingId: sourceOfferingId },
    include: {
      student: {
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  return NextResponse.json({ enrollments });
}

// POST: Initialize billing - enroll students in target semester and create student fees
export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { sourceOfferingId, targetOfferingId, studentIds } =
      initializeSchema.parse(body);

    // Verify both offerings belong to this institute
    const [sourceOffering, targetOffering] = await Promise.all([
      prisma.programOffering.findFirst({
        where: {
          id: sourceOfferingId,
          program: { instituteId: auth.instituteId },
        },
        include: { program: true, term: true },
      }),
      prisma.programOffering.findFirst({
        where: {
          id: targetOfferingId,
          program: { instituteId: auth.instituteId },
        },
        include: { program: true, term: true },
      }),
    ]);

    if (!sourceOffering || !targetOffering) {
      return NextResponse.json(
        { error: "Invalid offering(s)" },
        { status: 404 },
      );
    }

    // Verify students belong to this institute
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        instituteId: auth.instituteId,
      },
      select: { id: true },
    });

    if (students.length !== studentIds.length) {
      return NextResponse.json(
        { error: "Some students not found" },
        { status: 400 },
      );
    }

    // Get institute's fee templates to create student fees
    const feeTemplates = await prisma.fee.findMany({
      where: { instituteId: auth.instituteId },
    });

    // Only duplicate per_semester fees; one_time fees should only be charged once
    const perSemesterFees = feeTemplates.filter(
      (f) => f.type === "per_semester",
    );
    const oneTimeFees = feeTemplates.filter((f) => f.type === "one_time");

    // Calculate due date (30 days from target term start date)
    const dueDate = new Date(targetOffering.term.startDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Perform everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create enrollments for target offering (skip if already enrolled)
      const existingEnrollments = await tx.enrollment.findMany({
        where: {
          programOfferingId: targetOfferingId,
          studentId: { in: studentIds },
        },
        select: { studentId: true },
      });

      const alreadyEnrolledIds = new Set(
        existingEnrollments.map((e) => e.studentId),
      );
      const newEnrollmentStudentIds = studentIds.filter(
        (id) => !alreadyEnrolledIds.has(id),
      );

      let enrollmentsCreated = 0;
      if (newEnrollmentStudentIds.length > 0) {
        const enrollmentResult = await tx.enrollment.createMany({
          data: newEnrollmentStudentIds.map((studentId) => ({
            studentId,
            programOfferingId: targetOfferingId,
          })),
        });
        enrollmentsCreated = enrollmentResult.count;
      }

      // 2. Create student fees
      // For recurring fees: check only target offering to avoid duplicates
      const existingTargetFees = await tx.studentFee.findMany({
        where: {
          programOfferingId: targetOfferingId,
          studentId: { in: studentIds },
        },
        select: { studentId: true, feeId: true },
      });

      const existingTargetFeeKeys = new Set(
        existingTargetFees.map((f) => `${f.studentId}-${f.feeId}`),
      );

      // For one-time fees: check ALL student fees (any offering) to see if already charged
      const existingOneTimeFees = await tx.studentFee.findMany({
        where: {
          studentId: { in: studentIds },
          feeId: { in: oneTimeFees.map((f) => f.id) },
        },
        select: { studentId: true, feeId: true },
      });

      const existingOneTimeFeeKeys = new Set(
        existingOneTimeFees.map((f) => `${f.studentId}-${f.feeId}`),
      );

      const studentFeesToCreate: {
        studentId: string;
        feeId: string;
        amountDue: number;
        dueDate: Date;
        programOfferingId: string;
      }[] = [];

      for (const studentId of studentIds) {
        // Add per-semester fees
        for (const fee of perSemesterFees) {
          const key = `${studentId}-${fee.id}`;
          if (!existingTargetFeeKeys.has(key)) {
            studentFeesToCreate.push({
              studentId,
              feeId: fee.id,
              amountDue: Number(fee.defaultAmount),
              dueDate,
              programOfferingId: targetOfferingId,
            });
          }
        }

        // Add one-time fees only if student has NEVER been charged
        for (const fee of oneTimeFees) {
          const key = `${studentId}-${fee.id}`;
          if (!existingOneTimeFeeKeys.has(key)) {
            studentFeesToCreate.push({
              studentId,
              feeId: fee.id,
              amountDue: Number(fee.defaultAmount),
              dueDate,
              programOfferingId: targetOfferingId,
            });
          }
        }
      }

      let feesCreated = 0;
      if (studentFeesToCreate.length > 0) {
        const feeResult = await tx.studentFee.createMany({
          data: studentFeesToCreate,
        });
        feesCreated = feeResult.count;
      }

      return {
        enrollmentsCreated,
        feesCreated,
        studentsProcessed: studentIds.length,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully processed ${result.studentsProcessed} students. Created ${result.enrollmentsCreated} enrollments and ${result.feesCreated} fee records.`,
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });

    console.error("Billing initialization error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
