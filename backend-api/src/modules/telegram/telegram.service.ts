import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';
import { TelegramApiService } from './telegram-api.service';
import { TelegramUpdate, TelegramMessage } from './dto/telegram-webhook.dto';

interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  webhookSecret?: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientManager: PrismaClientManager,
    private readonly queryEngine: QueryEngineService,
    private readonly telegramApi: TelegramApiService,
  ) {}

  async handleWebhook(tenantSlug: string, update: TelegramUpdate, secretToken?: string): Promise<void> {
    // 1. Resolve tenant by slug
    const tenant = await this.resolveTenantBySlug(tenantSlug);
    if (!tenant) {
      this.logger.warn(`No tenant found for slug: ${tenantSlug}`);
      return;
    }

    const config = (tenant.settings as any)?.telegram as TelegramConfig;
    if (!config?.botToken) {
      this.logger.warn(`Tenant ${tenant.slug} missing telegram config`);
      return;
    }

    // 2. Verify webhook secret
    if (config.webhookSecret && secretToken !== config.webhookSecret) {
      throw new ForbiddenException('Invalid Telegram webhook secret');
    }

    // 3. Skip non-text messages
    if (!update.message?.text) return;

    // 4. Process message
    await this.processMessage(tenant, config, update.message);
  }

  private async processMessage(
    tenant: { id: string; slug: string; databaseUrl: string; settings: any },
    config: TelegramConfig,
    message: TelegramMessage,
  ): Promise<void> {
    const chatId = message.chat.id;
    const userText = message.text!;
    const username = message.from?.username || message.from?.first_name || String(chatId);

    this.logger.log(`Telegram message from ${username} (${chatId}): "${userText.slice(0, 50)}..."`);

    try {
      // Show typing indicator
      await this.telegramApi.sendChatAction(config.botToken, chatId);

      // Get tenant DB client
      const db = await this.clientManager.getClient(tenant.databaseUrl);

      // 5. Upsert customer by chat ID
      const externalId = String(chatId);
      let customer = await db.customer.findUnique({ where: { externalId } });
      if (!customer) {
        customer = await db.customer.create({
          data: {
            externalId,
            name: message.from ? `${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}` : undefined,
            metadata: {
              channel: 'telegram',
              username: message.from?.username,
              chatType: message.chat.type,
            },
          },
        });
        this.logger.log(`Created new customer for Telegram chat ${chatId}`);
      }

      // 6. Find or create active conversation
      let conversation = await db.conversation.findFirst({
        where: { customerId: customer.id, channel: 'telegram', status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
      });
      if (!conversation) {
        conversation = await db.conversation.create({
          data: { customerId: customer.id, channel: 'telegram' },
        });
      }

      // 7. Store customer message
      await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'CUSTOMER',
          content: userText,
          metadata: { chatId, messageId: message.message_id, username: message.from?.username },
        },
      });

      // 8. Query AI with customer memory
      const memories = await db.customerMemory.findMany({
        where: { customerId: customer.id },
      });

      const tenantSettings = (tenant.settings as any) || {};
      const aiSettings = tenantSettings.ai || {};

      const result = await this.queryEngine.query({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantDatabaseUrl: tenant.databaseUrl,
        question: userText,
        customerId: customer.id,
        customerMemory: memories.map((m) => ({
          type: m.type,
          key: m.key,
          value: m.value,
        })),
        allowGeneralKnowledge: aiSettings.allowGeneralKnowledge ?? false,
      });

      // 9. Store AI response
      await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'AI_ASSISTANT',
          content: result.answer,
          metadata: {
            confidence: result.confidence,
            sources: result.sources?.map((s) => s.documentId),
          },
        },
      });

      // 10. Send reply to Telegram
      await this.telegramApi.sendMessage(config.botToken, chatId, result.answer);

      this.logger.log(`Replied to Telegram chat ${chatId}, confidence: ${result.confidence?.toFixed(2)}`);
    } catch (error) {
      this.logger.error(`Failed to process Telegram message from chat ${chatId}`, error);

      // Send fallback message
      try {
        await this.telegramApi.sendMessage(
          config.botToken,
          chatId,
          'Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau hoặc liên hệ hotline để được hỗ trợ.',
        );
      } catch {
        // ignore fallback errors
      }
    }
  }

  async setupWebhook(tenantSlug: string, baseUrl: string): Promise<{ ok: boolean; description?: string }> {
    const tenant = await this.resolveTenantBySlug(tenantSlug);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantSlug}`);
    }

    const config = (tenant.settings as any)?.telegram as TelegramConfig;
    if (!config?.botToken) {
      throw new Error(`Tenant ${tenantSlug} missing telegram botToken`);
    }

    const webhookUrl = `${baseUrl}/api/v1/webhooks/telegram/${tenantSlug}`;
    return this.telegramApi.setWebhook(config.botToken, webhookUrl, config.webhookSecret);
  }

  private async resolveTenantBySlug(slug: string) {
    return this.prisma.tenant.findFirst({
      where: {
        slug,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        slug: true,
        databaseUrl: true,
        settings: true,
      },
    });
  }
}
