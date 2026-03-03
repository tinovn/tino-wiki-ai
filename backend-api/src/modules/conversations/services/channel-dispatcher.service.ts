import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { FacebookApiService } from '@modules/messenger/facebook-api.service';
import { TelegramService } from '@modules/telegram/telegram.service';
import { TelegramApiService } from '@modules/telegram/telegram-api.service';

@Injectable()
export class ChannelDispatcherService {
  private readonly logger = new Logger(ChannelDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientManager: PrismaClientManager,
    private readonly fbApi: FacebookApiService,
    private readonly telegramService: TelegramService,
    private readonly telegramApi: TelegramApiService,
  ) {}

  /**
   * Dispatch an agent message to the original channel.
   */
  async dispatch(
    tenantId: string,
    tenantDatabaseUrl: string,
    conversation: { id: string; channel: string; customerId: string },
    messageContent: string,
  ): Promise<void> {
    const db = await this.clientManager.getClient(tenantDatabaseUrl);

    // Get customer externalId
    const customer = await db.customer.findUnique({
      where: { id: conversation.customerId },
      select: { externalId: true, metadata: true },
    });

    if (!customer?.externalId) {
      this.logger.warn(`No externalId for customer ${conversation.customerId}, cannot dispatch`);
      return;
    }

    // Get tenant settings
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, settings: true },
    });
    if (!tenant) return;

    const settings = tenant.settings as Record<string, any>;

    try {
      switch (conversation.channel) {
        case 'messenger': {
          const messengerConfig = settings?.messenger;
          if (!messengerConfig?.pageAccessToken) {
            this.logger.warn(`No messenger config for tenant ${tenantId}`);
            return;
          }
          await this.fbApi.sendMessage(
            customer.externalId,
            messageContent,
            messengerConfig.pageAccessToken,
          );
          break;
        }

        case 'telegram': {
          const bots = this.telegramService.getRunningBots();
          if (!bots.includes(tenant.slug)) {
            this.logger.warn(`No running Telegram bot for tenant ${tenant.slug}`);
            return;
          }
          // TelegramApiService.sendMessage needs bot instance
          // We access the bot via TelegramService's internal map
          // For now, use the Telegram Bot API directly
          const telegramConfig = settings?.telegram;
          if (!telegramConfig?.botToken) return;

          const TelegramBot = require('node-telegram-bot-api');
          const tempBot = new TelegramBot(telegramConfig.botToken);
          await this.telegramApi.sendMessage(
            tempBot,
            Number(customer.externalId),
            messageContent,
          );
          break;
        }

        case 'chatwidget': {
          // Widget messages are delivered via polling or WebSocket
          // The ConversationsGateway already emits new_message events
          // Widget will pick up agent messages on next poll
          this.logger.debug(`ChatWidget message dispatched via WebSocket/polling for session ${customer.externalId}`);
          break;
        }

        default:
          this.logger.warn(`Unknown channel: ${conversation.channel}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to dispatch message to ${conversation.channel}: ${error.message}`);
    }
  }
}
