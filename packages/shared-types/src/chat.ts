export type ChatChannel = "web" | "whatsapp";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  channel: ChatChannel;
  attachments?: string[];
  createdAt: Date;
}

export interface Conversation {
  id: string;
  organizationId: string;
  userId?: string | null;
  channel: ChatChannel;
  createdAt: Date;
  updatedAt: Date;
}
