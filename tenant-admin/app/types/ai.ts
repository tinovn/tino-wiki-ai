export interface AiQueryRequest {
  question: string;
  customerId?: string;
  conversationId?: string;
  allowGeneralKnowledge?: boolean;
  categoryId?: string;
  documentType?: string;
  audience?: string;
  tags?: string[];
}

export interface AiSource {
  documentId: string;
  heading?: string;
  layer: string;
  score: number;
}

export interface AiQueryResponse {
  answer: string;
  sources: AiSource[];
  confidence: number;
  latencyMs: number;
}

export interface AiStreamChunk {
  content: string;
  isLast: boolean;
}

export interface AiJobStatus {
  id: string;
  documentId: string;
  version: number;
  status: string;
  steps?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
