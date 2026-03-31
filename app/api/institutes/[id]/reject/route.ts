import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only system admins can reject institutes
  const caller = await prisma.user.findUnique({
    where: { id: auth.userId },
  });
  if (!caller?.isSystemAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const institute = await prisma.institute.findUnique({
    where: { id },
    include: { users: true },
  });
  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  // Delete institute and all associated users in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete all users associated with this institute
    await tx.user.deleteMany({ where: { instituteId: id } });
    // Delete financial accounts
    await tx.financialAccount.deleteMany({ where: { instituteId: id } });
    // Delete the institute
    await tx.institute.delete({ where: { id } });
  });

  return NextResponse.json({ message: "Institute rejected and removed" });
}
