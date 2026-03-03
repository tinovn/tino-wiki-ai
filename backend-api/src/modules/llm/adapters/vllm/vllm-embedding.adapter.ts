import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmbeddingAdapter, EmbeddingOptions, EmbeddingResponse } from '../../interfaces/llm-adapter.interface';

@Injectable()
export class VllmEmbeddingAdapter implements IEmbeddingAdapter {
  private readonly logger = new Logger(VllmEmbeddingAdapter.name);
  private readonly baseUrl: string;
  private readonly dimensions: number;

  constructor(private readonly configService: ConfigService) {
    // BGE-M3 embedding service on the same server, different port
    const vllmBase = this.configService.get<string>('llm.vllm.baseUrl', 'http://180.93.139.245:8000/v1');
    // Derive embedding URL: same host, port 8001
    const url = new URL(vllmBase);
    this.baseUrl = this.configService.get<string>('embedding.baseUrl') || `${url.protocol}//${url.hostname}:8001`;
    this.dimensions = this.configService.get<number>('embedding.dimensions', 1024);
  }

  async embed(inputs: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (inputs.length === 1) {
      // Single text
      const response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputs[0] }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Embedding failed: ${err}`);
      }

      const data = await response.json();
      return {
        embeddings: [data.embedding],
        model: data.model || 'bge-m3',
        usage: { totalTokens: Math.ceil(inputs[0].length / 4) },
      };
    }

    // Batch
    const response = await fetch(`${this.baseUrl}/embed/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: inputs }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Batch embedding failed: ${err}`);
    }

    const data = await response.json();
    return {
      embeddings: data.embeddings,
      model: data.model || 'bge-m3',
      usage: { totalTokens: inputs.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0) },
    };
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
