import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const paymentItemSchema = z.object({
  studentFeeId: z.string(),
  amount: z.number().positive(),
});

const schema = z.object({
  studentId: z.string(),
  payments: z.array(paymentItemSchema).min(1),
  method: z.string().optional().default("cash"),
});

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verify student belongs to institute
    const student = await prisma.student.findFirst({
      where: { id: data.studentId, instituteId: auth.instituteId },
    });
    if (!student)
      return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Find default account
    const defaultAccount = await prisma.financialAccount.findFirst({
      where: { instituteId: auth.instituteId, isDefault: true },
    });
    if (!defaultAccount) {
      return NextResponse.json(
        {
          error:
            "No default account found. Please set up a default financial account before processing payments.",
        },
        { status: 400 },
      );
    }

    // Validate all student fees exist and belong to this student
    const studentFeeIds = data.payments.map((p) => p.studentFeeId);
    const studentFees = await prisma.studentFee.findMany({
      where: {
        id: { in: studentFeeIds },
        studentId: data.studentId,
      },
      include: { payments: true },
    });

    if (studentFees.length !== studentFeeIds.length) {
      return NextResponse.json(
        {
          error: "One or more fees not found or do not belong to this student",
        },
        { status: 400 },
      );
    }

    // Validate payment amounts don't exceed remaining balances
    for (const paymentItem of data.payments) {
      const studentFee = studentFees.find(
        (sf) => sf.id === paymentItem.studentFeeId,
      );
      if (!studentFee) continue;

      const totalPaid = studentFee.payments.reduce(
        (s, p) => s + Number(p.amountPaid),
        0,
      );
      const remaining = Number(studentFee.amountDue) - totalPaid;

      if (paymentItem.amount > remaining) {
        return NextResponse.json(
          {
            error: `Payment amount for fee exceeds remaining balance of $${remaining.toFixed(2)}`,
          },
          { status: 400 },
        );
      }
    }

    // Process all payments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdPayments = [];
      let totalPaymentAmount = 0;

      for (const paymentItem of data.payments) {
        const studentFee = studentFees.find(
          (sf) => sf.id === paymentItem.studentFeeId,
        )!;
        const previousPaid = studentFee.payments.reduce(
          (s, p) => s + Number(p.amountPaid),
          0,
        );
        const newTotalPaid = previousPaid + paymentItem.amount;

        // Determine new status
        let newStatus: "PENDING" | "PARTIAL" | "PAID" = "PARTIAL";
        if (newTotalPaid >= Number(studentFee.amountDue)) newStatus = "PAID";
        if (newTotalPaid === 0) newStatus = "PENDING";

        // Create payment transaction
        const payment = await tx.paymentTransaction.create({
          data: {
            studentFeeId: paymentItem.studentFeeId,
            financialAccountId: defaultAccount.id,
            amountPaid: paymentItem.amount,
            method: data.method,
            date: new Date(),
          },
        });

        // Update student fee status and amountPaid
        await tx.studentFee.update({
          where: { id: paymentItem.studentFeeId },
          data: {
            status: newStatus,
            amountPaid: { increment: paymentItem.amount },
          },
        });

        createdPayments.push(payment);
        totalPaymentAmount += paymentItem.amount;
      }

      // Update account balance
      await tx.financialAccount.update({
        where: { id: defaultAccount.id },
        data: { balance: { increment: totalPaymentAmount } },
      });

      return {
        payments: createdPayments,
        totalAmount: totalPaymentAmount,
        accountId: defaultAccount.id,
        accountName: defaultAccount.name,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error("Payment processing error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
