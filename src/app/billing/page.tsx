"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface SubscriptionData {
  subscriptionStatus: string;
  priceId: string | null;
  currentPeriodEnd: string | null;
  isPro: boolean;
}

function BillingContent() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    async function loadSubscription() {
      const res = await fetch("/api/subscription");
      const data = await res.json();
      setSubscription(data);
      setLoading(false);
    }
    loadSubscription();
  }, []);

  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session");
        setCheckoutLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <Link
          href="/chat"
          className="text-sm text-gray-500 hover:text-accent transition-colors"
        >
          &larr; Back to chat
        </Link>
      </div>

      {success && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6 text-accent">
          Welcome to Pro! Your subscription is now active.
        </div>
      )}

      {canceled && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6 text-yellow-400">
          Checkout was not completed. You can try again whenever you&apos;re
          ready.
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {subscription?.isPro ? (
        /* Pro User View */
        <div className="bg-midnight border border-midnight-light rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white">
              Pro Subscription
            </h2>
            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded font-medium">
              ACTIVE
            </span>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Status</span>
              <span className="text-white capitalize">
                {subscription.subscriptionStatus}
              </span>
            </div>
            {subscription.currentPeriodEnd && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Next billing date</span>
                <span className="text-white">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                    [],
                    { month: "long", day: "numeric", year: "numeric" }
                  )}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleManageBilling}
            className="bg-midnight-light text-gray-300 px-4 py-2.5 rounded-lg hover:bg-midnight-50 transition-colors text-sm font-medium"
          >
            Manage Billing
          </button>
        </div>
      ) : (
        /* Free User View */
        <div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Free Tier */}
            <div className="bg-midnight border border-midnight-light rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-1">Free</h3>
              <p className="text-2xl font-semibold text-white mb-4">
                $0
                <span className="text-sm text-gray-500 font-normal">
                  /month
                </span>
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-accent">&#10003;</span>
                  Community chat access
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">&#10003;</span>
                  Basic channels
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">&#10003;</span>
                  User profile
                </li>
              </ul>
              <div className="mt-6">
                <span className="text-sm text-gray-500">Current plan</span>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="bg-midnight border-2 border-accent rounded-xl p-6 relative">
              <div className="absolute -top-3 left-4">
                <span className="bg-accent text-black text-xs font-semibold px-3 py-1 rounded-full">
                  RECOMMENDED
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Pro</h3>
              <p className="text-2xl font-semibold text-white mb-4">
                $29
                <span className="text-sm text-gray-500 font-normal">
                  /month
                </span>
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-accent">&#10003;</span>
                  Everything in Free
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">&#10003;</span>
                  Premium trading channels
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">&#10003;</span>
                  Exclusive signals & analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">&#10003;</span>
                  Priority support
                </li>
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="mt-6 w-full bg-accent text-black font-semibold py-2.5 rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
              >
                {checkoutLoading ? "Redirecting..." : "Upgrade to Pro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-57px)]"><p className="text-gray-500">Loading...</p></div>}>
      <BillingContent />
    </Suspense>
  );
}
