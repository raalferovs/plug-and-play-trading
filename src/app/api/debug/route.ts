import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  // Test actual Stripe connection
  let stripeTest = "not tested";
  try {
    const balance = await getStripe().balance.retrieve();
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
