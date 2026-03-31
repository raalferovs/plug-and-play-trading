import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 }
    );
  }

  const messages = await prisma.message.findMany({
    where: { channelId },
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, channelId } = await request.json();

  if (!content || !channelId) {
    return NextResponse.json(
      { error: "content and channelId are required" },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: {
      content,
      channelId,
      userId: session.user.id,
    },
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
    },
  });

  return NextResponse.json(message);
}
