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

  // Support optional from/to query params; fall back to current month
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  const startOfMonth = fromParam
    ? new Date(fromParam)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = toParam
    ? new Date(new Date(toParam).setHours(23, 59, 59, 999))
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Previous period of same length for comparison
  const periodMs = endOfMonth.getTime() - startOfMonth.getTime();
  const startOfLastMonth = new Date(startOfMonth.getTime() - periodMs - 1);
  const endOfLastMonth = new Date(startOfMonth.getTime() - 1);

  const [
    institute,
    pendingFees,
    accounts,
    totalPayments,
    monthlyPayments,
    lastMonthPayments,
    totalExpenses,
  ] = await Promise.all([
    // Institute name
    auth.instituteId
      ? prisma.institute.findUnique({
          where: { id: auth.instituteId },
          select: { name: true },
        })
      : Promise.resolve(null),
    // Total pending fees (with due and paid amounts)
    prisma.studentFee.aggregate({
      where: {
        ...studentInstituteFilter,
        status: { in: ["PENDING", "PARTIAL"] },
      },
      _sum: { amountDue: true, amountPaid: true },
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
    // Period payments
    prisma.paymentTransaction.aggregate({
      where: {
        studentFee: studentInstituteFilter,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amountPaid: true },
    }),
    // Previous period payments
    prisma.paymentTransaction.aggregate({
      where: {
        studentFee: studentInstituteFilter,
        date: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amountPaid: true },
    }),
    // Period expenses
    prisma.expense.aggregate({
      where: {
        ...instituteFilter,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const monthlyRevenue = Number(monthlyPayments._sum.amountPaid ?? 0);
  const lastMonthRevenue = Number(lastMonthPayments._sum.amountPaid ?? 0);

  // Calculate actual pending dues (amountDue - amountPaid)
  const totalDue = Number(pendingFees._sum?.amountDue ?? 0);
  const totalPaidOnPending = Number(
    (pendingFees._sum as { amountPaid?: unknown })?.amountPaid ?? 0,
  );
  const actualPendingDues = totalDue - totalPaidOnPending;

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
    instituteName: institute?.name ?? null,
    monthlyRevenue,
    revenueChange: Number(revenueChange),
    pendingDues: actualPendingDues,
    pendingCount: pendingFees._count,
    totalCollected: Number(totalPayments._sum.amountPaid ?? 0),
    totalExpenses: Number(totalExpenses._sum.amount ?? 0),
    availableFunds: totalBalance,
    accounts,
  });
}
