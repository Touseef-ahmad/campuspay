import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only system admins can list all institutes
  const caller = await prisma.user.findUnique({
    where: { id: auth.userId },
  });
  if (!caller?.isSystemAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";

  const institutes = await prisma.institute.findMany({
    where: search
      ? {
          name: { contains: search, mode: "insensitive" },
        }
      : {},
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      type: true,
      isApproved: true,
      createdAt: true,
      _count: {
        select: { users: true },
      },
    },
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(institutes);
}
