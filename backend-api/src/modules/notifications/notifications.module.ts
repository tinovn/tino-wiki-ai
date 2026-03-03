import { Module } from '@nestjs/common';
import { ConversationsModule } from '@modules/conversations/conversations.module';
import { NotificationService } from './services/notification.service';
import { WebPushService } from './services/web-push.service';
import { FcmService } from './services/fcm.service';
import { NotificationProcessor } from './processors/notification.processor';
import { PushSubscriptionController } from './controllers/push-subscription.controller';
import { NotificationPreferencesController } from './controllers/notification-preferences.controller';

@Module({
  imports: [ConversationsModule],
  controllers: [PushSubscriptionController, NotificationPreferencesController],
  providers: [NotificationService, WebPushService, FcmService, NotificationProcessor],
  exports: [NotificationService],
})
export class NotificationsModule {}
