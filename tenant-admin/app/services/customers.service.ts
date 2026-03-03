import apiClient from '@/lib/api-client';
import type { ApiResponse, PaginationParams } from '@/types/api';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerMemory,
  CreateMemoryRequest,
  Conversation,
  ConversationMessage,
  CreateMessageRequest,
} from '@/types/customer';

export const customersService = {
  async getAll(params?: PaginationParams): Promise<ApiResponse<Customer[]>> {
    const res = await apiClient.get<ApiResponse<Customer[]>>('/customers', { params });
    return res.data;
  },

  async getById(id: string): Promise<Customer> {
    const res = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
    return res.data.data;
  },

  async create(data: CreateCustomerRequest): Promise<Customer> {
    const res = await apiClient.post<ApiResponse<Customer>>('/customers', data);
    return res.data.data;
  },

  async update(id: string, data: UpdateCustomerRequest): Promise<Customer> {
    const res = await apiClient.patch<ApiResponse<Customer>>(`/customers/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
  },

  // Memories
  async getMemories(customerId: string): Promise<CustomerMemory[]> {
    const res = await apiClient.get<ApiResponse<CustomerMemory[]>>(`/customers/${customerId}/memories`);
    return res.data.data;
  },

  async addMemory(customerId: string, data: CreateMemoryRequest): Promise<CustomerMemory> {
    const res = await apiClient.post<ApiResponse<CustomerMemory>>(`/customers/${customerId}/memories`, data);
    return res.data.data;
  },

  async deleteMemory(customerId: string, memoryId: string): Promise<void> {
    await apiClient.delete(`/customers/${customerId}/memories/${memoryId}`);
  },

  // Conversations
  async getConversations(customerId: string): Promise<Conversation[]> {
    const res = await apiClient.get<ApiResponse<Conversation[]>>(`/customers/${customerId}/conversations`);
    return res.data.data;
  },

  async createConversation(customerId: string): Promise<Conversation> {
    const res = await apiClient.post<ApiResponse<Conversation>>(`/customers/${customerId}/conversations`);
    return res.data.data;
  },

  async getMessages(customerId: string, conversationId: string): Promise<ConversationMessage[]> {
    const res = await apiClient.get<ApiResponse<ConversationMessage[]>>(
      `/customers/${customerId}/conversations/${conversationId}/messages`,
    );
    return res.data.data;
  },

  async addMessage(customerId: string, conversationId: string, data: CreateMessageRequest): Promise<ConversationMessage> {
    const res = await apiClient.post<ApiResponse<ConversationMessage>>(
      `/customers/${customerId}/conversations/${conversationId}/messages`,
      data,
    );
    return res.data.data;
  },

  async closeConversation(customerId: string, conversationId: string): Promise<Conversation> {
    const res = await apiClient.post<ApiResponse<Conversation>>(
      `/customers/${customerId}/conversations/${conversationId}/close`,
    );
    return res.data.data;
  },

  async extractPreferences(customerId: string): Promise<{ extracted: unknown[] }> {
    const res = await apiClient.post<ApiResponse<{ extracted: unknown[] }>>(
      `/customers/${customerId}/extract-preferences`,
    );
    return res.data.data;
  },
};
