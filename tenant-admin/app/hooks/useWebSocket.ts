'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinConversation,
  leaveConversation,
} from '@/services/websocket.service';
import { INBOX_KEY, MESSAGES_KEY } from './useConversations';
import type { MessagesPage, InboxMessage, MessageRole } from '@/types/conversation';

/**
 * Connect to WebSocket on mount, disconnect on unmount.
 * Directly writes incoming messages to React Query cache (no re-fetch).
 */
export function useWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    socket.on('new_message', (payload: {
      conversationId: string;
      message: {
        id?: string;
        role: string;
        content: string;
        senderId?: string;
        senderName?: string;
        metadata?: Record<string, unknown>;
        createdAt: string | Date;
      };
    }) => {
      const { conversationId, message } = payload;

      // Dedup: skip if message already in cache (by ID or optimistic match)
      const existing = queryClient.getQueryData<InfiniteData<MessagesPage>>([MESSAGES_KEY, conversationId]);
      if (existing) {
        const allMsgs = existing.pages.flatMap((p) => p.messages);
        // Skip if exact ID already exists
        if (message.id && allMsgs.some((m) => m.id === message.id)) return;
        // Skip if there's a pending optimistic message with same content+role
        // (WebSocket arrived before onSuccess replaced the optimistic msg)
        if (allMsgs.some((m) =>
          (m.metadata as Record<string, unknown>)?._optimistic &&
          m.role === message.role &&
          m.content === message.content
        )) {
          // Replace the optimistic message with the real one instead of appending
          queryClient.setQueryData<InfiniteData<MessagesPage>>(
            [MESSAGES_KEY, conversationId],
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((msg) =>
                    (msg.metadata as Record<string, unknown>)?._optimistic &&
                    msg.role === message.role &&
                    msg.content === message.content
                      ? {
                          id: message.id || msg.id,
                          conversationId,
                          role: message.role as MessageRole,
                          content: message.content,
                          senderId: message.senderId,
                          createdAt: typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString(),
                          metadata: message.metadata,
                        }
                      : msg,
                  ),
                })),
              };
            },
          );
          return;
        }
      }

      const newMsg: InboxMessage = {
        id: message.id || `_ws_${Date.now()}`,
        conversationId,
        role: message.role as MessageRole,
        content: message.content,
        senderId: message.senderId,
        createdAt: typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString(),
        metadata: message.metadata,
      };

      // Append to first page (latest messages)
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        [MESSAGES_KEY, conversationId],
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          newPages[0] = {
            ...newPages[0],
            messages: [...newPages[0].messages, newMsg],
          };
          return { ...old, pages: newPages };
        },
      );

      // Invalidate inbox (sidebar) + conversation detail (triggers markAsRead)
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONVERSATIONS, conversationId] });
    });

    socket.on('conversation_updated', (payload: { conversationId: string; changes: Record<string, unknown> }) => {
      queryClient.setQueryData([QUERY_KEYS.CONVERSATIONS, payload.conversationId], (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        return { ...old as Record<string, unknown>, ...payload.changes };
      });
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
    });

    socket.on('conversation_created', () => {
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
    });

    socket.on('conversation_handoff', (payload: { conversationId: string }) => {
      queryClient.setQueryData([QUERY_KEYS.CONVERSATIONS, payload.conversationId], (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        return { ...old as Record<string, unknown>, isHandoff: true };
      });
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
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
