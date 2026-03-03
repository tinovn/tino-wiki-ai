import apiClient from '@/lib/api-client';
import type { ApiResponse, PaginationParams } from '@/types/api';
import type { User, CreateUserRequest, UpdateUserRequest } from '@/types/user';

export const usersService = {
  async getAll(params?: PaginationParams): Promise<ApiResponse<User[]>> {
    const res = await apiClient.get<ApiResponse<User[]>>('/users', { params });
    return res.data;
  },

  async getById(id: string): Promise<User> {
    const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return res.data.data;
  },

  async create(data: CreateUserRequest): Promise<User> {
    const res = await apiClient.post<ApiResponse<User>>('/users', data);
    return res.data.data;
  },

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
