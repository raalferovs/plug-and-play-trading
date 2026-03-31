"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import {
  CategoryWithChannels,
  ChatMessage,
  OnlineUser,
} from "@/types/chat";
import CategoryRail from "@/components/chat/CategoryRail";
import ChannelList from "@/components/chat/ChannelList";
import ChatArea from "@/components/chat/ChatArea";

export default function ChatPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<CategoryWithChannels[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      const res = await fetch("/api/channels");
      const data = await res.json();
      setCategories(data);

      if (data.length > 0) {
        setActiveCategoryId(data[0].id);
        if (data[0].channels.length > 0) {
          setActiveChannelId(data[0].channels[0].id);
        }
      }
    }
    loadCategories();
  }, []);

  // Socket connection
  useEffect(() => {
    if (!session?.user) return;

    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("user-join", {
        id: session.user.id,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
      });
    });

    socket.on("online-users", (users: OnlineUser[]) => {
      const unique = users.filter(
        (user, index, self) => self.findIndex((u) => u.id === user.id) === index
      );
      setOnlineUsers(unique);
    });

    socket.on("new-message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("message-deleted", (data: { id: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id
            ? { ...msg, deletedAt: new Date().toISOString() }
            : msg
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannelId) return;

    async function loadMessages() {
      const res = await fetch(`/api/messages?channelId=${activeChannelId}`);
      const data = await res.json();
      setMessages(data);
    }
    loadMessages();

    if (socketRef.current) {
      socketRef.current.emit("join-channel", activeChannelId);
    }
  }, [activeChannelId]);

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      setActiveCategoryId(categoryId);
      const category = categories.find((c) => c.id === categoryId);
      if (category && category.channels.length > 0) {
        setActiveChannelId(category.channels[0].id);
      }
      setSidebarOpen(false);
    },
    [categories]
  );

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId);
    setSidebarOpen(false);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeChannelId) return;

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, channelId: activeChannelId }),
      });

      const message = await res.json();
      setMessages((prev) => [...prev, message]);

      if (socketRef.current) {
        socketRef.current.emit("send-message", message);
      }
    },
    [activeChannelId]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      await fetch(`/api/messages/${messageId}`, { method: "DELETE" });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, deletedAt: new Date().toISOString() }
            : msg
        )
      );

      if (socketRef.current && activeChannelId) {
        socketRef.current.emit("delete-message", {
          id: messageId,
          channelId: activeChannelId,
        });
      }
    },
    [activeChannelId]
  );

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const activeChannel = activeCategory?.channels.find(
    (ch) => ch.id === activeChannelId
  );

  if (!session) return null;

  return (
    <div className="h-[calc(100vh-57px)] flex">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-3 left-14 z-50 bg-midnight-light p-2 rounded-lg"
      >
        <svg
          className="w-5 h-5 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              sidebarOpen
                ? "M6 18L18 6M6 6l12 12"
                : "M4 6h16M4 12h16M4 18h16"
            }
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "flex" : "hidden"
        } md:flex fixed md:static inset-0 z-40 md:z-auto`}
      >
        {/* Backdrop for mobile */}
        <div
          className="md:hidden absolute inset-0 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />

        <div className="relative flex z-10">
          <CategoryRail
            categories={categories}
            activeCategoryId={activeCategoryId}
            onSelectCategory={handleSelectCategory}
          />
          {activeCategory && (
            <ChannelList
              channels={activeCategory.channels}
              categoryName={activeCategory.name}
              activeChannelId={activeChannelId}
              onSelectChannel={handleSelectChannel}
              onlineUsers={onlineUsers}
            />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <ChatArea
        channel={activeChannel || null}
        messages={messages}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
      />
    </div>
  );
}
