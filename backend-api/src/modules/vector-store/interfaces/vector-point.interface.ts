export interface VectorPointPayload {
  tenantId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  heading?: string;
  intents: string[];
  layer: 'master' | 'tenant' | 'customer';
  customerId?: string;
  version: number;
  metadata?: Record<string, any>;
  documentType?: string;
  audience?: string;
  priority?: number;
  categoryId?: string;
  tags?: string[];
}

export interface VectorSearchParams {
  vector: number[];
  limit: number;
  filter?: Record<string, any>;
  scoreThreshold?: number;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: VectorPointPayload;
}
