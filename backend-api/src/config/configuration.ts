export default () => ({
  app: {
    name: process.env.APP_NAME || 'tino-wiki',
    port: parseInt(process.env.APP_PORT || '3000', 10),
    env: process.env.APP_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001',
  },
  database: {
    masterUrl: process.env.MASTER_DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  llm: {
    defaultProvider: process.env.LLM_DEFAULT_PROVIDER || 'vllm',
    vllm: {
      baseUrl: process.env.VLLM_BASE_URL || 'http://180.93.139.245:8000/v1',
      model: process.env.VLLM_MODEL || 'tino-wiki',
      apiKey: process.env.VLLM_API_KEY || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      chatModel: process.env.OLLAMA_CHAT_MODEL || 'llama3.1',
      embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    },
  },
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER || 'vllm',
    baseUrl: process.env.EMBEDDING_BASE_URL || 'http://180.93.139.245:8001',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1024', 10),
  },
  ai: {
    chunkMinTokens: parseInt(process.env.CHUNK_MIN_TOKENS || '300', 10),
    chunkMaxTokens: parseInt(process.env.CHUNK_MAX_TOKENS || '800', 10),
    chunkOverlapTokens: parseInt(process.env.CHUNK_OVERLAP_TOKENS || '50', 10),
    maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS || '10', 10),
  },
  push: {
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@tino.vn',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  },
});
