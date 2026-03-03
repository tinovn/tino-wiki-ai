import { Injectable, Logger } from '@nestjs/common';
import { ChatMessage } from '../../llm/interfaces/llm-adapter.interface';
import { CustomerProfile } from '../interfaces/graph-state.interface';
import { SessionProfileService } from './session-profile.service';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';

export interface MemoryState {
  recentMessages: ChatMessage[];
  conversationSummary: string;
  customerProfile: CustomerProfile;
}

@Injectable()
export class ConversationMemoryService {
  private readonly logger = new Logger(ConversationMemoryService.name);

  constructor(
    private readonly sessionProfile: SessionProfileService,
    private readonly llmFactory: LlmProviderFactory,
  ) {}

  /**
   * Load the 3-layer memory for a conversation.
   * Layer 1: Recent ~8 messages
   * Layer 2: Progressive summary of older messages
   * Layer 3: Cross-session customer profile from Redis
   */
  async loadMemory(params: {
    tenantId: string;
    customerId: string;
    conversationMessages: Array<{ role: string; content: string }>;
    existingSummary?: string;
    customerMemories?: Array<{ type: string; key: string; value: string }>;
  }): Promise<MemoryState> {
    const {
      tenantId,
      customerId,
      conversationMessages,
      existingSummary,
      customerMemories,
    } = params;

    // Layer 1: Recent messages (last ~8)
    const recent = conversationMessages.slice(
      -ECOMMERCE_CONSTANTS.RECENT_MESSAGE_COUNT,
    );
    const recentMessages: ChatMessage[] = recent.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Layer 2: Progressive summary
    let conversationSummary = existingSummary ?? '';
    const totalMessages = conversationMessages.length;

    if (
      totalMessages > ECOMMERCE_CONSTANTS.SUMMARY_TRIGGER_MESSAGE_COUNT &&
      !existingSummary
    ) {
      // Summarize older messages that won't be in the recent window
      const olderMessages = conversationMessages.slice(
        0,
        -ECOMMERCE_CONSTANTS.RECENT_MESSAGE_COUNT,
      );
      conversationSummary =
        await this.generateProgressiveSummary(olderMessages);
    }

    // Layer 3: Cross-session profile (Redis) + DB memories
    const redisProfile = await this.sessionProfile.getProfile(
      tenantId,
      customerId,
    );
    const customerProfile = this.mergeWithDbMemories(
      redisProfile,
      customerMemories ?? [],
    );

    return { recentMessages, conversationSummary, customerProfile };
  }

  /**
   * Save memory state after a conversation turn.
   * Updates progressive summary if needed and saves profile updates.
   */
  async saveMemory(params: {
    tenantId: string;
    customerId: string;
    profileUpdates?: Partial<CustomerProfile>;
    allMessages: Array<{ role: string; content: string }>;
    existingSummary?: string;
  }): Promise<{ newSummary?: string }> {
    const {
      tenantId,
      customerId,
      profileUpdates,
      allMessages,
      existingSummary,
    } = params;

    // Update profile if there are changes
    if (profileUpdates && Object.keys(profileUpdates).length > 0) {
      await this.sessionProfile.updateProfile(
        tenantId,
        customerId,
        profileUpdates,
      );
    }

    // Generate new summary if conversation is long enough
    let newSummary: string | undefined;
    if (allMessages.length > ECOMMERCE_CONSTANTS.SUMMARY_TRIGGER_MESSAGE_COUNT) {
      const olderMessages = allMessages.slice(
        0,
        -ECOMMERCE_CONSTANTS.RECENT_MESSAGE_COUNT,
      );
      if (existingSummary) {
        newSummary = await this.updateProgressiveSummary(
          existingSummary,
          olderMessages.slice(-4), // Only summarize the newest older messages
        );
      } else {
        newSummary = await this.generateProgressiveSummary(olderMessages);
      }
    }

    return { newSummary };
  }

  private async generateProgressiveSummary(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (messages.length === 0) return '';

    try {
      const chatAdapter = this.llmFactory.getChatAdapter();
      const messageText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const response = await chatAdapter.chat([
        {
          role: 'system',
          content:
            'Bạn là trợ lý tóm tắt hội thoại. Hãy tóm tắt ngắn gọn cuộc trò chuyện dưới đây, giữ lại các thông tin quan trọng: yêu cầu của khách, sản phẩm đã xem, quyết định đã đưa ra. Trả lời bằng tiếng Việt, tối đa 150 từ.',
        },
        {
          role: 'user',
          content: `Tóm tắt cuộc hội thoại:\n${messageText}`,
        },
      ]);

      return response.content;
    } catch (error) {
      this.logger.warn('Failed to generate progressive summary', error);
      return '';
    }
  }

  private async updateProgressiveSummary(
    existingSummary: string,
    newMessages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (newMessages.length === 0) return existingSummary;

    try {
      const chatAdapter = this.llmFactory.getChatAdapter();
      const newText = newMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const response = await chatAdapter.chat([
        {
          role: 'system',
          content:
            'Bạn là trợ lý tóm tắt hội thoại. Cập nhật bản tóm tắt hiện có với thông tin mới. Giữ ngắn gọn, tối đa 200 từ. Trả lời bằng tiếng Việt.',
        },
        {
          role: 'user',
          content: `Bản tóm tắt hiện tại:\n${existingSummary}\n\nTin nhắn mới:\n${newText}\n\nCập nhật bản tóm tắt:`,
        },
      ]);

      return response.content;
    } catch (error) {
      this.logger.warn('Failed to update progressive summary', error);
      return existingSummary;
    }
  }

  private mergeWithDbMemories(
    redisProfile: CustomerProfile,
    dbMemories: Array<{ type: string; key: string; value: string }>,
  ): CustomerProfile {
    const merged = { ...redisProfile };

    for (const mem of dbMemories) {
      switch (mem.type) {
        case 'PREFERENCE':
          merged.preferences[mem.key] = mem.value;
          break;
        case 'PRODUCT_INTEREST':
          if (!merged.productInterests.includes(mem.value)) {
            merged.productInterests.push(mem.value);
          }
          break;
        case 'ISSUE_HISTORY':
          if (!merged.issueHistory.includes(mem.value)) {
            merged.issueHistory.push(mem.value);
          }
          break;
      }
    }

    return merged;
  }
}
