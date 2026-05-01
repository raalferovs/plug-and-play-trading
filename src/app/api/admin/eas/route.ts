import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const eas = await prisma.ea.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { versions: true } },
      versions: {
        where: { isLatest: true },
        select: { version: true, releasedAt: true },
        take: 1,
      },
    },
  });

  return NextResponse.json(eas);
}
