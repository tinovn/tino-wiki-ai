import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '@/services/feedback.service';
import type { PaginationParams } from '@/types/api';
import type { CreateFeedbackRequest } from '@/types/feedback';
import { QUERY_KEYS } from '@/lib/constants';

export function useFeedbackList(params?: PaginationParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.FEEDBACK, params],
    queryFn: () => feedbackService.getAll(params),
  });
}

export function useFeedbackSummary() {
  return useQuery({
    queryKey: [QUERY_KEYS.FEEDBACK, 'summary'],
    queryFn: () => feedbackService.getSummary(),
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeedbackRequest) => feedbackService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.FEEDBACK] }),
  });
}

export function useDocumentFeedback(documentId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.FEEDBACK, 'document', documentId],
    queryFn: () => feedbackService.getByDocument(documentId),
    enabled: !!documentId,
  });
}
