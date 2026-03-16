import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.financialAccount.findMany({
    where: { instituteId: auth.instituteId },
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json(accounts);
}
