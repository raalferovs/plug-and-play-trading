import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name, description, categoryId, isPremium } = await request.json();

  if (!name || !categoryId) {
    return NextResponse.json(
      { error: "name and categoryId are required" },
      { status: 400 }
    );
  }

  const channel = await prisma.channel.create({
    data: { name, description: description || "", categoryId, isPremium: isPremium || false },
  });

  return NextResponse.json(channel);
}
