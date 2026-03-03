export const CACHE_PREFIX = {
  TENANT: 'tenant',
  DOCUMENT: 'doc',
  QUERY: 'query',
  EMBEDDING: 'emb',
  SEARCH: 'search',
  USER: 'user',
} as const;

export const CACHE_TTL = {
  QUERY_EMBEDDING: 300, // 5 min
  SEARCH_RESULTS: 120, // 2 min
  LLM_RESPONSE: 600, // 10 min
  DOCUMENT: 300, // 5 min
  TENANT: 3600, // 1 hour
  USER: 600, // 10 min
} as const;
