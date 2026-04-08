import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSubscriptionData(subscription: any) {
  return {
    subscriptionId: subscription.id as string,
    subscriptionStatus: subscription.status as string,
    priceId: subscription.items.data[0].price.id as string,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
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
      if (session.subscription && session.customer) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await prisma.user.update({
          where: { stripeCustomerId: session.customer as string },
          data: getSubscriptionData(subscription),
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.user.update({
        where: { subscriptionId: subscription.id },
        data: getSubscriptionData(subscription),
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.user.update({
        where: { subscriptionId: subscription.id },
        data: {
          subscriptionStatus: "canceled",
          subscriptionId: null,
          priceId: null,
          currentPeriodEnd: null,
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any;
      if (invoice.subscription) {
        await prisma.user.updateMany({
          where: { subscriptionId: invoice.subscription as string },
          data: { subscriptionStatus: "past_due" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
