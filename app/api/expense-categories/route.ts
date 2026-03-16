import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const schema = z.object({ name: z.string().min(1) });

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.expenseCategory.findMany({
    where: { instituteId: auth.instituteId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const category = await prisma.expenseCategory.create({
      data: { ...data, instituteId: auth.instituteId },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
