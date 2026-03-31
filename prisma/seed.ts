import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const community = await prisma.category.upsert({
    where: { name: "Community" },
    update: {},
    create: {
      name: "Community",
      icon: "users",
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
