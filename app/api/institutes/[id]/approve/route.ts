import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only system admins can approve institutes
  const caller = await prisma.user.findUnique({
    where: { id: auth.userId },
  });
  if (!caller?.isSystemAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const institute = await prisma.institute.findUnique({ where: { id } });
  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  const updated = await prisma.institute.update({
    where: { id },
    data: { isApproved: true },
    select: {
      id: true,
      name: true,
      email: true,
      isApproved: true,
    },
  });

  return NextResponse.json(updated);
}
