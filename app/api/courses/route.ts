import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  department: z.string().optional(),
  credits: z.coerce.number().int().positive().optional(),
  maxStudents: z.coerce.number().int().positive().optional(),
  semester: z.string().optional(),
  duration: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
    where: { instituteId: auth.instituteId },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const course = await prisma.course.create({
      data: { ...data, instituteId: auth.instituteId },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Course code already exists" },
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
      return NextResponse.json({ error: "Missing course id" }, { status: 400 });
    const data = schema.parse(rest);

    const course = await prisma.course.update({
      where: { id, instituteId: auth.instituteId },
      data,
    });

    return NextResponse.json(course);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Course code already exists" },
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
      return NextResponse.json({ error: "Missing course id" }, { status: 400 });

    await prisma.course.delete({
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
