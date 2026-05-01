import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { hasActiveAccess, hasActiveAddon } from "@/lib/subscription";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    if (!process.env.STRIPE_COPYTRADING_PRICE_ID) {
      return NextResponse.json(
        { error: "Copy-trading price not configured" },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add-On requires an active PRO subscription.
    if (!hasActiveAccess(user.subscriptionStatus)) {
      return NextResponse.json(
        { error: "PRO subscription required to add Copy-Trading" },
        { status: 400 }
      );
    }

    if (hasActiveAddon(user.addonStatus)) {
      return NextResponse.json(
        { error: "Copy-Trading add-on already active" },
        { status: 400 }
      );
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        { price: process.env.STRIPE_COPYTRADING_PRICE_ID, quantity: 1 },
      ],
      payment_method_collection: "always",
      subscription_data: {
        metadata: { product: "copy_trading_addon", userId: user.id },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?addon=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?addon=canceled`,
      metadata: { userId: user.id, product: "copy_trading_addon" },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Addon checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
