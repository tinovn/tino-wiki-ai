export const QUEUES = {
  AI_PIPELINE: 'ai-pipeline',
  EMBEDDING: 'embedding',
  SUMMARY: 'summary',
  PREFERENCE_EXTRACTION: 'preference-extraction',
  ANALYTICS: 'analytics',
  CRAWLER: 'crawler',
  NOTIFICATION: 'notification',
} as const;

export const JOBS = {
  PROCESS_DOCUMENT: 'process-document',
  PROCESS_MASTER_DOCUMENT: 'process-master-document',
  REPROCESS_DOCUMENT: 'reprocess-document',
  EMBED_CHUNKS: 'embed-chunks',
  DELETE_EMBEDDINGS: 'delete-embeddings',
  GENERATE_SUMMARIES: 'generate-summaries',
  DETECT_INTENTS: 'detect-intents',
  EXTRACT_PREFERENCES: 'extract-preferences',
  LOG_QUERY: 'log-query',
  ANALYZE_CONTENT_GAPS: 'analyze-content-gaps',
  CRAWL_SOURCE: 'crawl-source',
  CRAWL_URL: 'crawl-url',
  RECRAWL_STALE: 'recrawl-stale',
  SCHEDULED_CRAWL: 'scheduled-crawl',
  SEND_NOTIFICATION: 'send-notification',
} as const;
