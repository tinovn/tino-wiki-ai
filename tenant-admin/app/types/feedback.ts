import { PaginationParams } from './api';

export type FeedbackType = 'GOOD' | 'BAD' | 'PARTIALLY_CORRECT' | 'WRONG_SOURCE' | 'OUTDATED';

export interface Feedback {
  id: string;
  queryLogId: string;
  documentId?: string;
  userId: string;
  type: FeedbackType;
  comment?: string;
  createdAt: string;
  queryLog?: { id: string; question: string };
  document?: { id: string; title: string };
  user?: { id: string; displayName: string };
}

export interface CreateFeedbackRequest {
  queryLogId: string;
  documentId?: string;
  type: FeedbackType;
  comment?: string;
}

export interface FeedbackSummary {
  total: number;
  byType: Record<FeedbackType, number>;
  averageScore: number;
}
