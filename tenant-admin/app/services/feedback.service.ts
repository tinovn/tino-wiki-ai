import apiClient from '@/lib/api-client';
import type { ApiResponse, PaginationParams } from '@/types/api';
import type { Feedback, CreateFeedbackRequest, FeedbackSummary } from '@/types/feedback';

export const feedbackService = {
  async getAll(params?: PaginationParams): Promise<ApiResponse<Feedback[]>> {
    const res = await apiClient.get<ApiResponse<Feedback[]>>('/feedback', { params });
    return res.data;
  },

  async create(data: CreateFeedbackRequest): Promise<Feedback> {
    const res = await apiClient.post<ApiResponse<Feedback>>('/feedback', data);
    return res.data.data;
  },

  async getSummary(): Promise<FeedbackSummary> {
    const res = await apiClient.get<ApiResponse<FeedbackSummary>>('/feedback/summary');
    return res.data.data;
  },

  async getByDocument(documentId: string): Promise<Feedback[]> {
    const res = await apiClient.get<ApiResponse<Feedback[]>>(`/feedback/documents/${documentId}`);
    return res.data.data;
  },
};
