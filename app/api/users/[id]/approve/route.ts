import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthPayload(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Only school admins and system admins can approve
  const approver = await prisma.user.findUnique({ where: { id: auth.userId }, include: { role: true } });
  if (!approver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSchoolAdmin = approver.role?.name === "school_admin";
  if (!approver.isSystemAdmin && !isSchoolAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // School admins can only approve users in their own institute
  if (isSchoolAdmin && target.instituteId !== auth.instituteId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isApproved: true },
    select: { id: true, email: true, isApproved: true, instituteId: true },
  });

  return NextResponse.json(updated);
}
