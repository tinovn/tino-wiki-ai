export interface ConversationNewMessagePayload {
  tenantId: string;
  tenantDatabaseUrl: string;
  conversationId: string;
  customerId: string;
  message: {
    id?: string;
    role: string;
    content: string;
    senderId?: string;
    senderName?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
  };
}

export interface ConversationUpdatedPayload {
  tenantId: string;
  conversationId: string;
  changes: Record<string, unknown>;
}

export interface ConversationHandoffPayload {
  tenantId: string;
  tenantDatabaseUrl: string;
  conversationId: string;
  customerId: string;
  reason: string;
}

export interface ConversationEcommercePayload {
  tenantId: string;
  conversationId: string;
  customerId: string;
  event: 'cart_updated' | 'order_created' | 'intent_detected';
  data: Record<string, unknown>;
}

export const CONVERSATION_EVENTS = {
  NEW_MESSAGE: 'conversation.new_message',
  UPDATED: 'conversation.updated',
  CREATED: 'conversation.created',
  HANDOFF: 'conversation.handoff',
  ECOMMERCE: 'conversation.ecommerce',
} as const;
