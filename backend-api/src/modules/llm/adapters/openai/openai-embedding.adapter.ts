import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IEmbeddingAdapter, EmbeddingOptions, EmbeddingResponse } from '../../interfaces/llm-adapter.interface';

@Injectable()
export class OpenAiEmbeddingAdapter implements IEmbeddingAdapter {
  private readonly logger = new Logger(OpenAiEmbeddingAdapter.name);
  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly dimensions: number;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('llm.openai.apiKey'),
    });
    this.defaultModel = this.configService.get<string>('llm.openai.embeddingModel', 'text-embedding-3-small');
    this.dimensions = this.configService.get<number>('embedding.dimensions', 1536);
  }

  async embed(inputs: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse> {
    const response = await this.client.embeddings.create({
      model: options?.model || this.defaultModel,
      input: inputs,
      dimensions: options?.dimensions || this.dimensions,
    });

    return {
      embeddings: response.data.map((d) => d.embedding),
      model: response.model,
      usage: { totalTokens: response.usage.total_tokens },
    };
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
