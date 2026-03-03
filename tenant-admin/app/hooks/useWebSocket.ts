'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinConversation,
  leaveConversation,
} from '@/services/websocket.service';

/**
 * Connect to WebSocket on mount, disconnect on unmount.
 */
export function useWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    // Listen for new messages → invalidate queries
    socket.on('new_message', (payload: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', payload.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    });

    socket.on('conversation_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    });

    socket.on('conversation_created', () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    });

    socket.on('conversation_handoff', () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    });

    return () => {
      disconnectSocket();
    };
  }, [queryClient]);
}

/**
 * Join/leave a specific conversation room for real-time updates.
 */
export function useConversationSocket(conversationId: string | null) {
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (prevId.current && prevId.current !== conversationId) {
      leaveConversation(prevId.current);
    }
    if (conversationId) {
      joinConversation(conversationId);
    }
    prevId.current = conversationId;

    return () => {
      if (conversationId) {
        leaveConversation(conversationId);
      }
    };
  }, [conversationId]);

  const onTyping = useCallback((callback: (data: { userId: string; displayName: string; isTyping: boolean }) => void) => {
    const socket = getSocket();
    socket?.on('typing', callback);
    return () => {
      socket?.off('typing', callback);
    };
  }, []);

  return { onTyping };
}
