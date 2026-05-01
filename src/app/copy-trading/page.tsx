"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface CopyAccount {
  id: string;
  metacopierAccountId: string | null;
  metacopierId: string | null;
  brokerServer: string;
  loginNumber: string;
  status: string;
  riskMultiplier: number;
  dailyRiskLimit: number;
  alias: string;
  balance: number | null;
  equity: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface AccountStatus {
  balance: number;
  equity: number;
  freeMargin: number;
  usedMargin: number;
  leverage: string;
}

export default function CopyTradingPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<CopyAccount[]>([]);
  const [brokers, setBrokers] = useState<string[]>([]);
  const [brokerSearch, setBrokerSearch] = useState("");
  const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, AccountStatus>>({});
  const [editingMultiplier, setEditingMultiplier] = useState<string | null>(null);
  const [editMultiplierValue, setEditMultiplierValue] = useState("1");
  const [editDailyRiskLimitValue, setEditDailyRiskLimitValue] = useState("10");

  // Form state
  const [brokerServer, setBrokerServer] = useState("");
  const [loginNumber, setLoginNumber] = useState("");
  const [password, setPassword] = useState("");
  const [riskMultiplier, setRiskMultiplier] = useState(1);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [advancedMultiplierInput, setAdvancedMultiplierInput] = useState("1");
  const [advancedRiskLimitInput, setAdvancedRiskLimitInput] = useState("10");

  useEffect(() => {
    loadAccounts();
    loadBrokers();
  }, []);

  async function loadAccounts() {
    const res = await fetch("/api/copy-trading");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  async function loadBrokers() {
    try {
      const res = await fetch("/api/brokers");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBrokers(data);
      }
    } catch {
      console.error("Failed to load brokers");
    }
  }

  const loadStatus = useCallback(async (accountId: string) => {
    try {
      const res = await fetch(`/api/copy-trading/${accountId}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatusMap((prev) => ({ ...prev, [accountId]: data }));
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    accounts.forEach((acc) => {
      if (acc.status === "active" && acc.metacopierAccountId) {
        loadStatus(acc.id);
      }
    });
  }, [accounts, loadStatus]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setConnecting(true);

    try {
      const multiplier = advancedMode
        ? parseFloat(advancedMultiplierInput) || 1
        : riskMultiplier;
      const dailyRiskLimit = advancedMode
        ? parseFloat(advancedRiskLimitInput) || multiplier * 10
        : riskMultiplier * 10;

      const res = await fetch("/api/copy-trading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerServer,
          loginNumber,
          password,
          riskMultiplier: multiplier,
          dailyRiskLimit,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect account");
        setConnecting(false);
        return;
      }

      setSuccess("Account connected successfully!");
      setBrokerServer("");
      setLoginNumber("");
      setPassword("");
      setRiskMultiplier(1);
      setAdvancedMode(false);
      setAdvancedMultiplierInput("1");
      setAdvancedRiskLimitInput("10");
      setBrokerSearch("");
      loadAccounts();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setConnecting(false);
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Disconnect this account? This will stop all copy trading."))
      return;

    try {
      await fetch(`/api/copy-trading/${accountId}`, { method: "DELETE" });
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setSuccess("Account disconnected.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to disconnect account.");
    }
  };

  const handleUpdateMultiplier = async (accountId: string) => {
    try {
      const multiplier = parseFloat(editMultiplierValue) || 1;
      const dailyRiskLimit = parseFloat(editDailyRiskLimitValue) || 10;

      const res = await fetch(`/api/copy-trading/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskMultiplier: multiplier,
          dailyRiskLimit,
        }),
      });

      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === accountId
              ? {
                  ...a,
                  riskMultiplier: multiplier,
                  dailyRiskLimit,
                }
              : a
          )
        );
        setEditingMultiplier(null);
        setSuccess("Risk settings updated.");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError("Failed to update multiplier.");
    }
  };

  const filteredBrokers = brokers.filter((b) =>
    b.toLowerCase().includes(brokerSearch.toLowerCase())
  );

  if (!session) return null;

  const subStatus = session.user.subscriptionStatus;
  const isPro = subStatus === "active" || subStatus === "trialing";
  const isTrialing = subStatus === "trialing";
  const hasAddon = session.user.addonStatus === "active";
  const hasAccess = isPro && hasAddon;

  let trialDaysLeft: number | null = null;
  if (isTrialing && session.user.currentPeriodEnd) {
    const end = new Date(session.user.currentPeriodEnd);
    const diffMs = end.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (!hasAccess) {
    // Two distinct CTAs based on what the user is missing.
    const needsPro = !isPro;
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-white">Copy Trading</h1>
          <Link
            href="/chat"
            className="text-sm text-gray-500 hover:text-accent transition-colors"
          >
            &larr; Back to chat
          </Link>
        </div>
        <div className="bg-midnight border border-midnight-light rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">📈</div>
          {needsPro ? (
            <>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Copy Trading erfordert PRO + Add-On
              </h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Starte zuerst deinen 7-tägigen gratis PRO-Trial. Danach kannst
                du das Copy-Trading Add-On (14,99 €/Monat) hinzufügen.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Copy-Trading Add-On hinzufügen
              </h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Du hast PRO. Aktiviere zusätzlich das Copy-Trading Add-On für
                14,99 €/Monat — sofort nutzbar, monatlich kündbar.
              </p>
            </>
          )}
          <Link
            href="/billing"
            className="inline-block bg-accent text-black font-semibold px-6 py-3 rounded-lg hover:bg-accent-dim transition-colors"
          >
            {needsPro ? "PRO-Trial starten" : "Add-On aktivieren"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Copy Trading</h1>
        <Link
          href="/chat"
          className="text-sm text-gray-500 hover:text-accent transition-colors"
        >
          &larr; Back to chat
        </Link>
      </div>

      {isTrialing && trialDaysLeft !== null && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-6 flex items-center justify-between">
          <span className="text-sm text-orange-400">
            Trial endet in {trialDaysLeft} {trialDaysLeft === 1 ? "Tag" : "Tagen"} — jederzeit kündbar
          </span>
          <Link
            href="/billing"
            className="text-sm text-orange-400 hover:text-orange-300 underline"
          >
            Verwalten
          </Link>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-500 hover:text-red-300"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6 text-accent">
          {success}
        </div>
      )}

      {/* Connect Account Form */}
      <div className="bg-midnight border border-midnight-light rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Connect Your Trading Account
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Enter your MT5 broker credentials to start copy trading. Your trades
          will automatically mirror our master account.
        </p>

        <form onSubmit={handleConnect} className="space-y-4">
          {/* Broker Server - Searchable Dropdown */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-1">
              Broker Server
            </label>
            <input
              type="text"
              value={brokerSearch || brokerServer}
              onChange={(e) => {
                setBrokerSearch(e.target.value);
                setBrokerServer("");
                setShowBrokerDropdown(true);
              }}
              onFocus={() => setShowBrokerDropdown(true)}
              placeholder="Search your broker server..."
              className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
            />
            {showBrokerDropdown && brokerSearch && filteredBrokers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-midnight border border-midnight-light rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredBrokers.slice(0, 50).map((broker) => (
                  <button
                    key={broker}
                    type="button"
                    onClick={() => {
                      setBrokerServer(broker);
                      setBrokerSearch(broker);
                      setShowBrokerDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-midnight-light hover:text-white transition-colors"
                  >
                    {broker}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Login Number
              </label>
              <input
                type="text"
                value={loginNumber}
                onChange={(e) => setLoginNumber(e.target.value)}
                placeholder="e.g. 12345678"
                required
                className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your trading account password"
                required
                className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Risk Settings */}
          <div className="bg-midnight-dark border border-midnight-light rounded-lg p-5">
            <h3 className="text-base font-semibold text-white mb-1">
              Risk settings
            </h3>
            <p className="text-sm text-gray-400 mb-2">
              Trading positions will be automatically scaled based on your
              account balance.
            </p>
            <p className="text-sm text-yellow-500/90 mb-4">
              ⚠ It&apos;s recommended to keep the{" "}
              <span className="font-semibold">multiplier at 1x</span> and{" "}
              <span className="font-semibold">daily risk limit at 10%</span>.
              Please also consider your available margin before increasing the
              multiplier.
            </p>

            {!advancedMode && (
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={riskMultiplier}
                onChange={(e) => setRiskMultiplier(parseFloat(e.target.value))}
                className="w-full accent-accent mb-4"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm text-gray-400">Lot size multiplier</p>
                  <span className="group relative inline-flex">
                    <svg
                      className="w-4 h-4 text-gray-500 cursor-help"
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
                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-midnight border border-midnight-light rounded-lg p-3 text-xs text-gray-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      All trades are already automatically scaled based on your
                      account balance. Optionally, you can adjust your risk by
                      changing this additional multiplier. Please use with
                      caution.
                    </span>
                  </span>
                </div>
                {advancedMode ? (
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={advancedMultiplierInput}
                    onChange={(e) =>
                      setAdvancedMultiplierInput(e.target.value)
                    }
                    className="w-full bg-midnight border border-midnight-light rounded-lg px-4 py-3 text-2xl font-bold text-accent focus:outline-none focus:border-accent"
                  />
                ) : (
                  <p className="text-4xl font-bold text-accent">
                    {riskMultiplier % 1 === 0
                      ? riskMultiplier
                      : riskMultiplier.toFixed(1)}
                    x
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm text-gray-400">Daily risk limit</p>
                  <span className="group relative inline-flex">
                    <svg
                      className="w-4 h-4 text-gray-500 cursor-help"
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
                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-midnight border border-midnight-light rounded-lg p-3 text-xs text-gray-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      As an additional safety measure you can set a maximum
                      daily risk limit. If your equity drops below this limit,
                      all positions will be closed. Please note that withdrawals
                      can trigger the limit. Only withdraw when there are no
                      open positions.
                    </span>
                  </span>
                </div>
                {advancedMode ? (
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={advancedRiskLimitInput}
                    onChange={(e) => setAdvancedRiskLimitInput(e.target.value)}
                    className="w-full bg-midnight border border-midnight-light rounded-lg px-4 py-3 text-2xl font-bold text-accent focus:outline-none focus:border-accent"
                  />
                ) : (
                  <p className="text-4xl font-bold text-accent">
                    {Math.round(riskMultiplier * 10)}%
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!advancedMode) {
                  setAdvancedMultiplierInput(riskMultiplier.toString());
                  setAdvancedRiskLimitInput(
                    Math.round(riskMultiplier * 10).toString()
                  );
                }
                setAdvancedMode(!advancedMode);
              }}
              className="flex items-center gap-3 mt-5 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <span
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${
                  advancedMode ? "bg-accent" : "bg-midnight-light"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    advancedMode ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
              Advanced configuration
            </button>
          </div>

          <button
            type="submit"
            disabled={connecting || !brokerServer || !loginNumber || !password}
            className="w-full bg-accent text-black font-semibold py-3 rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect Account"}
          </button>
        </form>
      </div>

      {/* Connected Accounts */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Connected Accounts
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : accounts.length === 0 ? (
          <div className="bg-midnight border border-midnight-light rounded-xl p-8 text-center">
            <p className="text-gray-500">
              No accounts connected yet. Use the form above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const status = statusMap[account.id];
              return (
                <div
                  key={account.id}
                  className="bg-midnight border border-midnight-light rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          account.status === "active"
                            ? "bg-accent"
                            : account.status === "error"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <div>
                        <h3 className="font-semibold text-white">
                          {account.brokerServer}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Login: {account.loginNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          account.status === "active"
                            ? "bg-accent/20 text-accent"
                            : account.status === "error"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {account.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Account Info */}
                  {status && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-midnight-dark rounded-lg p-3">
                        <p className="text-xs text-gray-500">Balance</p>
                        <p className="text-sm font-semibold text-white">
                          ${status.balance?.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-midnight-dark rounded-lg p-3">
                        <p className="text-xs text-gray-500">Equity</p>
                        <p className="text-sm font-semibold text-white">
                          ${status.equity?.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-midnight-dark rounded-lg p-3">
                        <p className="text-xs text-gray-500">Free Margin</p>
                        <p className="text-sm font-semibold text-white">
                          ${status.freeMargin?.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-midnight-dark rounded-lg p-3">
                        <p className="text-xs text-gray-500">Leverage</p>
                        <p className="text-sm font-semibold text-white">
                          {status.leverage}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Multiplier + Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {editingMultiplier === account.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs text-gray-500">
                            Multiplier
                            <input
                              type="number"
                              min="0.1"
                              max="10"
                              step="0.1"
                              value={editMultiplierValue}
                              onChange={(e) =>
                                setEditMultiplierValue(e.target.value)
                              }
                              className="ml-1 w-20 bg-midnight-dark border border-accent rounded px-2 py-1 text-sm text-white focus:outline-none"
                            />
                          </label>
                          <label className="text-xs text-gray-500">
                            Daily limit
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              value={editDailyRiskLimitValue}
                              onChange={(e) =>
                                setEditDailyRiskLimitValue(e.target.value)
                              }
                              className="ml-1 w-20 bg-midnight-dark border border-accent rounded px-2 py-1 text-sm text-white focus:outline-none"
                            />
                            <span className="ml-1 text-gray-500">%</span>
                          </label>
                          <button
                            onClick={() => handleUpdateMultiplier(account.id)}
                            className="text-xs px-2 py-1 rounded bg-accent text-black font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMultiplier(null)}
                            className="text-xs text-gray-500 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingMultiplier(account.id);
                            setEditMultiplierValue(
                              account.riskMultiplier.toString()
                            );
                            setEditDailyRiskLimitValue(
                              Math.round(account.dailyRiskLimit).toString()
                            );
                          }}
                          className="text-sm text-gray-400 hover:text-accent transition-colors"
                        >
                          Multiplier:{" "}
                          <span className="text-accent font-semibold">
                            {account.riskMultiplier}x
                          </span>
                          <span className="mx-2 text-gray-600">•</span>
                          Daily limit:{" "}
                          <span className="text-accent font-semibold">
                            {Math.round(account.dailyRiskLimit)}%
                          </span>{" "}
                          <span className="text-xs text-gray-600">(edit)</span>
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => loadStatus(account.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-midnight-light text-gray-300 hover:bg-midnight-50 transition-colors"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {account.errorMessage && (
                    <p className="text-xs text-red-400 mt-2">
                      {account.errorMessage}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
