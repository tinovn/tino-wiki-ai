export const ECOMMERCE_CONSTANTS = {
  // Memory
  RECENT_MESSAGE_COUNT: 8,
  SUMMARY_TRIGGER_MESSAGE_COUNT: 12,
  REDIS_PROFILE_TTL: 2592000, // 30 days
  REDIS_PROFILE_PREFIX: 'ecom:profile',

  // Search
  MAX_EXPANDED_QUERIES: 4,
  PRODUCT_SEARCH_LIMIT: 10,
  WIKI_SEARCH_LIMIT: 5,
  CRAG_MAX_RETRIES: 1,
  CRAG_QUALITY_THRESHOLD: 3, // 1-5 scale

  // Reranking boosts
  RERANK_EXACT_NAME_MATCH: 3.0,
  RERANK_KEYWORD_MATCH: 1.0,
  RERANK_CATEGORY_MATCH: 0.5,

  // Timeouts
  NODE_TIMEOUT_MS: 10000,
  TOTAL_PIPELINE_TIMEOUT_MS: 30000,

  // Supervisor
  MAX_INTENTS_PER_MESSAGE: 3,

  // Response
  MAX_PRODUCTS_IN_RESPONSE: 5,
} as const;

export const DETERMINISTIC_KEYWORDS = {
  MOST_EXPENSIVE: ['đắt nhất', 'dat nhat', 'giá cao nhất', 'gia cao nhat', 'cao nhất', 'cao nhat'],
  CHEAPEST: ['rẻ nhất', 're nhat', 'giá thấp nhất', 'gia thap nhat', 'tiết kiệm nhất', 'tiet kiem nhat', 'rẻ', 'bình dân'],
  NEWEST: ['mới nhất', 'moi nhat', 'ra mắt mới', 'ra mat moi', 'latest', 'newest'],
  BEST_RATED: ['tốt nhất', 'tot nhat', 'đánh giá cao', 'danh gia cao', 'phổ biến nhất', 'popular', 'bán chạy'],
} as const;

export type DeterministicSortType = keyof typeof DETERMINISTIC_KEYWORDS;
