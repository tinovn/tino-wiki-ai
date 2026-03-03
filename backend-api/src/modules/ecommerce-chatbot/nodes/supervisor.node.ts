import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';
import {
  GraphState,
  EcommerceIntent,
  EcommerceIntentType,
} from '../interfaces/graph-state.interface';
import {
  SUPERVISOR_SYSTEM_PROMPT,
  SUPERVISOR_USER_PROMPT,
} from '../prompts/supervisor.prompt';
import { canRunParallel } from '../constants/intent-whitelist';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';

interface SupervisorOutput {
  reasoning: string;
  intents: Array<{
    name: EcommerceIntentType;
    confidence: number;
    params: Record<string, any>;
  }>;
}

@Injectable()
export class SupervisorNode {
  private readonly logger = new Logger(SupervisorNode.name);

  constructor(private readonly llmFactory: LlmProviderFactory) {}

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    this.logger.debug(`Supervisor processing: "${state.userMessage}"`);

    // Step 1: Try deterministic keyword matching first
    const deterministicIntents = this.detectDeterministicIntents(
      state.userMessage,
    );
    if (deterministicIntents.length > 0) {
      const intentNames = deterministicIntents.map((i) => i.name);
      return {
        detectedIntents: deterministicIntents,
        intentExecutionPlan: canRunParallel(intentNames)
          ? 'parallel'
          : 'sequential',
      };
    }

    // Step 2: Use LLM with Chain-of-Thought reasoning
    try {
      const chatAdapter = this.llmFactory.getChatAdapter();

      const systemPrompt = SUPERVISOR_SYSTEM_PROMPT
        .replace('{customerContext}', this.formatCustomerContext(state))
        .replace('{conversationSummary}', state.conversationSummary || 'Chưa có');

      const userPrompt = SUPERVISOR_USER_PROMPT.replace(
        '{userMessage}',
        state.userMessage,
      );

      const response = await chatAdapter.chat(
        [
          { role: 'system', content: systemPrompt },
          ...state.recentMessages,
          { role: 'user', content: userPrompt },
        ],
        { responseFormat: 'json', temperature: 0.1 },
      );

      const parsed = this.parseResponse(response.content);
      const intents = parsed.intents
        .slice(0, ECOMMERCE_CONSTANTS.MAX_INTENTS_PER_MESSAGE)
        .map((i) => ({
          name: i.name,
          confidence: i.confidence,
          extractedParams: i.params,
        }));

      if (intents.length === 0) {
        intents.push({
          name: 'knowledge_query',
          confidence: 0.5,
          extractedParams: { query: state.userMessage },
        });
      }

      const intentNames = intents.map((i) => i.name);

      this.logger.debug(
        `Supervisor detected ${intents.length} intent(s): ${intentNames.join(', ')}`,
      );

      return {
        detectedIntents: intents,
        intentExecutionPlan: canRunParallel(intentNames)
          ? 'parallel'
          : 'sequential',
      };
    } catch (error) {
      this.logger.error('Supervisor LLM call failed', error);
      // Fallback: treat as single knowledge_query
      return {
        detectedIntents: [
          {
            name: 'knowledge_query',
            confidence: 0.3,
            extractedParams: { query: state.userMessage },
          },
        ],
        intentExecutionPlan: 'sequential',
        errors: [
          ...(state.errors ?? []),
          {
            node: 'supervisor',
            message: `LLM failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
          },
        ],
      };
    }
  }

  private detectDeterministicIntents(
    message: string,
  ): EcommerceIntent[] {
    const msg = message.toLowerCase();
    const intents: EcommerceIntent[] = [];

    // Greeting patterns
    const greetings = ['xin chào', 'hello', 'hi ', 'hey', 'chào bạn', 'chào shop'];
    if (greetings.some((g) => msg.startsWith(g) || msg === g.trim())) {
      intents.push({
        name: 'greeting',
        confidence: 1.0,
        extractedParams: {},
      });
    }

    // Cart view
    const cartViewPatterns = ['xem giỏ hàng', 'giỏ hàng', 'xem gio hang', 'gio hang cua toi'];
    if (cartViewPatterns.some((p) => msg.includes(p)) && !msg.includes('thêm') && !msg.includes('xóa')) {
      intents.push({
        name: 'cart_view',
        confidence: 0.95,
        extractedParams: {},
      });
    }

    // Cart clear
    const cartClearPatterns = ['xóa hết giỏ', 'xóa giỏ hàng', 'clear cart', 'xoa het gio'];
    if (cartClearPatterns.some((p) => msg.includes(p))) {
      intents.push({
        name: 'cart_clear',
        confidence: 0.95,
        extractedParams: {},
      });
    }

    return intents;
  }

  private parseResponse(content: string): SupervisorOutput {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      this.logger.warn('Failed to parse supervisor JSON response');
    }

    // Fallback
    return {
      reasoning: 'Failed to parse',
      intents: [{ name: 'knowledge_query', confidence: 0.3, params: {} }],
    };
  }

  private formatCustomerContext(state: GraphState): string {
    const profile = state.customerProfile;
    if (!profile) return 'Khách mới, chưa có thông tin';

    const parts: string[] = [];
    if (Object.keys(profile.preferences).length > 0) {
      parts.push(
        `Sở thích: ${Object.entries(profile.preferences)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}`,
      );
    }
    if (profile.productInterests.length > 0) {
      parts.push(`Quan tâm: ${profile.productInterests.join(', ')}`);
    }
    if (profile.budgetRange) {
      const { min, max } = profile.budgetRange;
      parts.push(
        `Ngân sách: ${min ? min.toLocaleString('vi-VN') + 'đ' : '?'} - ${max ? max.toLocaleString('vi-VN') + 'đ' : '?'}`,
      );
    }

    return parts.length > 0 ? parts.join('\n') : 'Khách mới, chưa có thông tin';
  }
}
