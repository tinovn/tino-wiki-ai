import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';
import type { DashboardMetrics, QueryLog, ContentGap, AnalyticsQueryParams } from '@/types/analytics';

export const analyticsService = {
  async getDashboard(startDate?: string, endDate?: string): Promise<DashboardMetrics> {
    const res = await apiClient.get<ApiResponse<DashboardMetrics>>('/analytics/dashboard', {
      params: { startDate, endDate },
    });
    return res.data.data;
  },

  async getQueryLogs(params?: AnalyticsQueryParams): Promise<ApiResponse<QueryLog[]>> {
    const res = await apiClient.get<ApiResponse<QueryLog[]>>('/analytics/queries', { params });
    return res.data;
  },

  async getFailedQueries(page = 1, limit = 20): Promise<ApiResponse<QueryLog[]>> {
    const res = await apiClient.get<ApiResponse<QueryLog[]>>('/analytics/queries/failures', {
      params: { page, limit },
    });
    return res.data;
  },

  async getContentGaps(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<ContentGap[]>> {
    const res = await apiClient.get<ApiResponse<ContentGap[]>>('/analytics/content-gaps', { params });
    return res.data;
  },

  async updateContentGap(id: string, data: { status?: string; resolvedDocId?: string }): Promise<ContentGap> {
    const res = await apiClient.patch<ApiResponse<ContentGap>>(`/analytics/content-gaps/${id}`, data);
    return res.data.data;
  },
};
