import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
    where: { instituteId: auth.instituteId },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const course = await prisma.course.create({
      data: { ...data, instituteId: auth.instituteId },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Course code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
