import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { resolveTenantMessage } from '@common/utils';
import {
  CONVERSATION_EVENTS,
  ConversationHandoffPayload,
  ConversationNewMessagePayload,
  ConversationUpdatedPayload,
} from '../interfaces/conversation-events.interface';

const HANDOFF_KEYWORDS = [
  'nhân viên', 'nhan vien', 'tư vấn viên', 'tu van vien',
  'người thật', 'nguoi that', 'agent', 'human', 'operator',
  'nói chuyện với người', 'gặp người', 'hỗ trợ trực tiếp',
];

const GREETING_PATTERNS = [
  'hello', 'hi', 'hey', 'alo', 'alô', 'xin chào', 'chào',
  'chào bạn', 'chao ban', 'good morning', 'good afternoon',
  'good evening', 'yo', 'helu', 'helo', 'hallo',
];

@Injectable()
export class HandoffService {
  private readonly logger = new Logger(HandoffService.name);

  constructor(
    private readonly clientManager: PrismaClientManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check if message is a simple greeting (skip AI query).
   */
  isGreeting(message: string): boolean {
    const trimmed = message.trim().toLowerCase().replace(/[!?.,:;]+$/g, '');
    return GREETING_PATTERNS.some((g) => trimmed === g || trimmed === g + ' ạ' || trimmed === g + ' a');
  }

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
    tenantSettings?: Record<string, any>,
    channel?: string,
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
    const handoffMsg = resolveTenantMessage(tenantSettings, 'handoffMessage', channel);
    const systemMessage = await db.conversationMessage.create({
      data: {
        conversationId,
        role: 'SYSTEM',
        content: handoffMsg,
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
   * Check if AI should be skipped for this conversation.
   * Returns true if:
   * - isHandoff = true (explicitly handed off to human)
   * - assignedAgentId is set (user agent has claimed this conversation)
   */
  async isInHandoff(tenantDatabaseUrl: string, conversationId: string): Promise<boolean> {
    const db = await this.clientManager.getClient(tenantDatabaseUrl);
    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { isHandoff: true, assignedAgentId: true },
    });
    if (!conv) return false;
    return conv.isHandoff || !!conv.assignedAgentId;
  }

  /**
   * Cancel handoff — return conversation to AI handling.
   */
  async cancelHandoff(
    tenantId: string,
    tenantDatabaseUrl: string,
    conversationId: string,
    customerId: string,
    tenantSettings?: Record<string, any>,
    channel?: string,
  ): Promise<void> {
    const db = await this.clientManager.getClient(tenantDatabaseUrl);

    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { isHandoff: true, assignedAgentId: true },
    });
    if (!conv?.isHandoff && !conv?.assignedAgentId) return;

    await db.conversation.update({
      where: { id: conversationId },
      data: { isHandoff: false, handoffReason: null, assignedAgentId: null },
    });

    const resumeMsg = resolveTenantMessage(tenantSettings, 'resumeAiMessage', channel);
    const systemMessage = await db.conversationMessage.create({
      data: {
        conversationId,
        role: 'SYSTEM',
        content: resumeMsg,
        metadata: { event: 'handoff_cancelled' },
      },
    });

    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: systemMessage.createdAt },
    });

    this.eventEmitter.emit(CONVERSATION_EVENTS.UPDATED, {
      tenantId,
      conversationId,
      changes: { isHandoff: false, handoffReason: null, assignedAgentId: null },
    } satisfies ConversationUpdatedPayload);

    this.eventEmitter.emit(CONVERSATION_EVENTS.NEW_MESSAGE, {
      tenantId,
      tenantDatabaseUrl,
      conversationId,
      customerId,
      message: {
        id: systemMessage.id,
        role: 'SYSTEM',
        content: systemMessage.content,
        createdAt: systemMessage.createdAt,
      },
    } satisfies ConversationNewMessagePayload);

    this.logger.log(`Handoff cancelled for conversation ${conversationId}`);
  }

  /**
   * Alias: resume AI handling for a conversation.
   */
  async resumeAi(
    tenantId: string,
    tenantDatabaseUrl: string,
    conversationId: string,
    customerId: string,
    tenantSettings?: Record<string, any>,
    channel?: string,
  ): Promise<void> {
    return this.cancelHandoff(tenantId, tenantDatabaseUrl, conversationId, customerId, tenantSettings, channel);
  }
}
