import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export function hasActiveAccess(subscriptionStatus: string): boolean {
  return subscriptionStatus === "active" || subscriptionStatus === "trialing";
}

export function hasActiveAddon(addonStatus: string): boolean {
  // Addon has no trial, so only "active" counts. past_due/canceled/none → no.
  return addonStatus === "active";
}

export async function requireActiveSubscription(
  userId: string
): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, role: true },
  });
  if (user?.role === "admin") return null;
  if (!user || !hasActiveAccess(user.subscriptionStatus)) {
    return NextResponse.json(
      { error: "subscription_required" },
      { status: 403 }
    );
  }
  return null;
}

export async function requireCopyTradingAccess(
  userId: string
): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, addonStatus: true, role: true },
  });
  if (user?.role === "admin") return null;
  if (!user) {
    return NextResponse.json(
      { error: "copy_trading_access_required" },
      { status: 403 }
    );
  }
  // Addon requires PRO. Defense-in-depth: check both even though webhook
  // cascade-cancels addon when PRO ends.
  if (!hasActiveAccess(user.subscriptionStatus) || !hasActiveAddon(user.addonStatus)) {
    return NextResponse.json(
      { error: "copy_trading_access_required" },
      { status: 403 }
    );
  }
  return null;
}
