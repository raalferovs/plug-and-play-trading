"use client";

import Link from "next/link";
import ModuleRail from "@/components/ModuleRail";

interface Bot {
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

const bots: Bot[] = [
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
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-midnight border border-midnight-light rounded-xl overflow-hidden"
              >
                {/* Main card content */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-accent/20 to-midnight-light flex items-center justify-center text-5xl border border-midnight-light">
                        {bot.icon}
                      </div>
                    </div>

                    {/* Content */}
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

                {/* Setup guide footer */}
                <div className="bg-midnight-dark border-t border-midnight-light px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full border border-midnight-light flex items-center justify-center text-gray-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Setup guide
                      </p>
                      <p className="text-xs text-gray-500">
                        {bot.setupGuideText}
                      </p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
