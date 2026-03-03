import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '@modules/llm/llm-provider.factory';
import { PREFERENCE_EXTRACTION_PROMPT } from '@modules/llm/prompts/preference-extraction.prompts';
import { CustomerMemoryRepository } from '../repositories/customer-memory.repository';

@Injectable()
export class PreferenceExtractorService {
  private readonly logger = new Logger(PreferenceExtractorService.name);

  constructor(
    private readonly llmFactory: LlmProviderFactory,
    private readonly memoryRepo: CustomerMemoryRepository,
  ) {}

  async extractFromMessages(
    customerId: string,
    messages: Array<{ role: string; content: string }>,
    provider?: string,
  ) {
    const adapter = this.llmFactory.getChatAdapter(provider);
    const messagesStr = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = PREFERENCE_EXTRACTION_PROMPT.replace('{messages}', messagesStr);

    try {
      const response = await adapter.chat(
        [{ role: 'user', content: prompt }],
        { temperature: 0.2, maxTokens: 1000, responseFormat: 'json' },
      );

      const parsed = JSON.parse(response.content);
      const memories = parsed.memories || [];

      // Save extracted memories
      for (const memory of memories) {
        if (memory.confidence >= 0.6) {
          await this.memoryRepo.upsert({
            customerId,
            type: memory.type,
            key: memory.key,
            value: memory.value,
            source: 'AI_EXTRACTED',
            confidence: memory.confidence,
          });
        }
      }

      this.logger.log(`Extracted ${memories.length} preferences for customer ${customerId}`);
      return memories;
    } catch (error) {
      this.logger.warn(`Preference extraction failed: ${error}`);
      return [];
    }
  }
}
