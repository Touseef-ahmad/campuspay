import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["Bank", "Cash"]),
  balance: z.number().min(0).optional().default(0),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.financialAccount.findMany({
    where: { instituteId: auth.instituteId },
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    // If this is the first account or marked as default, set as default
    const existingCount = await prisma.financialAccount.count({
      where: { instituteId: auth.instituteId },
    });

    const shouldBeDefault = existingCount === 0 || data.isDefault;

    // If setting as default, unset other defaults
    if (shouldBeDefault) {
      await prisma.financialAccount.updateMany({
        where: { instituteId: auth.instituteId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await prisma.financialAccount.create({
      data: {
        name: data.name,
        type: data.type,
        balance: data.balance,
        isDefault: shouldBeDefault,
        instituteId: auth.instituteId,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
