import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IChatAdapter,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatStreamChunk,
} from '../../interfaces/llm-adapter.interface';

@Injectable()
export class OllamaChatAdapter implements IChatAdapter {
  private readonly logger = new Logger(OllamaChatAdapter.name);
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('llm.ollama.baseUrl', 'http://localhost:11434');
    this.defaultModel = this.configService.get<string>('llm.ollama.chatModel', 'llama3.1');
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.3,
          num_predict: options?.maxTokens ?? 2000,
        },
      }),
    });

    const data = await response.json();
    return {
      content: data.message?.content || '',
      finishReason: 'stop',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      model: data.model,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages,
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.3,
          num_predict: options?.maxTokens ?? 2000,
        },
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
      for (const line of lines) {
        const data = JSON.parse(line);
        yield {
          content: data.message?.content || '',
          isLast: data.done || false,
        };
      }
    }
  }
}
