import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushPayload } from '../interfaces/notification.interface';

// Firebase Admin types (dynamic import to avoid hard dependency when not configured)
let firebaseAdmin: typeof import('firebase-admin') | null = null;

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const serviceAccountPath = this.configService.get<string>('push.firebaseServiceAccountPath');

    if (!serviceAccountPath) {
      this.logger.warn('Firebase service account not configured, FCM disabled');
      return;
    }

    try {
      firebaseAdmin = await import('firebase-admin');

      // Only initialize if not already initialized
      if (!firebaseAdmin.apps?.length) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(serviceAccountPath);
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
        });
      }

      this.isConfigured = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error: any) {
      this.logger.error(`Firebase init failed: ${error.message}`);
    }
  }

  async sendNotification(
    token: string,
    payload: PushPayload,
  ): Promise<{ success: boolean; gone?: boolean }> {
    if (!this.isConfigured || !firebaseAdmin) {
      return { success: false };
    }

    try {
      await firebaseAdmin.messaging().send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: Object.fromEntries(
          Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'OPEN_CONVERSATION',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      return { success: true };
    } catch (error: any) {
      // Token expired/invalid
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        this.logger.debug(`FCM token invalid: ${token.slice(0, 20)}...`);
        return { success: false, gone: true };
      }

      this.logger.error(`FCM send failed: ${error.message}`);
      return { success: false };
    }
  }
}
