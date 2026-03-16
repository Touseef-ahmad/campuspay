import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  categoryId: z.string(),
  financialAccountId: z.string(),
  date: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expenses = await prisma.expense.findMany({
    where: { instituteId: auth.instituteId },
    include: { category: true, financialAccount: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const account = await prisma.financialAccount.findFirst({
      where: { id: data.financialAccountId, instituteId: auth.instituteId },
    });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (Number(account.balance) < data.amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const [expense] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          title: data.title,
          amount: data.amount,
          categoryId: data.categoryId,
          financialAccountId: data.financialAccountId,
          instituteId: auth.instituteId,
          date: data.date ? new Date(data.date) : new Date(),
        },
        include: { category: true, financialAccount: true },
      }),
      prisma.financialAccount.update({
        where: { id: data.financialAccountId },
        data: { balance: { decrement: data.amount } },
      }),
    ]);

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
