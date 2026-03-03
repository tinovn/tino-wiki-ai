import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GraphRunnerService } from './graph/graph-runner.service';
import { GraphState } from './interfaces/graph-state.interface';

export interface EcommerceChatInput {
  tenantId: string;
  tenantSlug: string;
  tenantDatabaseUrl: string;
  customerId: string;
  conversationId: string;
  channel: string;
  message: string;
  conversationMessages: Array<{ role: string; content: string }>;
  existingSummary?: string;
  customerMemories?: Array<{ type: string; key: string; value: string }>;
}

export interface EcommerceChatOutput {
  answer: string;
  confidence: number;
  sources: Array<{ documentId: string }>;
  intents: string[];
  latencyMs: number;
}

const CART_INTENTS = ['cart_add', 'cart_remove', 'cart_update', 'cart_clear'];
const ORDER_INTENTS = ['order_create'];

@Injectable()
export class EcommerceChatbotService {
  private readonly logger = new Logger(EcommerceChatbotService.name);

  constructor(
    private readonly graphRunner: GraphRunnerService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  async chat(input: EcommerceChatInput): Promise<EcommerceChatOutput> {
    const initialState: GraphState = {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      tenantDatabaseUrl: input.tenantDatabaseUrl,
      customerId: input.customerId,
      conversationId: input.conversationId,
      userMessage: input.message,
      channel: input.channel,

      recentMessages: [],
      conversationSummary: '',
      customerProfile: {
        preferences: {},
        productInterests: [],
        issueHistory: [],
      },

      detectedIntents: [],
      intentExecutionPlan: 'sequential',
      intentResults: [],

      expandedQueries: [],
      searchResults: [],
      cragRetryCount: 0,

      finalResponse: '',
      totalTokensUsed: 0,
      latencyMs: 0,
      errors: [],
    };

    const result = await this.graphRunner.run(
      initialState,
      input.conversationMessages,
      input.existingSummary,
      input.customerMemories,
    );

    // Calculate overall confidence from intent results
    const avgConfidence =
      result.intentResults.length > 0
        ? result.intentResults.reduce((sum, r) => sum + r.confidence, 0) /
          result.intentResults.length
        : 0.5;

    const intents = result.detectedIntents.map((i) => i.name);

    // Emit ecommerce events for real-time agent inbox updates
    this.emitEcommerceEvents(input, intents);

    return {
      answer: result.finalResponse,
      confidence: avgConfidence,
      sources: result.intentResults
        .flatMap((r) => r.toolResults)
        .filter((t) => t.data?.productId)
        .map((t) => ({ documentId: t.data.productId })),
      intents,
      latencyMs: result.latencyMs,
    };
  }

  private emitEcommerceEvents(input: EcommerceChatInput, intents: string[]): void {
    if (!this.eventEmitter) return;

    const hasCartChange = intents.some((i) => CART_INTENTS.includes(i));
    const hasOrderCreate = intents.some((i) => ORDER_INTENTS.includes(i));

    if (hasCartChange) {
      this.eventEmitter.emit('conversation.ecommerce', {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        customerId: input.customerId,
        event: 'cart_updated',
        data: { intents: intents.filter((i) => CART_INTENTS.includes(i)) },
      });
    }

    if (hasOrderCreate) {
      this.eventEmitter.emit('conversation.ecommerce', {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        customerId: input.customerId,
        event: 'order_created',
        data: { intents: ['order_create'] },
      });
    }

    if (intents.length > 0 && !hasCartChange && !hasOrderCreate) {
      this.eventEmitter.emit('conversation.ecommerce', {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        customerId: input.customerId,
        event: 'intent_detected',
        data: { intents },
      });
    }
  }
}
