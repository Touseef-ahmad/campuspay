import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pendingFees, accounts, recentTransactions] = await Promise.all([
    prisma.studentFee.aggregate({
      where: {
        student: { instituteId: auth.instituteId },
        status: { in: ["PENDING", "PARTIAL"] },
      },
      _sum: { amountDue: true },
      _count: true,
    }),
    prisma.financialAccount.findMany({
      where: { instituteId: auth.instituteId },
    }),
    prisma.paymentTransaction.aggregate({
      where: { studentFee: { student: { instituteId: auth.instituteId } } },
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
