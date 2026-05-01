"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserManagement from "@/components/admin/UserManagement";
import ChannelManagement from "@/components/admin/ChannelManagement";
import Link from "next/link";

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "channels">("users");

  if (!session) return null;

  if (session.user.role !== "admin") {
    router.push("/chat");
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Admin Panel</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/eas"
            className="text-sm text-gray-300 border border-midnight-light hover:border-accent hover:text-accent px-3 py-1.5 rounded-lg transition-colors"
          >
            Manage EAs
          </Link>
          <Link
            href="/chat"
            className="text-sm text-gray-500 hover:text-accent transition-colors"
          >
            &larr; Back to chat
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-midnight rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "bg-midnight-light text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("channels")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "channels"
              ? "bg-midnight-light text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Channels
        </button>
      </div>

      {activeTab === "users" ? <UserManagement /> : <ChannelManagement />}
    </div>
  );
}
