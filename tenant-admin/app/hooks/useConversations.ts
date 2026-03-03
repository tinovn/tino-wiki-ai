'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { conversationsService } from '@/services/conversations.service';
import type { ConversationFilter } from '@/types/conversation';

const INBOX_KEY = 'inbox-conversations';
const MESSAGES_KEY = 'conversation-messages';
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
  return useQuery({
    queryKey: [MESSAGES_KEY, id],
    queryFn: () => conversationsService.getMessages(id!),
    enabled: !!id,
  });
}

export function useSendAgentMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      conversationsService.sendMessage(conversationId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
    },
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, agentId }: { conversationId: string; agentId: string }) =>
      conversationsService.assign(conversationId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
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
