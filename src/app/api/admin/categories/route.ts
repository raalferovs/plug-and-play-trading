import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name, icon } = await request.json();

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const category = await prisma.category.create({
    data: { name, icon: icon || "" },
  });

  return NextResponse.json(category);
}
