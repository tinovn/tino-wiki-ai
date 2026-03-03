'use client';

import { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import ConversationList from '@/components/conversations/ConversationList';
import ChatPanel from '@/components/conversations/ChatPanel';
import CustomerDetailsPanel from '@/components/conversations/CustomerDetailsPanel';

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Initialize WebSocket connection
  useWebSocket();

  return (
    <div className="inbox-container">
      <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
      <ChatPanel conversationId={selectedId} />
      <CustomerDetailsPanel conversationId={selectedId} />
    </div>
  );
}
