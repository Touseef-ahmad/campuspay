import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error(
      "Usage: npx tsx scripts/create-superuser.ts <email> <password>",
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User with email "${email}" already exists`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      isSystemAdmin: true,
      isApproved: true,
    },
  });

  console.log(`Super user created successfully!`);
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Admin: ${user.isSystemAdmin}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
