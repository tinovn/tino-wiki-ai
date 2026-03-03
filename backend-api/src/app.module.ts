import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { WikiModule } from './modules/wiki/wiki.module';
import { LlmModule } from './modules/llm/llm.module';
import { VectorStoreModule } from './modules/vector-store/vector-store.module';
import { AiModule } from './modules/ai/ai.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { MasterAdminModule } from './modules/master-admin/master-admin.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { MessengerModule } from './modules/messenger/messenger.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { ChatWidgetModule } from './modules/chatwidget/chatwidget.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { EcommerceChatbotModule } from './modules/ecommerce-chatbot/ecommerce-chatbot.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AppController } from './app.controller';
import { JwtAuthGuard } from '@common/guards/auth.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    CoreModule,
    SharedModule,
    TenantModule,
    AuthModule,
    UserModule,
    WikiModule,
    LlmModule,
    VectorStoreModule,
    AiModule,
    CustomerModule,
    AnalyticsModule,
    FeedbackModule,
    MasterAdminModule,
    CrawlerModule,
    MessengerModule,
    TelegramModule,
    ChatWidgetModule,
    ConversationsModule,
    EcommerceChatbotModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    // Global guard chain: authenticate → resolve tenant → check roles
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
