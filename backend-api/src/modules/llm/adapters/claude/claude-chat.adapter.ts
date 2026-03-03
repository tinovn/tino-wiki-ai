import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  IChatAdapter,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatStreamChunk,
} from '../../interfaces/llm-adapter.interface';

@Injectable()
export class ClaudeChatAdapter implements IChatAdapter {
  private readonly logger = new Logger(ClaudeChatAdapter.name);
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('llm.anthropic.apiKey'),
    });
    this.defaultModel = this.configService.get<string>('llm.anthropic.model', 'claude-sonnet-4-20250514');
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens ?? 2000,
      system: systemMessage?.content,
      messages: nonSystemMessages,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return {
      content: textContent?.text || '',
      finishReason: response.stop_reason || 'end_turn',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const stream = this.client.messages.stream({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens ?? 2000,
      system: systemMessage?.content,
      messages: nonSystemMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { content: event.delta.text, isLast: false };
      }
      if (event.type === 'message_stop') {
        yield { content: '', isLast: true };
      }
    }
  }
}
