import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PushPayload } from '../interfaces/notification.interface';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('push.vapidPublicKey');
    const privateKey = this.configService.get<string>('push.vapidPrivateKey');
    const subject = this.configService.get<string>('push.vapidSubject');

    if (publicKey && privateKey) {
      webPush.setVapidDetails(subject || 'mailto:admin@tino.vn', publicKey, privateKey);
      this.isConfigured = true;
      this.logger.log('Web Push VAPID configured');
    } else {
      this.logger.warn('Web Push VAPID keys not configured, push notifications disabled');
    }
  }

  getVapidPublicKey(): string {
    return this.configService.get<string>('push.vapidPublicKey') || '';
  }

  async sendNotification(
    subscription: { endpoint: string; keys: Record<string, string> },
    payload: PushPayload,
  ): Promise<{ success: boolean; statusCode?: number; gone?: boolean }> {
    if (!this.isConfigured) {
      return { success: false };
    }

    try {
      const pushSubscription: webPush.PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      };

      const result = await webPush.sendNotification(
        pushSubscription,
        JSON.stringify(payload),
        { TTL: 60 * 60 }, // 1 hour TTL
      );

      return { success: true, statusCode: result.statusCode };
    } catch (error: any) {
      // 410 Gone = subscription expired/unsubscribed
      if (error.statusCode === 410 || error.statusCode === 404) {
        this.logger.debug(`Subscription gone: ${subscription.endpoint.slice(0, 50)}...`);
        return { success: false, statusCode: error.statusCode, gone: true };
      }

      this.logger.error(`Web Push failed: ${error.message}`, error.statusCode);
      return { success: false, statusCode: error.statusCode };
    }
  }
}
