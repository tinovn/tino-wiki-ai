import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '@common/constants';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { PresenceService } from '@modules/conversations/services/presence.service';
import {
  CONVERSATION_EVENTS,
  ConversationNewMessagePayload,
  ConversationHandoffPayload,
  ConversationUpdatedPayload,
} from '@modules/conversations/interfaces/conversation-events.interface';
import { NotificationPayload } from '../interfaces/notification.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue(QUEUES.NOTIFICATION) private readonly notificationQueue: Queue,
    private readonly presenceService: PresenceService,
    private readonly clientManager: PrismaClientManager,
  ) {}

  @OnEvent(CONVERSATION_EVENTS.NEW_MESSAGE)
  async handleNewMessage(payload: ConversationNewMessagePayload) {
    // Skip notifications for agent messages (agents already see their own messages in the UI)
    if (payload.message.role === 'AGENT') return;

    const senderName = payload.message.senderName || 'Customer';
    const bodyPreview = payload.message.content.slice(0, 200);

    await this.queueNotification({
      tenantId: payload.tenantId,
      tenantDatabaseUrl: payload.tenantDatabaseUrl,
      type: 'new_message',
      title: `New message from ${senderName}`,
      body: bodyPreview,
      data: {
        conversationId: payload.conversationId,
        messageId: payload.message.id,
      },
    });
  }

  @OnEvent(CONVERSATION_EVENTS.HANDOFF)
  async handleHandoff(payload: ConversationHandoffPayload) {
    await this.queueNotification({
      tenantId: payload.tenantId,
      tenantDatabaseUrl: payload.tenantDatabaseUrl,
      type: 'handoff',
      title: 'Customer needs human support',
      body: `Reason: ${payload.reason}`,
      data: {
        conversationId: payload.conversationId,
        customerId: payload.customerId,
      },
    });
  }

  @OnEvent(CONVERSATION_EVENTS.UPDATED)
  async handleConversationUpdated(payload: ConversationUpdatedPayload) {
    // Only notify on assignment changes
    const assignedAgentId = payload.changes?.assignedAgentId as string | undefined;
    if (!assignedAgentId) return;

    await this.queueNotification({
      tenantId: payload.tenantId,
      tenantDatabaseUrl: payload.changes?.tenantDatabaseUrl as string || '',
      type: 'assignment',
      title: 'Conversation assigned to you',
      body: `You have been assigned a new conversation`,
      data: {
        conversationId: payload.conversationId,
      },
      targetUserIds: [assignedAgentId],
    });
  }

  private async queueNotification(notification: NotificationPayload): Promise<void> {
    try {
      await this.notificationQueue.add(JOBS.SEND_NOTIFICATION, notification, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      });
    } catch (error: any) {
      this.logger.error(`Failed to queue notification: ${error.message}`);
    }
  }
}
