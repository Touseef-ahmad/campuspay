import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  programId: z.string(),
  termId: z.string(),
  semesterNumber: z.coerce.number().int().positive(),
  maxStudents: z.coerce.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("programId");
  const termId = searchParams.get("termId");

  const where: Record<string, unknown> = {
    program: { instituteId: auth.instituteId },
  };
  if (programId) where.programId = programId;
  if (termId) where.termId = termId;

  const offerings = await prisma.programOffering.findMany({
    where,
    include: {
      program: true,
      term: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: [{ term: { startDate: "desc" } }, { semesterNumber: "asc" }],
  });

  return NextResponse.json(offerings);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verify the program belongs to this institute
    const program = await prisma.program.findFirst({
      where: { id: data.programId, instituteId: auth.instituteId },
    });
    if (!program)
      return NextResponse.json({ error: "Program not found" }, { status: 404 });

    const offering = await prisma.programOffering.create({
      data,
      include: { program: true, term: true },
    });

    return NextResponse.json(offering, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        {
          error:
            "This program-semester combination already exists for this term",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id)
      return NextResponse.json(
        { error: "Missing offering id" },
        { status: 400 },
      );

    // Verify ownership via program
    const existing = await prisma.programOffering.findFirst({
      where: { id, program: { instituteId: auth.instituteId } },
    });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = schema.partial().parse(rest);

    const offering = await prisma.programOffering.update({
      where: { id },
      data,
      include: { program: true, term: true },
    });

    return NextResponse.json(offering);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "Missing offering id" },
        { status: 400 },
      );

    // Verify ownership via program
    const existing = await prisma.programOffering.findFirst({
      where: { id, program: { instituteId: auth.instituteId } },
    });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.programOffering.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
