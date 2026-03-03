export type MemoryType = 'PREFERENCE' | 'PRODUCT_INTEREST' | 'ISSUE_HISTORY' | 'NOTE' | 'CONTEXT';
export type MemorySource = 'AI_EXTRACTED' | 'AGENT_MANUAL' | 'SYSTEM';
export type MessageRole = 'CUSTOMER' | 'AGENT' | 'AI_ASSISTANT' | 'SYSTEM';

export interface Customer {
  id: string;
  externalId?: string;
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  externalId?: string;
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerMemory {
  id: string;
  customerId: string;
  type: MemoryType;
  key: string;
  value: string;
  source: MemorySource;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryRequest {
  type: MemoryType;
  key: string;
  value: string;
  source?: MemorySource;
  confidence?: number;
}

export interface Conversation {
  id: string;
  customerId: string;
  channel: string;
  status: string;
  startedAt: string;
  endedAt?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface CreateMessageRequest {
  role: MessageRole;
  content: string;
}
