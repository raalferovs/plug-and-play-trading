import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveAccess, hasActiveAddon } from "@/lib/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscriptionStatus: true,
      priceId: true,
      currentPeriodEnd: true,
      addonStatus: true,
      addonPriceId: true,
      addonPeriodEnd: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    subscriptionStatus: user.subscriptionStatus,
    priceId: user.priceId,
    currentPeriodEnd: user.currentPeriodEnd,
    isPro: hasActiveAccess(user.subscriptionStatus),
    addonStatus: user.addonStatus,
    addonPriceId: user.addonPriceId,
    addonPeriodEnd: user.addonPeriodEnd,
    hasAddon: hasActiveAddon(user.addonStatus),
  });
}
