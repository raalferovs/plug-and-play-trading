import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Create admin account
  const hashedPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@plugandplay.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@plugandplay.com",
      password: hashedPassword,
      role: "admin",
    },
  });
  console.log("Admin account created: admin@plugandplay.com");

  const community = await prisma.category.upsert({
    where: { name: "Community" },
    update: {},
    create: {
      name: "Community",
      icon: "👥",
      order: 0,
    },
  });

  const channels = [
    { name: "announcements", description: "Important announcements and updates", order: 0 },
    { name: "general", description: "General discussion", order: 1 },
    { name: "results", description: "Share your trading results", order: 2 },
  ];

  for (const channel of channels) {
    await prisma.channel.upsert({
      where: {
        categoryId_name: {
          categoryId: community.id,
          name: channel.name,
        },
      },
      update: {},
      create: {
        ...channel,
        categoryId: community.id,
      },
    });
  }

  const usersWithoutLicense = await prisma.user.findMany({
    where: { license: null },
    select: { id: true },
  });
  for (const u of usersWithoutLicense) {
    await prisma.license.create({
      data: { userId: u.id, key: randomUUID() },
    });
  }
  if (usersWithoutLicense.length > 0) {
    console.log(`Provisioned licenses for ${usersWithoutLicense.length} user(s)`);
  }

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
