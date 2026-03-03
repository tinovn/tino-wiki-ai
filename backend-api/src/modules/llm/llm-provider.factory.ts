import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IChatAdapter, IEmbeddingAdapter } from './interfaces/llm-adapter.interface';
import { VllmChatAdapter } from './adapters/vllm/vllm-chat.adapter';
import { VllmEmbeddingAdapter } from './adapters/vllm/vllm-embedding.adapter';
import { OpenAiChatAdapter } from './adapters/openai/openai-chat.adapter';
import { OpenAiEmbeddingAdapter } from './adapters/openai/openai-embedding.adapter';
import { ClaudeChatAdapter } from './adapters/claude/claude-chat.adapter';
import { OllamaChatAdapter } from './adapters/ollama/ollama-chat.adapter';
import { OllamaEmbeddingAdapter } from './adapters/ollama/ollama-embedding.adapter';

@Injectable()
export class LlmProviderFactory {
  private readonly logger = new Logger(LlmProviderFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly vllmChat: VllmChatAdapter,
    private readonly vllmEmbedding: VllmEmbeddingAdapter,
    private readonly openaiChat: OpenAiChatAdapter,
    private readonly openaiEmbedding: OpenAiEmbeddingAdapter,
    private readonly claudeChat: ClaudeChatAdapter,
    private readonly ollamaChat: OllamaChatAdapter,
    private readonly ollamaEmbedding: OllamaEmbeddingAdapter,
  ) {}

  getChatAdapter(provider?: string): IChatAdapter {
    const resolvedProvider = provider || this.configService.get<string>('llm.defaultProvider', 'vllm');

    switch (resolvedProvider) {
      case 'vllm':
        return this.vllmChat;
      case 'openai':
        return this.openaiChat;
      case 'claude':
        return this.claudeChat;
      case 'ollama':
        return this.ollamaChat;
      default:
        this.logger.warn(`Unknown LLM provider: ${resolvedProvider}, falling back to vllm`);
        return this.vllmChat;
    }
  }

  getEmbeddingAdapter(provider?: string): IEmbeddingAdapter {
    const resolvedProvider = provider || this.configService.get<string>('embedding.provider', 'openai');

    switch (resolvedProvider) {
      case 'vllm':
        return this.vllmEmbedding;
      case 'openai':
        return this.openaiEmbedding;
      case 'ollama':
        return this.ollamaEmbedding;
      default:
        this.logger.warn(`Unknown embedding provider: ${resolvedProvider}, falling back to vllm`);
        return this.vllmEmbedding;
    }
  }
}
