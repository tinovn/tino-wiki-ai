'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { conversationsService } from '@/services/conversations.service';
import type { ConversationFilter, MessagesPage, InboxMessage } from '@/types/conversation';

export const INBOX_KEY = 'inbox-conversations';
export const MESSAGES_KEY = 'conversation-messages';
const NOTES_KEY = 'conversation-notes';

export function useInboxConversations(filter: ConversationFilter) {
  return useQuery({
    queryKey: [INBOX_KEY, filter],
    queryFn: () => conversationsService.getAll(filter),
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEYS.CONVERSATIONS, id],
    queryFn: () => conversationsService.getById(id!),
    enabled: !!id,
  });
}

export function useConversationMessages(id: string | null) {
  return useInfiniteQuery<MessagesPage>({
    queryKey: [MESSAGES_KEY, id],
    queryFn: ({ pageParam }) =>
      conversationsService.getMessages(id!, pageParam as string | undefined),
    enabled: !!id,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useSendAgentMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      conversationsService.sendMessage(conversationId, content),

    onMutate: async ({ conversationId, content }) => {
      await queryClient.cancelQueries({ queryKey: [MESSAGES_KEY, conversationId] });

      const previous = queryClient.getQueryData<InfiniteData<MessagesPage>>([MESSAGES_KEY, conversationId]);

      const optimisticMsg: InboxMessage = {
        id: `_opt_${Date.now()}`,
        conversationId,
        role: 'AGENT',
        content,
        createdAt: new Date().toISOString(),
        metadata: { _optimistic: true },
      };

      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        [MESSAGES_KEY, conversationId],
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          newPages[0] = {
            ...newPages[0],
            messages: [...newPages[0].messages, optimisticMsg],
          };
          return { ...old, pages: newPages };
        },
      );

      return { previous };
    },

    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([MESSAGES_KEY, variables.conversationId], context.previous);
      }
    },

    onSuccess: (serverMsg, variables) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        [MESSAGES_KEY, variables.conversationId],
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page, i) => {
            if (i !== 0) return page;
            return {
              ...page,
              messages: page.messages.map((msg) =>
                (msg.metadata as Record<string, unknown>)?._optimistic
                  ? { ...serverMsg, conversationId: variables.conversationId }
                  : msg,
              ),
            };
          });
          return { ...old, pages: newPages };
        },
      );
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
    },
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, agentId }: { conversationId: string; agentId: string }) =>
      conversationsService.assign(conversationId, agentId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONVERSATIONS, conversationId] });
    },
  });
}

export function useUnassignConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsService.unassign(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONVERSATIONS, conversationId] });
    },
  });
}

export function useResumeAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsService.resumeAi(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONVERSATIONS, conversationId] });
    },
  });
}

export function useCloseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => conversationsService.close(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
    },
  });
}

export function useReopenConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => conversationsService.reopen(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: string; data: { priority?: string; labels?: string[] } }) =>
      conversationsService.update(conversationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
    },
  });
}

export function useAiSuggestion() {
  return useMutation({
    mutationFn: (conversationId: string) => conversationsService.getAiSuggestion(conversationId),
  });
}

export function useRelatedConversations(id: string | null) {
  return useQuery({
    queryKey: ['related-conversations', id],
    queryFn: () => conversationsService.getRelated(id!),
    enabled: !!id,
  });
}

export function useConversationNotes(id: string | null) {
  return useQuery({
    queryKey: [NOTES_KEY, id],
    queryFn: () => conversationsService.getNotes(id!),
    enabled: !!id,
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      conversationsService.addNote(conversationId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY, variables.conversationId] });
    },
  });
}
