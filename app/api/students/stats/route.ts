import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const instituteId = auth.instituteId;

  // Total students (excluding archived)
  const total = await prisma.student.count({
    where: { instituteId, status: { not: "archived" } },
  });

  // Active students
  const active = await prisma.student.count({
    where: { instituteId, status: "active" },
  });

  // Students with due fees (students who have at least one StudentFee with status not PAID)
  const studentsWithDueFees = await prisma.student.count({
    where: {
      instituteId,
      status: { not: "archived" },
      studentFees: {
        some: {
          status: { not: "PAID" },
        },
      },
    },
  });

  // Total fees due (sum of all unpaid amounts, excluding archived students)
  // Calculate actual balance: amountDue - amountPaid
  const feesAggregation = await prisma.studentFee.aggregate({
    where: {
      student: { instituteId, status: { not: "archived" } },
      status: { not: "PAID" },
    },
    _sum: {
      amountDue: true,
      amountPaid: true,
    },
  });

  const totalFeesDue = Number(feesAggregation._sum?.amountDue || 0);
  const totalPaidOnDues = Number(
    (feesAggregation._sum as { amountPaid?: unknown })?.amountPaid || 0,
  );
  const actualFeesDue = totalFeesDue - totalPaidOnDues;

  // Total payments received
  const paymentsAggregation = await prisma.paymentTransaction.aggregate({
    where: {
      studentFee: {
        student: { instituteId },
      },
    },
    _sum: {
      amountPaid: true,
    },
  });

  return NextResponse.json({
    total,
    active,
    withDueFees: studentsWithDueFees,
    totalFeesDue: actualFeesDue,
    totalPaymentsReceived: Number(paymentsAggregation._sum.amountPaid || 0),
  });
}
