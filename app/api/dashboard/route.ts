import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const instituteFilter = auth.instituteId
    ? { instituteId: auth.instituteId }
    : {};

  const studentInstituteFilter = auth.instituteId
    ? { student: { instituteId: auth.instituteId } }
    : {};

  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  // Get last month date range for comparison
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  );

  const [
    pendingFees,
    accounts,
    totalPayments,
    monthlyPayments,
    lastMonthPayments,
    totalExpenses,
  ] = await Promise.all([
    // Total pending fees
    prisma.studentFee.aggregate({
      where: {
        ...studentInstituteFilter,
        status: { in: ["PENDING", "PARTIAL"] },
      },
      _sum: { amountDue: true },
      _count: true,
    }),
    // All accounts
    prisma.financialAccount.findMany({
      where: instituteFilter,
    }),
    // Total payments (all time)
    prisma.paymentTransaction.aggregate({
      where: { studentFee: studentInstituteFilter },
      _sum: { amountPaid: true },
    }),
    // This month's payments
    prisma.paymentTransaction.aggregate({
      where: {
        studentFee: studentInstituteFilter,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amountPaid: true },
    }),
    // Last month's payments
    prisma.paymentTransaction.aggregate({
      where: {
        studentFee: studentInstituteFilter,
        date: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amountPaid: true },
    }),
    // Total expenses (all time)
    prisma.expense.aggregate({
      where: instituteFilter,
      _sum: { amount: true },
    }),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const monthlyRevenue = Number(monthlyPayments._sum.amountPaid ?? 0);
  const lastMonthRevenue = Number(lastMonthPayments._sum.amountPaid ?? 0);

  // Calculate month-over-month change
  const revenueChange =
    lastMonthRevenue > 0
      ? (
          ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) *
          100
        ).toFixed(1)
      : 0;

  return NextResponse.json({
    // KPI data
    monthlyRevenue,
    revenueChange: Number(revenueChange),
    pendingDues: Number(pendingFees._sum.amountDue ?? 0),
    pendingCount: pendingFees._count,
    totalCollected: Number(totalPayments._sum.amountPaid ?? 0),
    totalExpenses: Number(totalExpenses._sum.amount ?? 0),
    availableFunds: totalBalance,
    accounts,
  });
}
