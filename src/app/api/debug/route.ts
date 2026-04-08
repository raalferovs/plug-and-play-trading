import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "MISSING",
    hasPriceId: !!process.env.STRIPE_PRO_PRICE_ID,
    priceIdPrefix: process.env.STRIPE_PRO_PRICE_ID?.substring(0, 10) || "MISSING",
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL || "MISSING",
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "MISSING",
    nodeEnv: process.env.NODE_ENV,
  });
}
