import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: studentId } = await params;

  const student = await prisma.student.findFirst({ where: { id: studentId, instituteId: auth.instituteId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const fees = await prisma.studentFee.findMany({
    where: { studentId },
    include: {
      fee: true,
      payments: { include: { financialAccount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalDue = fees.reduce((sum, f) => sum + Number(f.amountDue), 0);
  const totalPaid = fees.flatMap((f) => f.payments).reduce((sum, p) => sum + Number(p.amountPaid), 0);

  return NextResponse.json({ student, fees, totalDue, totalPaid, balance: totalDue - totalPaid });
}
