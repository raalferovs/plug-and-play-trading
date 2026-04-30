"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatarUrl: string;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { update } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setProfile(data);
      setName(data.name);
      setBio(data.bio);
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio }),
    });
    const data = await res.json();
    setProfile((prev) => (prev ? { ...prev, ...data } : prev));
    setEditing(false);
    setSaving(false);
    setMessage("Profile updated!");
    await update();
    setTimeout(() => setMessage(""), 3000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setProfile((prev) => (prev ? { ...prev, avatarUrl: data.avatarUrl } : prev));
    setMessage("Avatar updated!");
    await update();
    setTimeout(() => setMessage(""), 3000);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-midnight via-midnight-light to-accent/20 rounded-t-xl h-32 relative" />

      <div className="bg-midnight border border-midnight-light border-t-0 rounded-b-xl p-6 -mt-1">
        {/* Avatar */}
        <div className="-mt-16 mb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
          >
            <div className="w-24 h-24 rounded-full border-4 border-midnight overflow-hidden">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-accent flex items-center justify-center text-black text-3xl font-semibold">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        {message && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-accent text-sm mb-4">
            {message}
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-colors resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-accent text-black font-semibold px-4 py-2 rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(profile.name);
                  setBio(profile.bio);
                }}
                className="bg-midnight-light text-gray-300 px-4 py-2 rounded-lg hover:bg-midnight-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-white">
                {profile.name}
              </h1>
              {profile.role === "admin" && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-medium">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-1">{profile.email}</p>
            <p className="text-gray-300 mt-3">
              {profile.bio || "No bio yet."}
            </p>
            <p className="text-xs text-gray-600 mt-4">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString([], {
                month: "long",
                year: "numeric",
              })}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="bg-midnight-light text-gray-300 px-4 py-2 rounded-lg hover:bg-midnight-50 transition-colors text-sm"
              >
                Edit Profile
              </button>
              <Link
                href="/profile/change-password"
                className="bg-midnight-light text-gray-300 px-4 py-2 rounded-lg hover:bg-midnight-50 transition-colors text-sm"
              >
                Change Password
              </Link>
              <Link
                href="/licenses"
                className="bg-midnight-light text-gray-300 px-4 py-2 rounded-lg hover:bg-midnight-50 transition-colors text-sm"
              >
                Manage License
              </Link>
            </div>
          </div>
        )}
      </div>

      <Link
        href="/chat"
        className="inline-block mt-4 text-sm text-gray-500 hover:text-accent transition-colors"
      >
        &larr; Back to chat
      </Link>
    </div>
  );
}
