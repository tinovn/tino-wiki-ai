import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';
import type {
  CrawlSource,
  CrawlJob,
  CrawlResult,
  CreateCrawlSourceRequest,
  UpdateCrawlSourceRequest,
  CrawlSourceQuery,
} from '@/types/crawler';

export const crawlerService = {
  // Sources
  async getSources(params?: CrawlSourceQuery): Promise<ApiResponse<CrawlSource[]>> {
    const res = await apiClient.get<ApiResponse<CrawlSource[]>>('/crawler/sources', { params });
    return res.data;
  },

  async getSourceById(id: string): Promise<CrawlSource> {
    const res = await apiClient.get<ApiResponse<CrawlSource>>(`/crawler/sources/${id}`);
    return res.data.data;
  },

  async createSource(data: CreateCrawlSourceRequest): Promise<CrawlSource> {
    const res = await apiClient.post<ApiResponse<CrawlSource>>('/crawler/sources', data);
    return res.data.data;
  },

  async updateSource(id: string, data: UpdateCrawlSourceRequest): Promise<CrawlSource> {
    const res = await apiClient.patch<ApiResponse<CrawlSource>>(`/crawler/sources/${id}`, data);
    return res.data.data;
  },

  async deleteSource(id: string): Promise<void> {
    await apiClient.delete(`/crawler/sources/${id}`);
  },

  // Crawl trigger
  async triggerCrawl(sourceId: string): Promise<CrawlJob> {
    const res = await apiClient.post<ApiResponse<CrawlJob>>(`/crawler/sources/${sourceId}/crawl`);
    return res.data.data;
  },

  async triggerRecrawl(sourceId: string): Promise<CrawlJob> {
    const res = await apiClient.post<ApiResponse<CrawlJob>>(`/crawler/sources/${sourceId}/recrawl`);
    return res.data.data;
  },

  // Jobs
  async getJobs(sourceId: string, page = 1, limit = 20): Promise<ApiResponse<CrawlJob[]>> {
    const res = await apiClient.get<ApiResponse<CrawlJob[]>>(`/crawler/sources/${sourceId}/jobs`, {
      params: { page, limit },
    });
    return res.data;
  },

  async getJobDetail(jobId: string): Promise<CrawlJob> {
    const res = await apiClient.get<ApiResponse<CrawlJob>>(`/crawler/jobs/${jobId}`);
    return res.data.data;
  },

  async getJobResults(jobId: string, page = 1, limit = 50): Promise<ApiResponse<CrawlResult[]>> {
    const res = await apiClient.get<ApiResponse<CrawlResult[]>>(`/crawler/jobs/${jobId}/results`, {
      params: { page, limit },
    });
    return res.data;
  },
};
