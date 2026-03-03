import apiClient from '@/lib/api-client';

export interface HealthStatus {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string; message?: string }>;
}

export const healthService = {
  async check(): Promise<HealthStatus> {
    const res = await apiClient.get<HealthStatus>('/health');
    return res.data;
  },
};
