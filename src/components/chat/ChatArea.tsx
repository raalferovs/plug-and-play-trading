"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, Channel } from "@/types/chat";
import Avatar from "@/components/Avatar";

interface ChatAreaProps {
  channel: Channel | null;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserRole: string;
  onSendMessage: (content: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

export default function ChatArea({
  channel,
  messages,
  currentUserId,
  currentUserRole,
  onSendMessage,
  onDeleteMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-midnight-dark">
        <p className="text-gray-500">Select a channel to start chatting</p>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  let lastDate = "";

  return (
    <div className="flex-1 flex flex-col bg-midnight-dark">
      {/* Channel Header */}
      <div className="px-4 py-3 border-b border-midnight-light">
        <h2 className="font-semibold text-white">
          <span className="text-gray-500 mr-1">#</span>
          {channel.name}
        </h2>
        {channel.description && (
          <p className="text-xs text-gray-500 mt-0.5">{channel.description}</p>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2"
      >
        {messages.map((msg) => {
          const msgDate = formatDate(msg.createdAt);
          const showDateSeparator = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-midnight-light" />
                  <span className="text-xs text-gray-500 font-medium">
                    {msgDate}
                  </span>
                  <div className="flex-1 h-px bg-midnight-light" />
                </div>
              )}

              {msg.deletedAt ? (
                <div className="py-1 px-2 my-1">
                  <p className="text-xs text-gray-600 italic">
                    {msg.adminDeleted
                      ? "This message was removed by an admin"
                      : "This message was deleted"}
                  </p>
                </div>
              ) : (
                <div className="group flex gap-3 py-1.5 px-2 rounded-lg hover:bg-midnight/50 -mx-2">
                  <Avatar
                    name={msg.user.name}
                    avatarUrl={msg.user.avatarUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm text-white">
                        {msg.user.name}
                      </span>
                      {msg.user.role === "admin" && (
                        <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-medium">
                          ADMIN
                        </span>
                      )}
                      <span className="text-[11px] text-gray-600">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 break-words">
                      {msg.content}
                    </p>
                  </div>

                  {(msg.userId === currentUserId ||
                    currentUserRole === "admin") && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all self-center"
                      title="Delete message"
                    >
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-midnight-light">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channel.name}`}
            className="flex-1 bg-midnight border border-midnight-light rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-accent text-black font-semibold px-4 py-2.5 rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
