import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

const instituteSchema = z.object({
  type: z.literal("institute"),
  instituteName: z.string().min(2),
  address: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

const staffSchema = z.object({
  type: z.literal("staff"),
  email: z.string().email(),
  password: z.string().min(8),
  instituteId: z.string(),
});

const schema = z.discriminatedUnion("type", [instituteSchema, staffSchema]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);

    if (data.type === "institute") {
      // Create institute + School Admin role + user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const institute = await tx.institute.create({
          data: { name: data.instituteName, address: data.address },
        });

        let role = await tx.role.findUnique({ where: { name: "school_admin" } });
        if (!role) {
          role = await tx.role.create({
            data: { name: "school_admin", permissions: ["*"] },
          });
        }

        const user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            instituteId: institute.id,
            roleId: role.id,
            isApproved: true,
          },
        });

        // Create default financial accounts
        await tx.financialAccount.createMany({
          data: [
            { name: "Main Bank", type: "Bank", isDefault: true, instituteId: institute.id },
            { name: "Petty Cash", type: "Cash", isDefault: false, instituteId: institute.id },
          ],
        });

        return { institute, user, role };
      });

      const token = signToken({
        userId: result.user.id,
        email: result.user.email,
        instituteId: result.institute.id,
        isSystemAdmin: false,
        isApproved: true,
        roleId: result.role.id,
      });

      const response = NextResponse.json({
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          isApproved: true,
          instituteId: result.institute.id,
        },
      }, { status: 201 });

      response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return response;
    } else {
      // Staff registration — requires approval
      const institute = await prisma.institute.findUnique({ where: { id: data.instituteId } });
      if (!institute) {
        return NextResponse.json({ error: "Institute not found" }, { status: 404 });
      }

      let role = await prisma.role.findUnique({ where: { name: "staff" } });
      if (!role) {
        role = await prisma.role.create({
          data: { name: "staff", permissions: ["fees:read", "payments:write", "expenses:write"] },
        });
      }

      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          instituteId: data.instituteId,
          roleId: role.id,
          isApproved: false,
        },
      });

      return NextResponse.json({
        message: "Registration successful. Awaiting admin approval.",
        userId: user.id,
      }, { status: 201 });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
