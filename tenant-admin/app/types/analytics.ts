import { PaginationParams } from './api';

export interface DashboardMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  successRate: number;
  avgLatencyMs: number;
  tokenUsage?: TokenUsageSummary;
  queriesByDay?: DailyQueryStats[];
  confidenceDistribution?: ConfidenceRange[];
  recentQueries?: RecentQuery[];
}

export interface TokenUsageSummary {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface DailyQueryStats {
  date: string;
  total: number;
  successful: number;
  failed: number;
}

export interface ConfidenceRange {
  range: string;
  count: number;
  color: string;
}

export interface RecentQuery {
  id: string;
  question: string;
  confidence?: number;
  wasSuccessful: boolean;
  latencyMs?: number;
  createdAt: string;
}

export interface QueryLog {
  id: string;
  question: string;
  answer?: string;
  customerId?: string;
  userId?: string;
  sourceDocIds: string[];
  searchLayers: string[];
  confidence?: number;
  latencyMs?: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
  wasSuccessful: boolean;
  failureReason?: string;
  createdAt: string;
  customer?: { id: string; name?: string };
  feedbacks?: { id: string; type: string }[];
}

export interface ContentGap {
  id: string;
  question: string;
  frequency: number;
  suggestedTitle?: string;
  status: string;
  resolvedDocId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsQueryParams extends PaginationParams {
  wasSuccessful?: boolean;
  startDate?: string;
  endDate?: string;
}
