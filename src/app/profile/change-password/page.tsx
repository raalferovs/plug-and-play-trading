"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from current password");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/profile/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setSaving(false);
      return;
    }

    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-midnight border border-midnight-light rounded-xl p-6">
        <h1 className="text-2xl font-semibold text-white mb-1">
          Change Password
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          You&apos;ll be signed out and asked to log in again after the password
          is updated.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent text-black font-semibold px-4 py-2 rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
            >
              {saving ? "Updating..." : "Change password"}
            </button>
            <Link
              href="/profile"
              className="bg-midnight-light text-gray-300 px-4 py-2 rounded-lg hover:bg-midnight-50 transition-colors flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <Link
        href="/profile"
        className="inline-block mt-4 text-sm text-gray-500 hover:text-accent transition-colors"
      >
        &larr; Back to profile
      </Link>
    </div>
  );
}
