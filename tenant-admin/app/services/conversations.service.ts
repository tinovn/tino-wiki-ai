import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';
import type {
  InboxConversation,
  ConversationDetail,
  InboxMessage,
  ConversationNote,
  CannedResponse,
  ConversationFilter,
} from '@/types/conversation';

export const conversationsService = {
  async getAll(params?: ConversationFilter): Promise<ApiResponse<InboxConversation[]>> {
    const res = await apiClient.get<ApiResponse<InboxConversation[]>>('/conversations', { params });
    return res.data;
  },

  async getById(id: string): Promise<ConversationDetail> {
    const res = await apiClient.get<ApiResponse<ConversationDetail>>(`/conversations/${id}`);
    return res.data.data;
  },

  async getMessages(id: string, cursor?: string): Promise<InboxMessage[]> {
    const params = cursor ? { cursor } : {};
    const res = await apiClient.get<ApiResponse<InboxMessage[]>>(`/conversations/${id}/messages`, { params });
    return res.data.data;
  },

  async sendMessage(id: string, content: string): Promise<InboxMessage> {
    const res = await apiClient.post<ApiResponse<InboxMessage>>(`/conversations/${id}/messages`, { content });
    return res.data.data;
  },

  async assign(id: string, agentId: string): Promise<void> {
    await apiClient.post(`/conversations/${id}/assign`, { agentId });
  },

  async unassign(id: string): Promise<void> {
    await apiClient.post(`/conversations/${id}/unassign`);
  },

  async update(id: string, data: { priority?: string; labels?: string[] }): Promise<void> {
    await apiClient.patch(`/conversations/${id}`, data);
  },

  async close(id: string): Promise<void> {
    await apiClient.post(`/conversations/${id}/close`);
  },

  async reopen(id: string): Promise<void> {
    await apiClient.post(`/conversations/${id}/reopen`);
  },

  async markRead(id: string): Promise<void> {
    await apiClient.post(`/conversations/${id}/mark-read`);
  },

  async getAiSuggestion(id: string): Promise<{ suggestion: string; confidence: number }> {
    const res = await apiClient.post<ApiResponse<{ suggestion: string; confidence: number }>>(`/conversations/${id}/ai-suggest`);
    return res.data.data;
  },

  async getNotes(id: string): Promise<ConversationNote[]> {
    const res = await apiClient.get<ApiResponse<ConversationNote[]>>(`/conversations/${id}/notes`);
    return res.data.data;
  },

  async addNote(id: string, content: string): Promise<ConversationNote> {
    const res = await apiClient.post<ApiResponse<ConversationNote>>(`/conversations/${id}/notes`, { content });
    return res.data.data;
  },

  async getRelated(id: string): Promise<InboxConversation[]> {
    const res = await apiClient.get<ApiResponse<InboxConversation[]>>(`/conversations/${id}/related`);
    return res.data.data;
  },

  // Canned responses
  async getCannedResponses(): Promise<CannedResponse[]> {
    const res = await apiClient.get<ApiResponse<CannedResponse[]>>('/conversations/canned-responses');
    return res.data.data;
  },

  async createCannedResponse(data: { shortCode: string; title: string; content: string }): Promise<CannedResponse> {
    const res = await apiClient.post<ApiResponse<CannedResponse>>('/conversations/canned-responses', data);
    return res.data.data;
  },
};
