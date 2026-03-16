import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const fees = await prisma.studentFee.findMany({
    where: {
      student: { instituteId: auth.instituteId },
      ...(status ? { status: status as "PENDING" | "PARTIAL" | "PAID" } : {}),
    },
    include: { student: true, fee: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(fees);
}
