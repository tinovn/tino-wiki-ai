export interface ChunkData {
  index: number;
  content: string;
  heading?: string;
  tokenCount: number;
  metadata?: Record<string, any>;
}

export interface ChunkMetadata {
  documentId: string;
  version: number;
  headingPath: string[];
  intents: string[];
  layer: 'master' | 'tenant' | 'customer';
  tenantId: string;
}
