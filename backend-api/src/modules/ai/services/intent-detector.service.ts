import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '@modules/llm/llm-provider.factory';
import { INTENT_DETECTION_PROMPT } from '@modules/llm/prompts/intent-detection.prompts';

@Injectable()
export class IntentDetectorService {
  private readonly logger = new Logger(IntentDetectorService.name);

  constructor(private readonly llmFactory: LlmProviderFactory) {}

  async detect(content: string, provider?: string): Promise<Array<{ name: string; confidence: number }>> {
    const adapter = this.llmFactory.getChatAdapter(provider);
    const prompt = INTENT_DETECTION_PROMPT.replace('{content}', content);

    try {
      const response = await adapter.chat([
        { role: 'user', content: prompt },
      ], { temperature: 0.2, maxTokens: 500, responseFormat: 'json' });

      // Strip markdown code blocks if LLM wraps JSON in ```json ... ```
      let jsonStr = response.content.trim();
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      return (parsed.intents || []).map((i: any) => ({
        name: i.name,
        confidence: i.confidence,
      }));
    } catch (error) {
      this.logger.warn(`Intent detection failed, returning empty: ${error}`);
      return [];
    }
  }
}
