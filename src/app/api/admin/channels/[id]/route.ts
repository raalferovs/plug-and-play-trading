import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name, description } = await request.json();

  const channel = await prisma.channel.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json(channel);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  await prisma.message.deleteMany({ where: { channelId: params.id } });
  await prisma.channel.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
