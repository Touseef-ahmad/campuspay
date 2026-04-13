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

const addAmountSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  categoryId: z.string().min(1),
  description: z.string().optional(),
  date: z.string().optional(),
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

// Add amount to account (deposit/funding)
export async function PATCH(req: NextRequest) {
  const auth = getAuthPayload(req);
  if (!auth?.instituteId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = addAmountSchema.parse(body);

    // Verify account belongs to this institute
    const existing = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, instituteId: auth.instituteId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify category belongs to this institute
    const category = await prisma.incomeCategory.findFirst({
      where: { id: data.categoryId, instituteId: auth.instituteId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Create deposit record and update balance in a transaction
    const [deposit, account] = await prisma.$transaction([
      prisma.accountDeposit.create({
        data: {
          amount: data.amount,
          description: data.description,
          date: data.date ? new Date(data.date) : new Date(),
          instituteId: auth.instituteId,
          financialAccountId: data.accountId,
          categoryId: data.categoryId,
        },
        include: { category: true, financialAccount: true },
      }),
      prisma.financialAccount.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: data.amount,
          },
        },
      }),
    ]);

    return NextResponse.json({ deposit, account });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
