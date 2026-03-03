import { PaginationParams } from './api';

export type CrawlSourceType = 'URL' | 'SITEMAP' | 'RSS' | 'API';
export type CrawlSourceStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';
export type CrawlJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type CrawlResultStatus = 'SUCCESS' | 'SKIPPED' | 'FAILED';

export interface CrawlSource {
  id: string;
  name: string;
  type: CrawlSourceType;
  url: string;
  config: Record<string, any>;
  categoryId?: string;
  tagIds: string[];
  schedule?: string;
  status: CrawlSourceStatus;
  lastCrawlAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; displayName: string };
  category?: { id: string; name: string };
  _count?: { jobs: number };
}

export interface CrawlJob {
  id: string;
  sourceId: string;
  status: CrawlJobStatus;
  totalUrls: number;
  processedUrls: number;
  newDocuments: number;
  updatedDocs: number;
  skippedUrls: number;
  failedUrls: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  source?: { id: string; name: string; type: string; url: string };
  _count?: { results: number };
}

export interface CrawlResult {
  id: string;
  jobId: string;
  url: string;
  status: CrawlResultStatus;
  title?: string;
  contentHash?: string;
  documentId?: string;
  error?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CreateCrawlSourceRequest {
  name: string;
  type: CrawlSourceType;
  url: string;
  config?: Record<string, any>;
  categoryId?: string;
  tagIds?: string[];
  schedule?: string;
}

export interface UpdateCrawlSourceRequest {
  name?: string;
  url?: string;
  config?: Record<string, any>;
  categoryId?: string;
  tagIds?: string[];
  schedule?: string;
  status?: CrawlSourceStatus;
}

export interface CrawlSourceQuery extends PaginationParams {
  type?: CrawlSourceType;
  status?: CrawlSourceStatus;
  search?: string;
}
