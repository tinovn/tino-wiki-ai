import { Global, Module } from '@nestjs/common';
import { LlmProviderFactory } from './llm-provider.factory';
import { VllmChatAdapter } from './adapters/vllm/vllm-chat.adapter';
import { VllmEmbeddingAdapter } from './adapters/vllm/vllm-embedding.adapter';
import { OpenAiChatAdapter } from './adapters/openai/openai-chat.adapter';
import { OpenAiEmbeddingAdapter } from './adapters/openai/openai-embedding.adapter';
import { ClaudeChatAdapter } from './adapters/claude/claude-chat.adapter';
import { OllamaChatAdapter } from './adapters/ollama/ollama-chat.adapter';
import { OllamaEmbeddingAdapter } from './adapters/ollama/ollama-embedding.adapter';

@Global()
@Module({
  providers: [
    LlmProviderFactory,
    VllmChatAdapter,
    VllmEmbeddingAdapter,
    OpenAiChatAdapter,
    OpenAiEmbeddingAdapter,
    ClaudeChatAdapter,
    OllamaChatAdapter,
    OllamaEmbeddingAdapter,
  ],
  exports: [LlmProviderFactory],
})
export class LlmModule {}
