import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Only school admins and system admins can reject
  const caller = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { role: true },
  });
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSchoolAdmin = caller.role?.name === "school_admin";
  if (!caller.isSystemAdmin && !isSchoolAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Cannot reject yourself
  if (target.id === auth.userId) {
    return NextResponse.json(
      { error: "Cannot reject yourself" },
      { status: 400 },
    );
  }

  // School admins can only reject users in their own institute
  if (isSchoolAdmin && target.instituteId !== auth.instituteId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: "User rejected and removed" });
}
