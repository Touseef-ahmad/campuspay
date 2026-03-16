import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  feeId: z.string(),
  amountDue: z.number().positive(),
  dueDate: z.string(),
  termId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const student = await prisma.student.findFirst({ where: { id: studentId, instituteId: auth.instituteId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const fee = await prisma.fee.findFirst({ where: { id: data.feeId, instituteId: auth.instituteId } });
    if (!fee) return NextResponse.json({ error: "Fee template not found" }, { status: 404 });

    const studentFee = await prisma.studentFee.create({
      data: {
        studentId,
        feeId: data.feeId,
        amountDue: data.amountDue,
        dueDate: new Date(data.dueDate),
        termId: data.termId ?? null,
      },
      include: { fee: true },
    });

    return NextResponse.json(studentFee, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
