"use client";

import { useState, useEffect } from "react";
import Avatar from "@/components/Avatar";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  createdAt: string;
  _count: { messages: number };
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "user" : "admin";
    await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }

  async function deleteUser(userId: string, userName: string) {
    if (!confirm(`Delete user "${userName}"? This will also delete all their messages.`)) return;

    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  if (loading) return <p className="text-gray-500">Loading users...</p>;

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between bg-midnight border border-midnight-light rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{user.name}</span>
                {user.role === "admin" && (
                  <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-medium">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {user.email} &middot; {user._count.messages} messages
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => toggleRole(user.id, user.role)}
              className="text-xs px-3 py-1.5 rounded-lg bg-midnight-light text-gray-300 hover:bg-midnight-50 transition-colors"
            >
              {user.role === "admin" ? "Remove Admin" : "Make Admin"}
            </button>
            <button
              onClick={() => deleteUser(user.id, user.name)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
