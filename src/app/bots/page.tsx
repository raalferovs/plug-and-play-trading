"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ModuleRail from "@/components/ModuleRail";

interface StaticBot {
  id: string;
  name: string;
  icon: string;
  description: string;
  secondaryDescription?: string;
  badge?: string;
  connectHref: string;
  connectLabel: string;
  setupGuideText: string;
}

interface DownloadableEa {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  latestVersion: {
    version: string;
    releasedAt: string;
    fileSize: number;
    releaseNotes: string;
  } | null;
}

const staticBots: StaticBot[] = [
  {
    id: "copy-trading-ea",
    name: "Copy Trading EA",
    icon: "📈",
    description:
      "Mirror professional trades automatically. Connect your MT5 broker account and let our master strategy do the work for you.",
    secondaryDescription:
      "Adjustable risk multiplier lets you scale exposure to fit your account size.",
    connectHref: "/copy-trading",
    connectLabel: "Connect account",
    setupGuideText:
      "Learn how to connect your MT5 account and configure your risk multiplier.",
  },
];

export default function BotsPage() {
  const { data: session } = useSession();
  const [eas, setEas] = useState<DownloadableEa[]>([]);

  useEffect(() => {
    fetch("/api/eas")
      .then((r) => r.json())
      .then((data) => setEas(Array.isArray(data) ? data : []))
      .catch(() => setEas([]));
  }, []);

  const isPro =
    session?.user.subscriptionStatus === "active" ||
    session?.user.subscriptionStatus === "trialing" ||
    session?.user.role === "admin";

  return (
    <div className="h-[calc(100vh-57px)] flex">
      <ModuleRail />

      <div className="flex-1 overflow-y-auto bg-midnight-dark">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">Bots</h1>
            <p className="text-sm text-gray-400">
              Automated trading services you can connect to your account.
            </p>
          </div>

          <div className="space-y-6">
            {/* Static bot cards (Copy Trading) */}
            {staticBots.map((bot) => (
              <div
                key={bot.id}
                className="bg-midnight border border-midnight-light rounded-xl overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-accent/20 to-midnight-light flex items-center justify-center text-5xl border border-midnight-light">
                        {bot.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-xl font-semibold text-white">
                          {bot.name}
                        </h2>
                        {bot.badge && (
                          <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded font-medium uppercase">
                            {bot.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed mb-2">
                        {bot.description}
                      </p>
                      {bot.secondaryDescription && (
                        <p className="text-sm text-gray-400 leading-relaxed mb-4">
                          {bot.secondaryDescription}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-4">
                        <Link
                          href={bot.connectHref}
                          className="inline-flex items-center gap-2 bg-accent text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-dim transition-colors text-sm"
                        >
                          {bot.connectLabel}
                          <span aria-hidden>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-midnight-dark border-t border-midnight-light px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full border border-midnight-light flex items-center justify-center text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Setup guide</p>
                      <p className="text-xs text-gray-500">{bot.setupGuideText}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-gray-300 border border-midnight-light hover:border-accent hover:text-accent px-4 py-2 rounded-lg transition-colors"
                  >
                    View setup guide
                  </button>
                </div>
              </div>
            ))}

            {/* Dynamic downloadable EAs */}
            {eas.map((ea) => (
              <div
                key={ea.id}
                className="bg-midnight border border-midnight-light rounded-xl overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-accent/20 to-midnight-light flex items-center justify-center text-5xl border border-midnight-light">
                        {ea.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-xl font-semibold text-white">
                          {ea.name}
                        </h2>
                        {ea.latestVersion && (
                          <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded font-medium">
                            v{ea.latestVersion.version}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed mb-2">
                        {ea.description}
                      </p>
                      {ea.latestVersion ? (
                        <p className="text-xs text-gray-500 mb-4">
                          Released{" "}
                          {new Date(ea.latestVersion.releasedAt).toLocaleDateString([], {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                          {" · "}
                          {(ea.latestVersion.fileSize / 1024).toFixed(1)} KB
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mb-4">
                          Noch keine Version verfügbar — kommt bald.
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-4">
                        {!ea.latestVersion ? (
                          <span className="text-sm text-gray-500">Coming soon</span>
                        ) : isPro ? (
                          <a
                            href={`/api/eas/${ea.slug}/download`}
                            className="inline-flex items-center gap-2 bg-accent text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-dim transition-colors text-sm"
                          >
                            Download EA v{ea.latestVersion.version}
                            <span aria-hidden>↓</span>
                          </a>
                        ) : (
                          <Link
                            href="/billing"
                            className="inline-flex items-center gap-2 bg-accent text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-dim transition-colors text-sm"
                          >
                            Subscribe to download
                            <span aria-hidden>→</span>
                          </Link>
                        )}
                      </div>

                      {ea.latestVersion?.releaseNotes && (
                        <details className="mt-4 text-xs text-gray-400">
                          <summary className="cursor-pointer hover:text-gray-300">
                            Release notes
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap text-gray-500">
                            {ea.latestVersion.releaseNotes}
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-midnight-dark border-t border-midnight-light px-6 py-4">
                  <p className="text-xs text-gray-500">
                    EA muss in MetaTrader 5 hinzugefügt werden. License-Key findest du auf{" "}
                    <Link href="/licenses" className="text-accent hover:underline">
                      /licenses
                    </Link>
                    .
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
