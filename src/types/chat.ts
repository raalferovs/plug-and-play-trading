export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  adminDeleted: boolean;
  userId: string;
  channelId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
    role: string;
  };
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  order: number;
}

export interface CategoryWithChannels {
  id: string;
  name: string;
  icon: string;
  order: number;
  channels: Channel[];
}

export interface OnlineUser {
  id: string;
  name: string;
  avatarUrl: string;
}
