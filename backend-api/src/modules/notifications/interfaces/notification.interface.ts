export interface NotificationPayload {
  tenantId: string;
  tenantDatabaseUrl: string;
  type: 'new_message' | 'handoff' | 'assignment' | 'conversation_created';
  title: string;
  body: string;
  data: Record<string, unknown>;
  targetUserIds?: string[]; // Specific agents to notify; if empty, notify all tenant agents
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data: Record<string, unknown>;
}
