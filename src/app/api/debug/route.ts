import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Test actual Stripe connection
  let stripeTest = "not tested";
  try {
    await getStripe().balance.retrieve();
    stripeTest = "connected - balance retrieved";
  } catch (err) {
    stripeTest = err instanceof Error ? err.message : "unknown error";
  }

  return NextResponse.json({
    stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) || "MISSING",
    stripeKeySuffix: process.env.STRIPE_SECRET_KEY?.slice(-4) || "MISSING",
    stripeTest,
    priceId: process.env.STRIPE_PRO_PRICE_ID || "MISSING",
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function POST() {
  // Clear old Stripe customer data
  await prisma.user.updateMany({
    where: { stripeCustomerId: { not: null } },
    data: {
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: "none",
      priceId: null,
      currentPeriodEnd: null,
    },
  });
  return NextResponse.json({ success: true, message: "Cleared all Stripe customer data" });
}
