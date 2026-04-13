import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deposits = await prisma.accountDeposit.findMany({
    where: { instituteId: auth.instituteId },
    include: { category: true, financialAccount: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(deposits);
}
