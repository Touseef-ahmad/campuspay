import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  };

  const studentInstituteFilter = auth.instituteId
    ? { student: { instituteId: auth.instituteId } }
    : {};

  const instituteFilter = auth.instituteId
    ? { instituteId: auth.instituteId }
    : {};

  const [payments, expenses] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: {
        ...(auth.instituteId
          ? { studentFee: { student: { instituteId: auth.instituteId } } }
          : {}),
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      include: {
        studentFee: { include: { student: true, fee: true } },
        financialAccount: true,
      },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: {
        ...instituteFilter,
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      include: { category: true, financialAccount: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const feed = [
    ...payments.map((p) => ({
      id: p.id,
      type: "credit" as const,
      amount: Number(p.amountPaid),
      date: p.date,
      description: `Payment from ${p.studentFee.student.firstName} ${p.studentFee.student.lastName} — ${p.studentFee.fee.name}`,
      account: p.financialAccount.name,
      method: p.method,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "debit" as const,
      amount: Number(e.amount),
      date: e.date,
      description: e.title,
      account: e.financialAccount.name,
      category: e.category.name,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(feed);
}
