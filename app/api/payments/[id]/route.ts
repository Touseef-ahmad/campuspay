import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

// DELETE /api/payments/[id] - Delete a single payment and reverse the account balance
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: paymentId } = await params;

  try {
    // Find the payment and verify it belongs to this institute
    const payment = await prisma.paymentTransaction.findFirst({
      where: {
        id: paymentId,
        studentFee: { student: { instituteId: auth.instituteId } },
      },
      include: {
        studentFee: {
          include: { payments: true },
        },
        financialAccount: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const amountToReverse = Number(payment.amountPaid);
    const studentFee = payment.studentFee;

    // Calculate new totals after removing this payment
    const otherPaymentsTotal = studentFee.payments
      .filter((p) => p.id !== paymentId)
      .reduce((sum, p) => sum + Number(p.amountPaid), 0);

    // Determine new fee status
    let newStatus: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
    if (
      otherPaymentsTotal > 0 &&
      otherPaymentsTotal < Number(studentFee.amountDue)
    ) {
      newStatus = "PARTIAL";
    } else if (otherPaymentsTotal >= Number(studentFee.amountDue)) {
      newStatus = "PAID";
    }

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      // Delete the payment
      await tx.paymentTransaction.delete({
        where: { id: paymentId },
      });

      // Update the student fee status and amountPaid
      await tx.studentFee.update({
        where: { id: studentFee.id },
        data: {
          status: newStatus,
          amountPaid: otherPaymentsTotal,
        },
      });

      // Reverse the account balance
      await tx.financialAccount.update({
        where: { id: payment.financialAccountId },
        data: {
          balance: { decrement: amountToReverse },
        },
      });
    });

    return NextResponse.json({
      success: true,
      reversedAmount: amountToReverse,
      newFeeStatus: newStatus,
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 },
    );
  }
}
