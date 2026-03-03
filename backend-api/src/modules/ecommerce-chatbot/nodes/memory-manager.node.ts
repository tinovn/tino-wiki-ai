import { Injectable, Logger } from '@nestjs/common';
import { GraphState, CustomerProfile } from '../interfaces/graph-state.interface';
import {
  ConversationMemoryService,
  MemoryState,
} from '../memory/conversation-memory.service';

@Injectable()
export class MemoryManagerNode {
  private readonly logger = new Logger(MemoryManagerNode.name);

  constructor(
    private readonly conversationMemory: ConversationMemoryService,
  ) {}

  /**
   * Load memory state at the beginning of the pipeline.
   */
  async loadMemory(
    state: GraphState,
    conversationMessages: Array<{ role: string; content: string }>,
    existingSummary?: string,
    customerMemories?: Array<{ type: string; key: string; value: string }>,
  ): Promise<Partial<GraphState>> {
    try {
      const memory = await this.conversationMemory.loadMemory({
        tenantId: state.tenantId,
        customerId: state.customerId,
        conversationMessages,
        existingSummary,
        customerMemories,
      });

      return {
        recentMessages: memory.recentMessages,
        conversationSummary: memory.conversationSummary,
        customerProfile: memory.customerProfile,
      };
    } catch (error) {
      this.logger.error('Failed to load memory', error);
      return {
        recentMessages: [],
        conversationSummary: '',
        customerProfile: {
          preferences: {},
          productInterests: [],
          issueHistory: [],
        },
      };
    }
  }

  /**
   * Save memory updates after the pipeline completes.
   */
  async saveMemory(
    state: GraphState,
    allMessages: Array<{ role: string; content: string }>,
    existingSummary?: string,
  ): Promise<{ newSummary?: string }> {
    try {
      // Extract profile updates from the conversation
      const profileUpdates = this.extractProfileUpdates(state);

      const result = await this.conversationMemory.saveMemory({
        tenantId: state.tenantId,
        customerId: state.customerId,
        profileUpdates,
        allMessages,
        existingSummary,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to save memory', error);
      return {};
    }
  }

  /**
   * Extract profile updates from intent results and tool results.
   */
  private extractProfileUpdates(
    state: GraphState,
  ): Partial<CustomerProfile> {
    const updates: Partial<CustomerProfile> = {};
    const interests: string[] = [];

    for (const result of state.intentResults ?? []) {
      // Track product interests from searches
      if (
        result.intentName === 'product_search' ||
        result.intentName === 'product_detail'
      ) {
        for (const tool of result.toolResults) {
          if (tool.data?.category) {
            interests.push(tool.data.category);
          }
          if (tool.data?.brand) {
            interests.push(tool.data.brand);
          }
        }
      }

      // Track price sensitivity from cart operations
      if (result.intentName === 'cart_add' && result.toolResults.length > 0) {
        const cart = result.toolResults[0]?.data;
        if (cart?.totalAmount) {
          updates.budgetRange = {
            ...(state.customerProfile?.budgetRange ?? {}),
            max: Math.max(
              cart.totalAmount,
              state.customerProfile?.budgetRange?.max ?? 0,
            ),
          };
        }
      }
    }

    if (interests.length > 0) {
      updates.productInterests = interests;
    }

    return updates;
  }
}
