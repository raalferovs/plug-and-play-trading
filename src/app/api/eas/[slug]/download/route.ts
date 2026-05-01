import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveSubscription } from "@/lib/subscription";
import { getR2Object } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subError = await requireActiveSubscription(session.user.id);
  if (subError) return subError;

  const ea = await prisma.ea.findUnique({
    where: { slug: params.slug },
    include: {
      versions: { where: { isLatest: true }, take: 1 },
    },
  });

  if (!ea || !ea.isPublished) {
    return NextResponse.json({ error: "EA not found" }, { status: 404 });
  }

  const version = ea.versions[0];
  if (!version) {
    return NextResponse.json(
      { error: "No version available for download yet" },
      { status: 404 }
    );
  }

  let body;
  try {
    body = await getR2Object(version.filePath);
  } catch (err) {
    console.error("R2 fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to retrieve file from storage" },
      { status: 500 }
    );
  }

  const stream =
    typeof (body as unknown as { transformToWebStream?: () => ReadableStream }).transformToWebStream === "function"
      ? (body as unknown as { transformToWebStream: () => ReadableStream }).transformToWebStream()
      : (body as unknown as ReadableStream);

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${version.fileName}"`,
      "Content-Length": String(version.fileSize),
    },
  });
}
