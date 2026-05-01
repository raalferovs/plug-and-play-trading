import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { deleteFromR2 } from "@/lib/r2";

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string; versionId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { setLatest, releaseNotes } = body;

  const version = await prisma.eaVersion.findUnique({
    where: { id: params.versionId },
    include: { ea: true },
  });
  if (!version || version.ea.slug !== params.slug) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  if (setLatest === true) {
    await prisma.$transaction([
      prisma.eaVersion.updateMany({
        where: { eaId: version.eaId, isLatest: true },
        data: { isLatest: false },
      }),
      prisma.eaVersion.update({
        where: { id: params.versionId },
        data: { isLatest: true },
      }),
    ]);
  }

  if (typeof releaseNotes === "string") {
    await prisma.eaVersion.update({
      where: { id: params.versionId },
      data: { releaseNotes },
    });
  }

  const updated = await prisma.eaVersion.findUnique({
    where: { id: params.versionId },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { slug: string; versionId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const version = await prisma.eaVersion.findUnique({
    where: { id: params.versionId },
    include: { ea: true },
  });
  if (!version || version.ea.slug !== params.slug) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Delete R2 object first; if that fails we don't lose the DB row pointing to it.
  try {
    await deleteFromR2(version.filePath);
  } catch (err) {
    console.error("R2 delete failed (continuing to delete DB row):", err);
  }

  await prisma.eaVersion.delete({ where: { id: params.versionId } });

  // If we just deleted the latest, promote the most recent remaining version.
  if (version.isLatest) {
    const next = await prisma.eaVersion.findFirst({
      where: { eaId: version.eaId },
      orderBy: { releasedAt: "desc" },
    });
    if (next) {
      await prisma.eaVersion.update({
        where: { id: next.id },
        data: { isLatest: true },
      });
    }
  }

  return NextResponse.json({ success: true });
}
