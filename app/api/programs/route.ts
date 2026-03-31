import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  department: z.string().optional(),
  credits: z.coerce.number().int().positive().optional(),
  totalSemesters: z.coerce.number().int().positive().optional(),
  duration: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const programs = await prisma.program.findMany({
    where: { instituteId: auth.instituteId },
    include: {
      programOfferings: {
        include: { term: true },
        orderBy: { semesterNumber: "asc" },
      },
      _count: { select: { programOfferings: true } },
    },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(programs);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const program = await prisma.program.create({
      data: { ...data, instituteId: auth.instituteId },
    });

    return NextResponse.json(program, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Program code already exists" },
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
        { error: "Missing program id" },
        { status: 400 },
      );
    const data = schema.parse(rest);

    const program = await prisma.program.update({
      where: { id, instituteId: auth.instituteId },
      data,
    });

    return NextResponse.json(program);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Program code already exists" },
        { status: 409 },
      );
    }
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
        { error: "Missing program id" },
        { status: 400 },
      );

    await prisma.program.delete({
      where: { id, instituteId: auth.instituteId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
