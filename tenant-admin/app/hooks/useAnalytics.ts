import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics.service';
import type { AnalyticsQueryParams } from '@/types/analytics';
import { QUERY_KEYS } from '@/lib/constants';

export function useDashboardMetrics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, 'dashboard', startDate, endDate],
    queryFn: () => analyticsService.getDashboard(startDate, endDate),
  });
}

export function useQueryLogs(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, 'queries', params],
    queryFn: () => analyticsService.getQueryLogs(params),
  });
}

export function useFailedQueries(page = 1, limit = 20) {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, 'failures', page, limit],
    queryFn: () => analyticsService.getFailedQueries(page, limit),
  });
}

export function useContentGaps(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: [QUERY_KEYS.CONTENT_GAPS, params],
    queryFn: () => analyticsService.getContentGaps(params),
  });
}
