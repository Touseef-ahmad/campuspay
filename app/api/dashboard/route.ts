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

  const [pendingFees, accounts, recentTransactions] = await Promise.all([
    prisma.studentFee.aggregate({
      where: {
        ...studentInstituteFilter,
        status: { in: ["PENDING", "PARTIAL"] },
      },
      _sum: { amountDue: true },
      _count: true,
    }),
    prisma.financialAccount.findMany({
      where: instituteFilter,
    }),
    prisma.paymentTransaction.aggregate({
      where: { studentFee: studentInstituteFilter },
      _sum: { amountPaid: true },
    }),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return NextResponse.json({
    pendingDues: Number(pendingFees._sum.amountDue ?? 0),
    pendingCount: pendingFees._count,
    totalCollected: Number(recentTransactions._sum.amountPaid ?? 0),
    availableFunds: totalBalance,
    accounts,
  });
}
