import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';
import type { Category, CreateCategoryRequest } from '@/types/category';

export const categoriesService = {
  async getAll(): Promise<Category[]> {
    const res = await apiClient.get<ApiResponse<Category[]>>('/categories');
    return res.data.data;
  },

  async getById(id: string): Promise<Category> {
    const res = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
    return res.data.data;
  },

  async create(data: CreateCategoryRequest): Promise<Category> {
    const res = await apiClient.post<ApiResponse<Category>>('/categories', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<CreateCategoryRequest>): Promise<Category> {
    const res = await apiClient.patch<ApiResponse<Category>>(`/categories/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};
