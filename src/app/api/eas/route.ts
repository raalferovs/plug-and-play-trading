import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public list of published EAs for the /bots page. No subscription gate
// — free users see the cards too, with a "Subscribe to download" CTA.
export async function GET() {
  const eas = await prisma.ea.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      versions: {
        where: { isLatest: true },
        select: {
          version: true,
          releasedAt: true,
          fileSize: true,
          releaseNotes: true,
        },
        take: 1,
      },
    },
  });

  // Flatten to one "latestVersion" field for easier client consumption.
  const result = eas.map((ea) => ({
    id: ea.id,
    slug: ea.slug,
    name: ea.name,
    description: ea.description,
    icon: ea.icon,
    latestVersion: ea.versions[0] ?? null,
  }));

  return NextResponse.json(result);
}
