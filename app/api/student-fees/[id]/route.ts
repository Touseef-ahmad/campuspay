import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

// DELETE /api/student-fees/[id]
// Deletes a student fee and all associated payment transactions
// Also reverses the account balance changes from those payments
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: studentFeeId } = await params;

  try {
    // Verify the student fee belongs to this institute
    const studentFee = await prisma.studentFee.findFirst({
      where: {
        id: studentFeeId,
        student: { instituteId: auth.instituteId },
      },
      include: {
        payments: {
          include: {
            financialAccount: true,
          },
        },
        fee: true,
        student: true,
      },
    });

    if (!studentFee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 });
    }

    // Calculate total payments to reverse from accounts
    const paymentsByAccount = new Map<string, number>();
    for (const payment of studentFee.payments) {
      const current = paymentsByAccount.get(payment.financialAccountId) || 0;
      paymentsByAccount.set(
        payment.financialAccountId,
        current + Number(payment.amountPaid),
      );
    }

    // Delete everything in a transaction
    await prisma.$transaction(async (tx) => {
      // First, delete all payment transactions for this fee
      await tx.paymentTransaction.deleteMany({
        where: { studentFeeId },
      });

      // Reverse the account balances
      for (const [accountId, amount] of paymentsByAccount.entries()) {
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { balance: { decrement: amount } },
        });
      }

      // Finally, delete the student fee itself
      await tx.studentFee.delete({
        where: { id: studentFeeId },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Fee "${studentFee.fee.name}" and ${studentFee.payments.length} payment(s) deleted successfully`,
      deletedPayments: studentFee.payments.length,
      reversedAmount: Array.from(paymentsByAccount.values()).reduce(
        (sum, amount) => sum + amount,
        0,
      ),
    });
  } catch (error) {
    console.error("Error deleting student fee:", error);
    return NextResponse.json(
      { error: "Failed to delete fee" },
      { status: 500 },
    );
  }
}
