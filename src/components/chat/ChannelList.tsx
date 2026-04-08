"use client";

import { Channel, OnlineUser } from "@/types/chat";
import Avatar from "@/components/Avatar";

interface ChannelListProps {
  channels: Channel[];
  categoryName: string;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onlineUsers: OnlineUser[];
}

export default function ChannelList({
  channels,
  categoryName,
  activeChannelId,
  onSelectChannel,
  onlineUsers,
}: ChannelListProps) {
  return (
    <div className="w-56 bg-midnight-dark flex flex-col border-r border-midnight-light">
      <div className="p-4 border-b border-midnight-light">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          {categoryName}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {channels.map((channel) => {
          const isActive = channel.id === activeChannelId;
          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 transition-colors ${
                isActive
                  ? "bg-midnight-light text-white"
                  : "text-gray-400 hover:bg-midnight hover:text-gray-200"
              }`}
            >
              <span className="text-gray-500 mr-1">#</span>
              {channel.name}
              {channel.isPremium && (
                <svg
                  className="w-3.5 h-3.5 text-yellow-500 ml-1.5 inline-block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-midnight-light p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Online — {onlineUsers.length}
        </h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {onlineUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              <div className="relative">
                <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-accent rounded-full border-2 border-midnight-dark" />
              </div>
              <span className="text-xs text-gray-400 truncate">
                {user.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
