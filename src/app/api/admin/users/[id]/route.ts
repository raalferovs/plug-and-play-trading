import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { role } = await request.json();

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role },
    select: { id: true, name: true, role: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  if (params.id === session!.user.id) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    );
  }

  await prisma.message.deleteMany({ where: { userId: params.id } });
  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
