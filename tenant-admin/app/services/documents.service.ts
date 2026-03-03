import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';
import type { Document, CreateDocumentRequest, UpdateDocumentRequest, DocumentQuery, DocumentVersion } from '@/types/document';

export const documentsService = {
  async getAll(params?: DocumentQuery): Promise<ApiResponse<Document[]>> {
    const res = await apiClient.get<ApiResponse<Document[]>>('/documents', { params });
    return res.data;
  },

  async getById(id: string): Promise<Document> {
    const res = await apiClient.get<ApiResponse<Document>>(`/documents/${id}`);
    return res.data.data;
  },

  async create(data: CreateDocumentRequest): Promise<Document> {
    const res = await apiClient.post<ApiResponse<Document>>('/documents', data);
    return res.data.data;
  },

  async update(id: string, data: UpdateDocumentRequest): Promise<Document> {
    const res = await apiClient.patch<ApiResponse<Document>>(`/documents/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  async publish(id: string): Promise<Document> {
    const res = await apiClient.post<ApiResponse<Document>>(`/documents/${id}/publish`);
    return res.data.data;
  },

  async unpublish(id: string): Promise<Document> {
    const res = await apiClient.post<ApiResponse<Document>>(`/documents/${id}/unpublish`);
    return res.data.data;
  },

  async getVersions(id: string): Promise<DocumentVersion[]> {
    const res = await apiClient.get<ApiResponse<DocumentVersion[]>>(`/documents/${id}/versions`);
    return res.data.data;
  },

  async rollback(id: string, version: number): Promise<Document> {
    const res = await apiClient.post<ApiResponse<Document>>(`/documents/${id}/rollback`, { version });
    return res.data.data;
  },

  async bulkPublish(ids: string[]): Promise<{ succeeded: number; failed: number; total: number }> {
    const res = await apiClient.post<ApiResponse<{ succeeded: number; failed: number; total: number }>>('/documents/bulk/publish', { ids });
    return res.data.data;
  },

  async bulkUnpublish(ids: string[]): Promise<{ succeeded: number; failed: number; total: number }> {
    const res = await apiClient.post<ApiResponse<{ succeeded: number; failed: number; total: number }>>('/documents/bulk/unpublish', { ids });
    return res.data.data;
  },

  async bulkDelete(ids: string[]): Promise<{ succeeded: number; failed: number; total: number }> {
    const res = await apiClient.post<ApiResponse<{ succeeded: number; failed: number; total: number }>>('/documents/bulk/delete', { ids });
    return res.data.data;
  },

  async bulkReprocess(force = false): Promise<{ enqueued: number; skipped: number; total: number }> {
    const res = await apiClient.post<ApiResponse<{ enqueued: number; skipped: number; total: number }>>(`/documents/bulk/reprocess?force=${force}`);
    return res.data.data;
  },

  async reprocess(id: string): Promise<{ jobId: string }> {
    const res = await apiClient.post<ApiResponse<{ jobId: string }>>(`/documents/${id}/reprocess`);
    return res.data.data;
  },

  async getIndexingStats(): Promise<{
    totalPublished: number;
    indexed: number;
    pending: number;
    failed: number;
    notProcessed: number;
    vectorCount: number;
    chunks: number;
  }> {
    const res = await apiClient.get<ApiResponse<{
      totalPublished: number;
      indexed: number;
      pending: number;
      failed: number;
      notProcessed: number;
      vectorCount: number;
      chunks: number;
    }>>('/documents/stats/indexing');
    return res.data.data;
  },
};
