import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '@common/constants';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { PresenceService } from '@modules/conversations/services/presence.service';
import { WebPushService } from '../services/web-push.service';
import { FcmService } from '../services/fcm.service';
import { NotificationPayload, PushPayload } from '../interfaces/notification.interface';

@Processor(QUEUES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly clientManager: PrismaClientManager,
    private readonly presenceService: PresenceService,
    private readonly webPushService: WebPushService,
    private readonly fcmService: FcmService,
  ) {
    super();
  }

  async process(job: Job<NotificationPayload>): Promise<void> {
    const notification = job.data;

    try {
      const db = await this.clientManager.getClient(notification.tenantDatabaseUrl) as any;

      // Determine target users
      let targetUserIds = notification.targetUserIds;

      if (!targetUserIds?.length) {
        // Get all active agents for tenant
        const agents = await db.user.findMany({
          where: { isActive: true, role: { in: ['ADMIN', 'AGENT'] } },
          select: { id: true },
        });
        targetUserIds = agents.map((a: any) => a.id);
      }

      for (const userId of targetUserIds || []) {
        // Skip online agents (they see messages in real-time via WebSocket)
        const isOnline = await this.presenceService.isUserOnline(notification.tenantId, userId);
        if (isOnline) continue;

        // Check notification preferences
        const preference = await db.notificationPreference.findUnique({
          where: { userId },
        });

        if (preference) {
          // Check if this notification type is enabled
          if (notification.type === 'new_message' && !preference.newMessageEnabled) continue;
          if (notification.type === 'handoff' && !preference.handoffEnabled) continue;
          if (notification.type === 'assignment' && !preference.assignmentEnabled) continue;

          // Check muted conversations
          const conversationId = notification.data?.conversationId as string;
          if (conversationId && preference.mutedConversations?.includes(conversationId)) continue;
        }

        // Fetch push subscriptions
        const subscriptions = await db.pushSubscription.findMany({
          where: { userId, isActive: true },
        });

        const pushPayload: PushPayload = {
          title: notification.title,
          body: notification.body,
          icon: '/logo-192.png',
          badge: '/badge-72.png',
          tag: (notification.data?.conversationId as string) || 'general',
          data: notification.data,
        };

        for (const sub of subscriptions) {
          if (sub.type === 'WEB_PUSH') {
            if (preference && !preference.desktopEnabled) continue;

            const result = await this.webPushService.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys as Record<string, string> },
              pushPayload,
            );

            if (result.gone) {
              await db.pushSubscription.update({
                where: { id: sub.id },
                data: { isActive: false },
              });
            }
          } else if (sub.type === 'FCM') {
            if (preference && !preference.mobilePushEnabled) continue;

            const result = await this.fcmService.sendNotification(sub.endpoint, pushPayload);

            if (result.gone) {
              await db.pushSubscription.update({
                where: { id: sub.id },
                data: { isActive: false },
              });
            }
          }
        }
      }

      this.logger.debug(
        `Processed notification: ${notification.type} for tenant ${notification.tenantId}`,
      );
    } catch (error: any) {
      this.logger.error(`Notification processing failed: ${error.message}`);
      throw error; // Let BullMQ retry
    }
  }
}
