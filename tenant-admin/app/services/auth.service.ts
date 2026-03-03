import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';
import type { LoginRequest, RegisterRequest, TokenResponse } from '@/types/auth';

export const authService = {
  async login(data: LoginRequest): Promise<TokenResponse> {
    const res = await apiClient.post<ApiResponse<TokenResponse>>('/auth/login', data);
    return res.data.data;
  },

  async register(data: RegisterRequest): Promise<TokenResponse> {
    const res = await apiClient.post<ApiResponse<TokenResponse>>('/auth/register', data);
    return res.data.data;
  },
};
