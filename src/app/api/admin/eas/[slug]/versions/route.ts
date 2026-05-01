import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse multipart form data" },
      { status: 400 }
    );
  }

  const version = formData.get("version");
  const releaseNotes = formData.get("releaseNotes") ?? "";
  const file = formData.get("file");

  if (typeof version !== "string" || !version.trim()) {
    return NextResponse.json({ error: "version is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof releaseNotes !== "string") {
    return NextResponse.json({ error: "releaseNotes must be a string" }, { status: 400 });
  }

  const ea = await prisma.ea.findUnique({ where: { slug: params.slug } });
  if (!ea) return NextResponse.json({ error: "EA not found" }, { status: 404 });

  const existing = await prisma.eaVersion.findUnique({
    where: { eaId_version: { eaId: ea.id, version: version.trim() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Version ${version} already exists for this EA` },
      { status: 409 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name;
  const filePath = `${params.slug}/${version.trim()}/${fileName}`;
  const contentType = file.type || "application/octet-stream";

  try {
    await uploadToR2(filePath, buffer, contentType);
  } catch (err) {
    console.error("R2 upload failed:", err);
    return NextResponse.json(
      { error: "File upload to storage failed" },
      { status: 500 }
    );
  }

  // Atomically: clear isLatest on prior versions, then create new as latest.
  const created = await prisma.$transaction(async (tx) => {
    await tx.eaVersion.updateMany({
      where: { eaId: ea.id, isLatest: true },
      data: { isLatest: false },
    });
    return tx.eaVersion.create({
      data: {
        eaId: ea.id,
        version: version.trim(),
        filePath,
        fileName,
        fileSize: buffer.byteLength,
        releaseNotes,
        isLatest: true,
      },
    });
  });

  return NextResponse.json(created);
}
