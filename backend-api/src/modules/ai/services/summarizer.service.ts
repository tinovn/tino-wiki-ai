import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '@modules/llm/llm-provider.factory';
import { SUMMARIZATION_PROMPTS } from '@modules/llm/prompts/summarization.prompts';

@Injectable()
export class SummarizerService {
  private readonly logger = new Logger(SummarizerService.name);

  constructor(private readonly llmFactory: LlmProviderFactory) {}

  async summarize(content: string, type: 'SHORT' | 'MEDIUM' | 'KEY_POINTS', provider?: string) {
    const adapter = this.llmFactory.getChatAdapter(provider);
    const prompt = SUMMARIZATION_PROMPTS[type].replace('{content}', content);

    const response = await adapter.chat([
      { role: 'system', content: 'You are a helpful document summarizer.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.3, maxTokens: 1000 });

    return {
      summary: response.content.trim(),
      type,
      usage: response.usage,
    };
  }

  async generateAll(content: string, provider?: string) {
    const [short, medium, keyPoints] = await Promise.all([
      this.summarize(content, 'SHORT', provider),
      this.summarize(content, 'MEDIUM', provider),
      this.summarize(content, 'KEY_POINTS', provider),
    ]);

    return { short, medium, keyPoints };
  }
}
