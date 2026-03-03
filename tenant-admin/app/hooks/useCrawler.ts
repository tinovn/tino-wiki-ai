import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crawlerService } from '@/services/crawler.service';
import type { CrawlSourceQuery, CreateCrawlSourceRequest, UpdateCrawlSourceRequest } from '@/types/crawler';
import { QUERY_KEYS } from '@/lib/constants';

export function useCrawlSources(params?: CrawlSourceQuery) {
  return useQuery({
    queryKey: [QUERY_KEYS.CRAWL_SOURCES, params],
    queryFn: () => crawlerService.getSources(params),
  });
}

export function useCrawlSource(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.CRAWL_SOURCES, id],
    queryFn: () => crawlerService.getSourceById(id),
    enabled: !!id,
  });
}

export function useCreateCrawlSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCrawlSourceRequest) => crawlerService.createSource(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.CRAWL_SOURCES] }),
  });
}

export function useUpdateCrawlSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCrawlSourceRequest }) =>
      crawlerService.updateSource(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CRAWL_SOURCES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CRAWL_SOURCES, id] });
    },
  });
}

export function useDeleteCrawlSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crawlerService.deleteSource(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.CRAWL_SOURCES] }),
  });
}

export function useTriggerCrawl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => crawlerService.triggerCrawl(sourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CRAWL_SOURCES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CRAWL_JOBS] });
    },
  });
}

export function useTriggerRecrawl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => crawlerService.triggerRecrawl(sourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CRAWL_SOURCES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CRAWL_JOBS] });
    },
  });
}

export function useCrawlJobs(sourceId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: [QUERY_KEYS.CRAWL_JOBS, sourceId, page, limit],
    queryFn: () => crawlerService.getJobs(sourceId, page, limit),
    enabled: !!sourceId,
  });
}

export function useCrawlJobDetail(jobId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.CRAWL_JOBS, jobId],
    queryFn: () => crawlerService.getJobDetail(jobId),
    enabled: !!jobId,
  });
}

export function useCrawlJobResults(jobId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: [QUERY_KEYS.CRAWL_JOBS, jobId, 'results', page],
    queryFn: () => crawlerService.getJobResults(jobId, page, limit),
    enabled: !!jobId,
  });
}
