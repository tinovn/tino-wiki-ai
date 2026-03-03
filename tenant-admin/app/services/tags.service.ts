import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';
import type { Tag, CreateTagRequest } from '@/types/tag';

export const tagsService = {
  async getAll(): Promise<Tag[]> {
    const res = await apiClient.get<ApiResponse<Tag[]>>('/tags');
    return res.data.data;
  },

  async create(data: CreateTagRequest): Promise<Tag> {
    const res = await apiClient.post<ApiResponse<Tag>>('/tags', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<CreateTagRequest>): Promise<Tag> {
    const res = await apiClient.patch<ApiResponse<Tag>>(`/tags/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tags/${id}`);
  },
};
