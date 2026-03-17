import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only school admins and system admins can list users
  const caller = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { role: true },
  });
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSchoolAdmin = caller.role?.name === "school_admin";
  if (!caller.isSystemAdmin && !isSchoolAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { instituteId: auth.instituteId },
    select: {
      id: true,
      email: true,
      isApproved: true,
      createdAt: true,
      role: { select: { name: true } },
    },
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(users);
}
