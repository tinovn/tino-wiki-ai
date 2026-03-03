export interface MergedSearchResult {
  documentId: string;
  chunkContent: string;
  heading?: string;
  score: number;
  layer: string;
  intents: string[];
}

export interface QueryResult {
  answer: string;
  sources: Array<{
    documentId: string;
    heading?: string;
    layer: string;
    score: number;
  }>;
  confidence: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}
