import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const student = await prisma.student.findFirst({
    where: { id, instituteId: auth.instituteId },
    include: {
      enrollments: { include: { course: true, term: true } },
      studentFees: {
        include: { fee: true, payments: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(student);
}
