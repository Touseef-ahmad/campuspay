import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  feeId: z.string(),
  amountDue: z.number().positive(),
  dueDate: z.string(),
  programOfferingId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: studentId } = await params;

  // Verify student belongs to institute
  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId: auth.instituteId },
  });
  if (!student)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // Fetch student fees with fee details
  const studentFees = await prisma.studentFee.findMany({
    where: { studentId },
    include: {
      fee: true,
      programOffering: {
        include: {
          program: true,
          term: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate balance for each fee using stored amountPaid
  const feesWithBalances = studentFees.map((sf) => {
    const amountPaid = Number(sf.amountPaid);
    const balance = Number(sf.amountDue) - amountPaid;
    return {
      id: sf.id,
      feeId: sf.feeId,
      feeName: sf.fee.name,
      feeType: sf.fee.type,
      amountDue: Number(sf.amountDue),
      amountPaid,
      balance,
      status: sf.status,
      dueDate: sf.dueDate,
      createdAt: sf.createdAt,
      programOffering: sf.programOffering
        ? {
            id: sf.programOffering.id,
            semesterNumber: sf.programOffering.semesterNumber,
            programCode: sf.programOffering.program.code,
            programTitle: sf.programOffering.program.title,
            termName: sf.programOffering.term.name,
          }
        : null,
    };
  });

  return NextResponse.json(feesWithBalances);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId: auth.instituteId },
    });
    if (!student)
      return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const fee = await prisma.fee.findFirst({
      where: { id: data.feeId, instituteId: auth.instituteId },
    });
    if (!fee)
      return NextResponse.json(
        { error: "Fee template not found" },
        { status: 404 },
      );

    const studentFee = await prisma.studentFee.create({
      data: {
        studentId,
        feeId: data.feeId,
        amountDue: data.amountDue,
        dueDate: new Date(data.dueDate),
        programOfferingId: data.programOfferingId ?? null,
      },
      include: {
        fee: true,
        programOffering: {
          include: { program: true, term: true },
        },
      },
    });

    return NextResponse.json(studentFee, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
