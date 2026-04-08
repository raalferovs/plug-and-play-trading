"use client";

import { useState, useEffect } from "react";
import { CategoryWithChannels } from "@/types/chat";

export default function ChannelManagement() {
  const [categories, setCategories] = useState<CategoryWithChannels[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📁");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [editingIconCategoryId, setEditingIconCategoryId] = useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingChannelName, setEditingChannelName] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelPremium, setNewChannelPremium] = useState(false);
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

  const emojiOptions = [
    "📁", "👥", "📈", "📊", "🎯", "💰", "🔔", "💬", "🏆", "📣",
    "⚡", "🔥", "💎", "🚀", "📉", "🛡️", "🎓", "🤝", "📰", "⭐",
  ];

  async function createCategory() {
    if (!newCategoryName.trim()) return;
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName, icon: newCategoryIcon }),
    });
    setNewCategoryName("");
    setNewCategoryIcon("📁");
    setEmojiPickerOpen(false);
    loadCategories();
  }

  async function updateCategoryIcon(categoryId: string, icon: string) {
    await fetch(`/api/admin/categories/${categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon }),
    });
    setEditingIconCategoryId(null);
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
        isPremium: newChannelPremium,
      }),
    });
    setNewChannelName("");
    setNewChannelDesc("");
    setNewChannelPremium(false);
    loadCategories();
  }

  async function renameChannel(channelId: string) {
    if (!editingChannelName.trim()) return;
    await fetch(`/api/admin/channels/${channelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingChannelName }),
    });
    setEditingChannelId(null);
    setEditingChannelName("");
    loadCategories();
  }

  async function togglePremium(channelId: string, currentValue: boolean) {
    await fetch(`/api/admin/channels/${channelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPremium: !currentValue }),
    });
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
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                className="w-10 h-10 bg-midnight-dark border border-midnight-light rounded-lg flex items-center justify-center text-xl hover:border-accent transition-colors"
                title="Choose icon"
              >
                {newCategoryIcon}
              </button>
              {emojiPickerOpen && (
                <div className="absolute top-12 left-0 z-50 bg-midnight border border-midnight-light rounded-lg p-2 shadow-lg grid grid-cols-5 gap-1 w-52">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNewCategoryIcon(emoji);
                        setEmojiPickerOpen(false);
                      }}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-midnight-light transition-colors ${
                        newCategoryIcon === emoji ? "bg-accent/20 ring-1 ring-accent" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={newChannelPremium}
              onChange={(e) => setNewChannelPremium(e.target.checked)}
              className="rounded border-midnight-light accent-accent"
            />
            Premium (Pro users only)
          </label>
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
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() =>
                    setEditingIconCategoryId(
                      editingIconCategoryId === category.id ? null : category.id
                    )
                  }
                  className="w-8 h-8 rounded-lg bg-midnight-dark border border-midnight-light flex items-center justify-center text-base hover:border-accent transition-colors"
                  title="Change icon"
                >
                  {category.icon || "📁"}
                </button>
                {editingIconCategoryId === category.id && (
                  <div className="absolute top-10 left-0 z-50 bg-midnight border border-midnight-light rounded-lg p-2 shadow-lg grid grid-cols-5 gap-1 w-52">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => updateCategoryIcon(category.id, emoji)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-midnight-light transition-colors ${
                          category.icon === emoji ? "bg-accent/20 ring-1 ring-accent" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-white">{category.name}</h3>
            </div>
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
                {editingChannelId === channel.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      renameChannel(channel.id);
                    }}
                    className="flex items-center gap-2 flex-1 mr-2"
                  >
                    <span className="text-gray-500">#</span>
                    <input
                      type="text"
                      value={editingChannelName}
                      onChange={(e) => setEditingChannelName(e.target.value)}
                      autoFocus
                      className="flex-1 bg-midnight border border-accent rounded px-2 py-1 text-sm text-white focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditingChannelId(null);
                          setEditingChannelName("");
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 rounded bg-accent text-black font-semibold hover:bg-accent-dim transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingChannelId(null);
                        setEditingChannelName("");
                      }}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">#</span>
                      <span className="text-sm text-gray-300">{channel.name}</span>
                      {channel.isPremium && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-medium">
                          PRO
                        </span>
                      )}
                      {channel.description && (
                        <span className="text-xs text-gray-600">
                          — {channel.description}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePremium(channel.id, channel.isPremium)}
                        className={`text-xs transition-colors ${
                          channel.isPremium
                            ? "text-yellow-400 hover:text-yellow-300"
                            : "text-gray-500 hover:text-yellow-400"
                        }`}
                      >
                        {channel.isPremium ? "Remove Pro" : "Set Pro"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingChannelId(channel.id);
                          setEditingChannelName(channel.name);
                        }}
                        className="text-xs text-gray-500 hover:text-accent transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => deleteChannel(channel.id, channel.name)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
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
