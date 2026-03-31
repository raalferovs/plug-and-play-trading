import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name, icon } = await request.json();

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const channels = await prisma.channel.findMany({
    where: { categoryId: params.id },
  });

  for (const channel of channels) {
    await prisma.message.deleteMany({ where: { channelId: channel.id } });
    await prisma.channel.delete({ where: { id: channel.id } });
  }

  await prisma.category.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
