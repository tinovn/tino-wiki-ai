export interface AppConfig {
  name: string;
  port: number;
  env: string;
  apiPrefix: string;
  corsOrigins: string;
}

export interface DatabaseConfig {
  masterUrl: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
}

export interface JwtConfig {
  secret: string;
  accessExpiration: string;
  refreshExpiration: string;
}

export interface VllmConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface OpenAiConfig {
  apiKey: string;
  chatModel: string;
  embeddingModel: string;
}

export interface AnthropicConfig {
  apiKey: string;
  model: string;
}

export interface OllamaConfig {
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
}

export interface LlmConfig {
  defaultProvider: string;
  vllm: VllmConfig;
  openai: OpenAiConfig;
  anthropic: AnthropicConfig;
  ollama: OllamaConfig;
}

export interface EmbeddingConfig {
  provider: string;
  dimensions: number;
}

export interface AiProcessingConfig {
  chunkMinTokens: number;
  chunkMaxTokens: number;
  chunkOverlapTokens: number;
  maxSearchResults: number;
}
