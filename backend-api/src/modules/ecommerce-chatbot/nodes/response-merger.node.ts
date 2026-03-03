import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';
import { IntentResult } from '../interfaces/graph-state.interface';
import {
  RESPONSE_MERGER_SYSTEM_PROMPT,
  RESPONSE_MERGER_USER_PROMPT,
} from '../prompts/response-merger.prompt';

@Injectable()
export class ResponseMergerNode {
  private readonly logger = new Logger(ResponseMergerNode.name);

  constructor(private readonly llmFactory: LlmProviderFactory) {}

  async execute(results: IntentResult[]): Promise<string> {
    if (results.length === 0) {
      return 'Xin lỗi, mình không hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn không?';
    }

    // Single response: pass through (0 LLM calls)
    if (results.length === 1) {
      this.logger.debug('Single response, pass-through (no merge needed)');
      return results[0].response;
    }

    // Multiple responses: LLM merge (~1-2 seconds)
    this.logger.debug(`Merging ${results.length} responses with LLM`);

    try {
      const chatAdapter = this.llmFactory.getChatAdapter();

      const responsesText = results
        .map(
          (r, i) =>
            `--- Response ${i + 1} (${r.intentName}) ---\n${r.response}`,
        )
        .join('\n\n');

      const userPrompt = RESPONSE_MERGER_USER_PROMPT.replace(
        '{responses}',
        responsesText,
      );

      const response = await chatAdapter.chat([
        { role: 'system', content: RESPONSE_MERGER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ]);

      return response.content;
    } catch (error) {
      this.logger.warn('Response merge failed, concatenating', error);
      // Fallback: simple concatenation
      return results.map((r) => r.response).join('\n\n---\n\n');
    }
  }
}
