"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LicenseInfo {
  key: string;
  status: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  bindingCount: number;
}

const STATUS_LABEL: Record<string, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-accent/20 text-accent" },
  trialing: { label: "Trial", classes: "bg-orange-500/20 text-orange-400" },
  past_due: { label: "Past Due", classes: "bg-yellow-500/20 text-yellow-400" },
  canceled: { label: "Canceled", classes: "bg-red-500/20 text-red-400" },
  none: { label: "No Subscription", classes: "bg-midnight-light text-gray-400" },
};

const VALIDATE_URL = "https://plug-and-play-trading-production.up.railway.app";

export default function LicensesPage() {
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/licenses/me");
      if (res.ok) {
        setInfo(await res.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  const copyKey = async () => {
    if (!info) return;
    await navigator.clipboard.writeText(info.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-midnight border border-midnight-light rounded-xl p-6">
          <p className="text-red-400">Failed to load license information.</p>
        </div>
      </div>
    );
  }

  const baseBadge = STATUS_LABEL[info.subscriptionStatus] ?? STATUS_LABEL.none;
  let trialDaysLeft: number | null = null;
  if (info.subscriptionStatus === "trialing" && info.currentPeriodEnd) {
    const end = new Date(info.currentPeriodEnd);
    trialDaysLeft = Math.max(
      0,
      Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
  }
  const subBadge =
    info.subscriptionStatus === "trialing" && trialDaysLeft !== null
      ? { ...baseBadge, label: `Trial · ${trialDaysLeft}d left` }
      : baseBadge;
  const isLicensable =
    info.status === "active" &&
    (info.subscriptionStatus === "active" ||
      info.subscriptionStatus === "trialing");

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="bg-midnight border border-midnight-light rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-white">Your License</h1>
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${subBadge.classes}`}
          >
            {subBadge.label}
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Use this key in your MT5 Expert Advisors to authorize trading.
        </p>

        {info.status === "revoked" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            This license has been revoked by an administrator. EAs will not run.
            Please contact support.
          </div>
        )}

        {!isLicensable && info.status !== "revoked" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-300 text-sm mb-4">
            Your subscription is not active. EAs will refuse to start until you{" "}
            <Link href="/billing" className="underline hover:text-yellow-200">
              activate a subscription
            </Link>
            .
          </div>
        )}

        <label className="block text-sm text-gray-400 mb-1">License key</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={info.key}
            className="flex-1 bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            onClick={copyKey}
            className="bg-midnight-light text-gray-300 px-4 py-2 rounded-lg hover:bg-midnight-50 transition-colors text-sm whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-gray-500">Bound MT5 accounts</p>
            <p className="text-white">{info.bindingCount} / 5</p>
          </div>
          <div>
            <p className="text-gray-500">Renews / expires</p>
            <p className="text-white">
              {info.currentPeriodEnd
                ? new Date(info.currentPeriodEnd).toLocaleDateString([], {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-midnight border border-midnight-light rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Setup in MT5</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>
            In MetaTrader 5, open <span className="text-white">Tools → Options → Expert Advisors</span>.
          </li>
          <li>
            Tick <span className="text-white">Allow WebRequest for listed URL</span>{" "}
            and add this URL:
            <div className="mt-1 bg-midnight-dark border border-midnight-light rounded-lg px-3 py-2 font-mono text-xs text-accent">
              {VALIDATE_URL}
            </div>
          </li>
          <li>
            Open the EA properties in MT5 and paste your license key into the{" "}
            <span className="text-white">License Key</span> input.
          </li>
          <li>
            Attach the EA to a chart. The first MT5 account you run it on will
            be auto-bound to your license (max 5 accounts, live or demo).
          </li>
        </ol>
      </div>

      <Link
        href="/profile"
        className="inline-block text-sm text-gray-500 hover:text-accent transition-colors"
      >
        &larr; Back to profile
      </Link>
    </div>
  );
}
