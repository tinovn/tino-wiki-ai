import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmbeddingAdapter, EmbeddingOptions, EmbeddingResponse } from '../../interfaces/llm-adapter.interface';

@Injectable()
export class OllamaEmbeddingAdapter implements IEmbeddingAdapter {
  private readonly logger = new Logger(OllamaEmbeddingAdapter.name);
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('llm.ollama.baseUrl', 'http://localhost:11434');
    this.defaultModel = this.configService.get<string>('llm.ollama.embeddingModel', 'nomic-embed-text');
  }

  async embed(inputs: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse> {
    const embeddings: number[][] = [];
    let totalTokens = 0;

    for (const input of inputs) {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options?.model || this.defaultModel,
          input,
        }),
      });

      const data = await response.json();
      embeddings.push(data.embeddings[0]);
      totalTokens += input.length / 4; // rough estimate
    }

    return {
      embeddings,
      model: options?.model || this.defaultModel,
      usage: { totalTokens },
    };
  }

  getDimensions(): number {
    return 768; // nomic-embed-text default
  }
}
