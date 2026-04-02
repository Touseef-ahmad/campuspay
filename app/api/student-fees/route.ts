import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const updateSchema = z.object({
  id: z.string(),
  amountDue: z.number().positive().optional(),
  dueDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const fees = await prisma.studentFee.findMany({
    where: {
      student: { instituteId: auth.instituteId },
      ...(status ? { status: status as "PENDING" | "PARTIAL" | "PAID" } : {}),
    },
    include: {
      student: true,
      fee: true,
      payments: true,
      programOffering: {
        include: {
          program: true,
          term: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(fees);
}

// Update a student fee (amount, due date)
export async function PUT(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...data } = updateSchema.parse(body);

    // Verify the fee belongs to this institute's student
    const existingFee = await prisma.studentFee.findFirst({
      where: {
        id,
        student: { instituteId: auth.instituteId },
      },
    });

    if (!existingFee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 });
    }

    const updated = await prisma.studentFee.update({
      where: { id },
      data: {
        ...(data.amountDue !== undefined && { amountDue: data.amountDue }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Delete a student fee (only if no payments made)
export async function DELETE(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing fee id" }, { status: 400 });
    }

    // Verify the fee belongs to this institute's student and has no payments
    const existingFee = await prisma.studentFee.findFirst({
      where: {
        id,
        student: { instituteId: auth.instituteId },
      },
    });

    if (!existingFee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 });
    }

    // Check if any payments have been made
    if (Number(existingFee.amountPaid) > 0) {
      return NextResponse.json(
        { error: "Cannot delete fee with payments. Mark as waived instead." },
        { status: 400 },
      );
    }

    await prisma.studentFee.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
