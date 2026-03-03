import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IChatAdapter,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatStreamChunk,
} from '../../interfaces/llm-adapter.interface';

@Injectable()
export class VllmChatAdapter implements IChatAdapter {
  private readonly logger = new Logger(VllmChatAdapter.name);
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    // vLLM exposes an OpenAI-compatible API
    this.client = new OpenAI({
      baseURL: this.configService.get<string>('llm.vllm.baseUrl'),
      apiKey: this.configService.get<string>('llm.vllm.apiKey') || 'not-needed',
    });
    this.defaultModel = this.configService.get<string>('llm.vllm.model', 'Qwen/Qwen2.5-72B-Instruct-GPTQ-Int4');
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2000,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      finishReason: choice.finish_reason || 'stop',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2000,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      const isLast = chunk.choices[0]?.finish_reason === 'stop';
      yield { content: delta, isLast };
    }
  }
}
