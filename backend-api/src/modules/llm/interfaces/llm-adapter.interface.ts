export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: 'text' | 'json';
}

export interface ChatResponse {
  content: string;
  finishReason: string;
  usage: TokenUsage;
  model: string;
}

export interface ChatStreamChunk {
  content: string;
  isLast: boolean;
  usage?: TokenUsage;
}

export interface SummarizationOptions {
  model?: string;
  language?: string;
  maxLength?: number;
}

export interface SummarizationResponse {
  summary: string;
  type: string;
  usage: TokenUsage;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: { totalTokens: number };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface IChatAdapter {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk>;
}

export interface IEmbeddingAdapter {
  embed(inputs: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse>;
  getDimensions(): number;
}

export interface ILlmProvider extends IChatAdapter {
  readonly providerName: string;
  healthCheck(): Promise<boolean>;
}
