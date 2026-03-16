import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  amountPaid: z.number().positive(),
  method: z.string().min(1),
  financialAccountId: z.string(),
  date: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: studentFeeId } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verify the student fee belongs to this institute
    const studentFee = await prisma.studentFee.findFirst({
      where: { id: studentFeeId, student: { instituteId: auth.instituteId } },
      include: { payments: true },
    });
    if (!studentFee) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (studentFee.status === "PAID") {
      return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
    }

    // Verify the account belongs to this institute
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.financialAccountId, instituteId: auth.instituteId },
    });
    if (!account) return NextResponse.json({ error: "Financial account not found" }, { status: 404 });

    const totalPaid = studentFee.payments.reduce((s, p) => s + Number(p.amountPaid), 0);
    const remaining = Number(studentFee.amountDue) - totalPaid;

    if (data.amountPaid > remaining) {
      return NextResponse.json({ error: `Amount exceeds remaining balance of ${remaining}` }, { status: 400 });
    }

    const newTotalPaid = totalPaid + data.amountPaid;
    let newStatus: "PENDING" | "PARTIAL" | "PAID" = "PARTIAL";
    if (newTotalPaid >= Number(studentFee.amountDue)) newStatus = "PAID";
    if (newTotalPaid === 0) newStatus = "PENDING";

    const [payment] = await prisma.$transaction([
      prisma.paymentTransaction.create({
        data: {
          studentFeeId,
          financialAccountId: data.financialAccountId,
          amountPaid: data.amountPaid,
          method: data.method,
          date: data.date ? new Date(data.date) : new Date(),
        },
      }),
      prisma.studentFee.update({ where: { id: studentFeeId }, data: { status: newStatus } }),
      prisma.financialAccount.update({
        where: { id: data.financialAccountId },
        data: { balance: { increment: data.amountPaid } },
      }),
    ]);

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
