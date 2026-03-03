export type ConversationStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type ConversationPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type MessageRole = 'CUSTOMER' | 'AGENT' | 'AI_ASSISTANT' | 'SYSTEM';
export type ConversationView = 'mine' | 'unassigned' | 'all';

export interface InboxConversation {
  id: string;
  customer: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
  };
  channel: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  labels: string[];
  isHandoff: boolean;
  assignedAgentId?: string;
  assignedAgent?: { id: string; displayName: string; email: string };
  lastMessage?: { content: string; role: MessageRole; createdAt: string };
  lastMessageAt?: string;
  unreadCount: number;
  startedAt: string;
}

export interface ConversationDetail extends InboxConversation {
  handoffReason?: string;
  customer: InboxConversation['customer'] & {
    memories?: Array<{
      id: string;
      type: string;
      key: string;
      value: string;
      source: string;
      confidence: number;
    }>;
  };
}

export interface InboxMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  senderId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MessagesPage {
  messages: InboxMessage[];
  nextCursor: string | null; // ISO date of oldest message, null = no more
}

export interface ConversationNote {
  id: string;
  userId: string;
  user: { id: string; displayName: string };
  content: string;
  createdAt: string;
}

export interface CannedResponse {
  id: string;
  shortCode: string;
  title: string;
  content: string;
  author: { id: string; displayName: string };
  createdAt: string;
}

export interface ConversationFilter {
  view: ConversationView;
  channel?: string;
  status?: ConversationStatus;
  search?: string;
  page?: number;
  limit?: number;
}
