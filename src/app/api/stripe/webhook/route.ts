import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Slot = "pro" | "addon" | null;

function slotForPriceId(priceId: string | undefined | null): Slot {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_COPYTRADING_PRICE_ID) return "addon";
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPriceId(subscription: any): string | null {
  return (subscription.items?.data?.[0]?.price?.id as string) ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function periodEnd(subscription: any): Date | null {
  return subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
}

async function cancelAddonSubscription(addonSubscriptionId: string) {
  try {
    await getStripe().subscriptions.cancel(addonSubscriptionId);
  } catch (err) {
    // Already canceled or otherwise gone — log and continue.
    console.error("Failed to cascade-cancel addon subscription:", err);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.subscription || !session.customer) break;

      const subscription = await getStripe().subscriptions.retrieve(
        session.subscription as string
      );
      const priceId = extractPriceId(subscription);
      const slot = slotForPriceId(priceId);
      if (!slot) {
        console.error("Unknown price in checkout:", priceId);
        break;
      }

      if (slot === "pro") {
        await prisma.user.update({
          where: { stripeCustomerId: session.customer as string },
          data: {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            priceId: priceId ?? undefined,
            currentPeriodEnd: periodEnd(subscription),
          },
        });
      } else {
        await prisma.user.update({
          where: { stripeCustomerId: session.customer as string },
          data: {
            addonSubscriptionId: subscription.id,
            addonStatus: subscription.status,
            addonPriceId: priceId ?? undefined,
            addonPeriodEnd: periodEnd(subscription),
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = extractPriceId(subscription);
      const slot = slotForPriceId(priceId);
      if (!slot) break;

      if (slot === "pro") {
        await prisma.user.updateMany({
          where: { subscriptionId: subscription.id },
          data: {
            subscriptionStatus: subscription.status,
            priceId: priceId ?? undefined,
            currentPeriodEnd: periodEnd(subscription),
          },
        });
      } else {
        await prisma.user.updateMany({
          where: { addonSubscriptionId: subscription.id },
          data: {
            addonStatus: subscription.status,
            addonPriceId: priceId ?? undefined,
            addonPeriodEnd: periodEnd(subscription),
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = extractPriceId(subscription);
      const slot = slotForPriceId(priceId);

      if (slot === "pro") {
        const user = await prisma.user.findFirst({
          where: { subscriptionId: subscription.id },
          select: { id: true, addonSubscriptionId: true, addonStatus: true },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "canceled",
              subscriptionId: null,
              priceId: null,
              currentPeriodEnd: null,
            },
          });
          // Cascade: PRO required for Add-On. Cancel addon if still active.
          if (user.addonSubscriptionId && user.addonStatus !== "canceled") {
            await cancelAddonSubscription(user.addonSubscriptionId);
          }
        }
      } else if (slot === "addon") {
        await prisma.user.updateMany({
          where: { addonSubscriptionId: subscription.id },
          data: {
            addonStatus: "canceled",
            addonSubscriptionId: null,
            addonPriceId: null,
            addonPeriodEnd: null,
          },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any;
      if (!invoice.subscription) break;

      // We do not get a price on the invoice cleanly; look up which slot the
      // subscription belongs to in our DB.
      const subId = invoice.subscription as string;
      const proUser = await prisma.user.findFirst({
        where: { subscriptionId: subId },
        select: { id: true },
      });
      if (proUser) {
        await prisma.user.update({
          where: { id: proUser.id },
          data: { subscriptionStatus: "past_due" },
        });
        break;
      }
      const addonUser = await prisma.user.findFirst({
        where: { addonSubscriptionId: subId },
        select: { id: true },
      });
      if (addonUser) {
        await prisma.user.update({
          where: { id: addonUser.id },
          data: { addonStatus: "past_due" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
