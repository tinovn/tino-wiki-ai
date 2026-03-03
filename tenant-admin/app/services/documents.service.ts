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
};
