export interface PipelineContext {
  tenantId: string;
  tenantDatabaseUrl: string;
  tenantSlug: string;
  documentId: string;
  version: number;
  processingJobId: string;
  rawContent: string;
  cleanedContent?: string;
  headings?: Array<{ level: number; text: string; line: number }>;
  summaries?: {
    short?: string;
    medium?: string;
    keyPoints?: string;
  };
  intents?: Array<{ name: string; confidence: number }>;
  chunks?: Array<{
    index: number;
    content: string;
    heading?: string;
    tokenCount: number;
  }>;
  documentType?: string;
  audience?: string;
  priority?: number;
  categoryId?: string;
  tags?: string[];
}
