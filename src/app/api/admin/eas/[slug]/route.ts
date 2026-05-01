import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const ea = await prisma.ea.findUnique({
    where: { slug: params.slug },
    include: {
      versions: { orderBy: { releasedAt: "desc" } },
    },
  });

  if (!ea) {
    return NextResponse.json({ error: "EA not found" }, { status: 404 });
  }

  return NextResponse.json(ea);
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { name, description, icon, isPublished } = body;

  const updated = await prisma.ea.update({
    where: { slug: params.slug },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(icon !== undefined && { icon }),
      ...(isPublished !== undefined && { isPublished }),
    },
  });

  return NextResponse.json(updated);
}
