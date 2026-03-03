import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import {
  CONVERSATION_EVENTS,
  ConversationHandoffPayload,
  ConversationNewMessagePayload,
} from '../interfaces/conversation-events.interface';

const HANDOFF_KEYWORDS = [
  'nhân viên', 'nhan vien', 'tư vấn viên', 'tu van vien',
  'người thật', 'nguoi that', 'agent', 'human', 'operator',
  'nói chuyện với người', 'gặp người', 'hỗ trợ trực tiếp',
];

@Injectable()
export class HandoffService {
  private readonly logger = new Logger(HandoffService.name);

  constructor(
    private readonly clientManager: PrismaClientManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check if a customer message should trigger handoff.
   */
  shouldHandoffByKeyword(message: string): boolean {
    const lower = message.toLowerCase();
    return HANDOFF_KEYWORDS.some((kw) => lower.includes(kw));
  }

  /**
   * Check if AI confidence is below threshold.
   */
  shouldHandoffByConfidence(confidence: number, threshold = 0.3): boolean {
    return confidence < threshold;
  }

  /**
   * Trigger handoff for a conversation.
   */
  async triggerHandoff(
    tenantId: string,
    tenantDatabaseUrl: string,
    conversationId: string,
    customerId: string,
    reason: string,
  ): Promise<void> {
    const db = await this.clientManager.getClient(tenantDatabaseUrl);

    // Update conversation
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        isHandoff: true,
        handoffReason: reason,
        // Unassign so it shows in "Unassigned" tab
        assignedAgentId: null,
      },
    });

    // Add system message
    const systemMessage = await db.conversationMessage.create({
      data: {
        conversationId,
        role: 'SYSTEM',
        content: 'Đang chuyển tiếp đến nhân viên hỗ trợ. Vui lòng chờ trong giây lát.',
        metadata: { handoffReason: reason },
      },
    });

    // Update lastMessageAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: systemMessage.createdAt, unreadCount: { increment: 1 } },
    });

    // Emit events
    this.eventEmitter.emit(CONVERSATION_EVENTS.HANDOFF, {
      tenantId,
      tenantDatabaseUrl,
      conversationId,
      customerId,
      reason,
    } satisfies ConversationHandoffPayload);

    this.eventEmitter.emit(CONVERSATION_EVENTS.NEW_MESSAGE, {
      tenantId,
      tenantDatabaseUrl,
      conversationId,
      customerId,
      message: {
        id: systemMessage.id,
        role: 'SYSTEM',
        content: systemMessage.content,
        metadata: { handoffReason: reason },
        createdAt: systemMessage.createdAt,
      },
    } satisfies ConversationNewMessagePayload);

    this.logger.log(`Handoff triggered for conversation ${conversationId}: ${reason}`);
  }

  /**
   * Check if a conversation is currently in handoff mode (agent should handle).
   */
  async isInHandoff(tenantDatabaseUrl: string, conversationId: string): Promise<boolean> {
    const db = await this.clientManager.getClient(tenantDatabaseUrl);
    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { isHandoff: true },
    });
    return conv?.isHandoff ?? false;
  }
}
