import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive(),
  date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    if (data.fromAccountId === data.toAccountId) {
      return NextResponse.json({ error: "Cannot transfer to the same account" }, { status: 400 });
    }

    const from = await prisma.financialAccount.findFirst({
      where: { id: data.fromAccountId, instituteId: auth.instituteId },
    });
    if (!from) return NextResponse.json({ error: "Source account not found" }, { status: 404 });
    if (Number(from.balance) < data.amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const to = await prisma.financialAccount.findFirst({
      where: { id: data.toAccountId, instituteId: auth.instituteId },
    });
    if (!to) return NextResponse.json({ error: "Destination account not found" }, { status: 404 });

    const [transfer] = await prisma.$transaction([
      prisma.accountTransfer.create({
        data: {
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          amount: data.amount,
          instituteId: auth.instituteId,
          date: data.date ? new Date(data.date) : new Date(),
        },
      }),
      prisma.financialAccount.update({
        where: { id: data.fromAccountId },
        data: { balance: { decrement: data.amount } },
      }),
      prisma.financialAccount.update({
        where: { id: data.toAccountId },
        data: { balance: { increment: data.amount } },
      }),
    ]);

    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
