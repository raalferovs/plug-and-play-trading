"use client";

import { useState, useEffect } from "react";
import { CategoryWithChannels } from "@/types/chat";

export default function ChannelManagement() {
  const [categories, setCategories] = useState<CategoryWithChannels[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const res = await fetch("/api/channels");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }

  async function createCategory() {
    if (!newCategoryName.trim()) return;
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName }),
    });
    setNewCategoryName("");
    loadCategories();
  }

  async function deleteCategory(categoryId: string, categoryName: string) {
    if (
      !confirm(
        `Delete category "${categoryName}" and all its channels? This will also delete all messages in those channels.`
      )
    )
      return;

    await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
    loadCategories();
  }

  async function createChannel() {
    if (!newChannelName.trim() || !selectedCategoryId) return;
    await fetch("/api/admin/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newChannelName,
        description: newChannelDesc,
        categoryId: selectedCategoryId,
      }),
    });
    setNewChannelName("");
    setNewChannelDesc("");
    loadCategories();
  }

  async function deleteChannel(channelId: string, channelName: string) {
    if (
      !confirm(
        `Delete channel "#${channelName}"? This will also delete all messages in it.`
      )
    )
      return;

    await fetch(`/api/admin/channels/${channelId}`, { method: "DELETE" });
    loadCategories();
  }

  if (loading)
    return <p className="text-gray-500">Loading channels...</p>;

  return (
    <div className="space-y-6">
      {/* Add Category */}
      <div className="bg-midnight border border-midnight-light rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Add Category
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="flex-1 bg-midnight-dark border border-midnight-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={createCategory}
            disabled={!newCategoryName.trim()}
            className="bg-accent text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-accent-dim transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Add Channel */}
      <div className="bg-midnight border border-midnight-light rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Add Channel
        </h3>
        <div className="space-y-2">
          <select
            value={selectedCategoryId || ""}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="Channel name"
            className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
          />
          <input
            type="text"
            value={newChannelDesc}
            onChange={(e) => setNewChannelDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={createChannel}
            disabled={!newChannelName.trim() || !selectedCategoryId}
            className="bg-accent text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-accent-dim transition-colors disabled:opacity-50"
          >
            Add Channel
          </button>
        </div>
      </div>

      {/* Category/Channel Tree */}
      {categories.map((category) => (
        <div
          key={category.id}
          className="bg-midnight border border-midnight-light rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">{category.name}</h3>
            <button
              onClick={() => deleteCategory(category.id, category.name)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Delete Category
            </button>
          </div>

          <div className="space-y-1.5">
            {category.channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between bg-midnight-dark rounded-lg px-3 py-2"
              >
                <div>
                  <span className="text-gray-500 mr-1">#</span>
                  <span className="text-sm text-gray-300">{channel.name}</span>
                  {channel.description && (
                    <span className="text-xs text-gray-600 ml-2">
                      — {channel.description}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteChannel(channel.id, channel.name)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
            {category.channels.length === 0 && (
              <p className="text-xs text-gray-600 italic">No channels yet</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
