import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import type { PaginationParams } from '@/types/api';
import type { CreateCustomerRequest, UpdateCustomerRequest, CreateMemoryRequest, CreateMessageRequest } from '@/types/customer';
import { QUERY_KEYS } from '@/lib/constants';

export function useCustomers(params?: PaginationParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.CUSTOMERS, params],
    queryFn: () => customersService.getAll(params),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.CUSTOMERS, id],
    queryFn: () => customersService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => customersService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOMERS] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerRequest }) => customersService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOMERS] }),
  });
}

export function useCustomerMemories(customerId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.MEMORIES, customerId],
    queryFn: () => customersService.getMemories(customerId),
    enabled: !!customerId,
  });
}

export function useAddMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: CreateMemoryRequest }) =>
      customersService.addMemory(customerId, data),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.MEMORIES, customerId] }),
  });
}

export function useCustomerConversations(customerId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.CONVERSATIONS, customerId],
    queryFn: () => customersService.getConversations(customerId),
    enabled: !!customerId,
  });
}

export function useConversationMessages(customerId: string, conversationId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.CONVERSATIONS, customerId, conversationId, 'messages'],
    queryFn: () => customersService.getMessages(customerId, conversationId),
    enabled: !!customerId && !!conversationId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      conversationId,
      data,
    }: {
      customerId: string;
      conversationId: string;
      data: CreateMessageRequest;
    }) => customersService.addMessage(customerId, conversationId, data),
    onSuccess: (_, { customerId, conversationId }) =>
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CONVERSATIONS, customerId, conversationId, 'messages'] }),
  });
}
