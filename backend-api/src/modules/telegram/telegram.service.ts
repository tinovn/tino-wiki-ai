import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';
import { CustomerMessageEvent } from '@core/event-bus/events/customer-message.event';
import { HandoffService } from '@modules/conversations/services/handoff.service';
import { CONVERSATION_EVENTS } from '@modules/conversations/interfaces/conversation-events.interface';
import { EcommerceChatbotService } from '@modules/ecommerce-chatbot/ecommerce-chatbot.service';
import { resolveTenantMessage } from '@common/utils';
import { TelegramApiService } from './telegram-api.service';

interface TelegramConfig {
  botToken: string;
  botUsername?: string;
}

interface TenantInfo {
  id: string;
  slug: string;
  databaseUrl: string;
  settings: any;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bots = new Map<string, TelegramBot>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientManager: PrismaClientManager,
    private readonly queryEngine: QueryEngineService,
    private readonly telegramApi: TelegramApiService,
    private readonly eventEmitter: EventEmitter2,
    private readonly handoffService: HandoffService,
    @Optional() private readonly ecommerceChatbot?: EcommerceChatbotService,
  ) {}

  async onModuleInit() {
    // Auto-start bots for all tenants with telegram config
    await this.startAllBots();
  }

  async onModuleDestroy() {
    await this.stopAllBots();
  }

  async startAllBots(): Promise<{ started: string[]; errors: string[] }> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, slug: true, databaseUrl: true, settings: true },
    });

    const started: string[] = [];
    const errors: string[] = [];

    for (const tenant of tenants) {
      const config = (tenant.settings as any)?.telegram as TelegramConfig;
      if (!config?.botToken) continue;

      try {
        await this.startBot(tenant.slug, config.botToken, tenant as TenantInfo);
        started.push(tenant.slug);
      } catch (err: any) {
        errors.push(`${tenant.slug}: ${err.message}`);
        this.logger.error(`Failed to start bot for ${tenant.slug}: ${err.message}`);
      }
    }

    if (started.length) {
      this.logger.log(`Telegram bots started: ${started.join(', ')}`);
    }
    return { started, errors };
  }

  async startBot(tenantSlug: string, botToken?: string, tenant?: TenantInfo): Promise<void> {
    // Stop existing bot for this tenant if running
    if (this.bots.has(tenantSlug)) {
      await this.stopBot(tenantSlug);
    }

    // Resolve tenant if not provided
    if (!tenant) {
      tenant = await this.resolveTenantBySlug(tenantSlug) as TenantInfo;
      if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);
    }

    // Resolve bot token from tenant settings if not provided
    if (!botToken) {
      botToken = (tenant.settings as any)?.telegram?.botToken;
      if (!botToken) throw new Error(`No Telegram bot token configured for ${tenantSlug}`);
    }

    // Delete any existing webhook first
    try {
      await this.telegramApi.deleteWebhook(botToken);
    } catch {
      // ignore
    }

    const bot = new TelegramBot(botToken, { polling: true });

    bot.on('message', (msg) => {
      if (!msg.text) return;
      this.handleMessage(tenant!, msg).catch((err) => {
        this.logger.error(`Error processing message for ${tenantSlug}: ${err.message}`);
      });
    });

    bot.on('polling_error', (err) => {
      this.logger.error(`Polling error for ${tenantSlug}: ${err.message}`);
    });

    this.bots.set(tenantSlug, bot);
    this.logger.log(`Telegram bot started for tenant: ${tenantSlug}`);
  }

  async stopBot(tenantSlug: string): Promise<void> {
    const bot = this.bots.get(tenantSlug);
    if (bot) {
      await bot.stopPolling();
      this.bots.delete(tenantSlug);
      this.logger.log(`Telegram bot stopped for tenant: ${tenantSlug}`);
    }
  }

  async stopAllBots(): Promise<void> {
    for (const [slug] of this.bots) {
      await this.stopBot(slug);
    }
  }

  getRunningBots(): string[] {
    return Array.from(this.bots.keys());
  }

  private async handleMessage(tenant: TenantInfo, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userText = msg.text!;
    const bot = this.bots.get(tenant.slug);
    if (!bot) return;

    const username = msg.from?.username || msg.from?.first_name || String(chatId);
    this.logger.log(`Telegram message from ${username} (${chatId}): "${userText.slice(0, 50)}..."`);

    try {
      // Show typing
      await bot.sendChatAction(chatId, 'typing');

      // Get tenant DB
      const db = await this.clientManager.getClient(tenant.databaseUrl);

      // Upsert customer
      const externalId = String(chatId);
      let customer = await db.customer.findUnique({ where: { externalId } });
      if (!customer) {
        customer = await db.customer.create({
          data: {
            externalId,
            name: msg.from ? `${msg.from.first_name}${msg.from.last_name ? ' ' + msg.from.last_name : ''}` : undefined,
            metadata: {
              channel: 'telegram',
              username: msg.from?.username,
              chatType: msg.chat.type,
            },
          },
        });
        this.logger.log(`Created new customer for Telegram chat ${chatId}`);
      }

      // Find or create conversation (always reuse existing)
      let conversation = await db.conversation.findFirst({
        where: { customerId: customer.id, channel: 'telegram' },
        orderBy: { startedAt: 'desc' },
      });
      if (!conversation) {
        conversation = await db.conversation.create({
          data: { customerId: customer.id, channel: 'telegram' },
        });
        // Send welcome message for new conversations
        const welcomeMsg = resolveTenantMessage(tenant.settings, 'welcomeMessage', 'telegram');
        await bot.sendMessage(chatId, welcomeMsg);
        await db.conversationMessage.create({
          data: { conversationId: conversation.id, role: 'SYSTEM', content: welcomeMsg, metadata: { event: 'welcome' } },
        });
      } else if (conversation.status === 'CLOSED') {
        conversation = await db.conversation.update({
          where: { id: conversation.id },
          data: { status: 'ACTIVE', endedAt: null },
        });
        // Send welcome back message
        const welcomeBackMsg = resolveTenantMessage(tenant.settings, 'welcomeBackMessage', 'telegram');
        await bot.sendMessage(chatId, welcomeBackMsg);
        await db.conversationMessage.create({
          data: { conversationId: conversation.id, role: 'SYSTEM', content: welcomeBackMsg, metadata: { event: 'conversation_reopened' } },
        });
      }

      // Store customer message
      const customerMsg = await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'CUSTOMER',
          content: userText,
          metadata: { chatId, messageId: msg.message_id, username: msg.from?.username },
        },
      });

      // Update lastMessageAt
      await db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: customerMsg.createdAt, unreadCount: { increment: 1 } },
      });

      // Emit new message event for agent inbox
      this.eventEmitter.emit(CONVERSATION_EVENTS.NEW_MESSAGE, {
        tenantId: tenant.id,
        tenantDatabaseUrl: tenant.databaseUrl,
        conversationId: conversation.id,
        customerId: customer.id,
        message: { id: customerMsg.id, role: 'CUSTOMER', content: userText, createdAt: customerMsg.createdAt },
      });

      // Check greeting: reply with welcome message, skip AI
      if (this.handoffService.isGreeting(userText)) {
        const greetingReply = resolveTenantMessage(tenant.settings, 'welcomeMessage', 'telegram');
        await db.conversationMessage.create({
          data: { conversationId: conversation.id, role: 'AI_ASSISTANT', content: greetingReply },
        });
        await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
        await bot.sendMessage(chatId, greetingReply);
        return;
      }

      // Check handoff: keyword detection
      if (this.handoffService.shouldHandoffByKeyword(userText)) {
        await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'customer_request', tenant.settings, 'telegram');
        await bot.sendMessage(chatId, resolveTenantMessage(tenant.settings, 'handoffMessage', 'telegram'));
        return;
      }

      // Skip AI if user agent is handling (assigned or handoff)
      if (await this.handoffService.isInHandoff(tenant.databaseUrl, conversation.id)) {
        this.logger.log(`Conversation ${conversation.id} handled by user agent, skipping AI`);
        return;
      }

      // Fetch conversation history for context
      const recentMessages = await db.conversationMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: { role: true, content: true },
      });

      // Query AI with history
      const memories = await db.customerMemory.findMany({
        where: { customerId: customer.id },
      });

      const tenantSettings = (tenant.settings as any) || {};
      const aiSettings = tenantSettings.ai || {};

      // Check if AI is enabled for this tenant
      const aiEnabled = aiSettings.enabled !== false;
      if (!aiEnabled) {
        await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'ai_disabled', tenant.settings, 'telegram');
        await bot.sendMessage(chatId, resolveTenantMessage(tenant.settings, 'handoffMessage', 'telegram'));
        return;
      }

      // Exclude the current message from history (it's the question)
      const history = recentMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let result;
      const isEcommerce = tenantSettings.ecommerce?.enabled === true;

      try {
        if (isEcommerce && this.ecommerceChatbot) {
          const ecomResult = await this.ecommerceChatbot.chat({
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantDatabaseUrl: tenant.databaseUrl,
            customerId: customer.id,
            conversationId: conversation.id,
            channel: 'telegram',
            message: userText,
            conversationMessages: history.map((m) => ({ role: m.role.toLowerCase(), content: m.content })),
            customerMemories: memories.map((m) => ({ type: m.type, key: m.key, value: m.value })),
          });
          result = { answer: ecomResult.answer, confidence: ecomResult.confidence, sources: ecomResult.sources };
        } else {
          result = await this.queryEngine.query({
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
            conversationHistory: history,
            allowGeneralKnowledge: aiSettings.allowGeneralKnowledge ?? false,
          });
        }
      } catch (aiError: any) {
        this.logger.error(`AI query failed for conversation ${conversation.id}`, aiError);
        await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'ai_unavailable', tenant.settings, 'telegram');
        await bot.sendMessage(chatId, resolveTenantMessage(tenant.settings, 'aiUnavailableMessage', 'telegram'));
        return;
      }

      // Check handoff: low confidence
      if (this.handoffService.shouldHandoffByConfidence(result.confidence ?? 1)) {
        await db.conversationMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'AI_ASSISTANT',
            content: result.answer,
            metadata: { confidence: result.confidence, isSuggestion: true },
          },
        });
        await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'low_confidence', tenant.settings, 'telegram');
        await bot.sendMessage(chatId, resolveTenantMessage(tenant.settings, 'handoffMessage', 'telegram'));
        return;
      }

      // Store AI response
      const aiMsg = await db.conversationMessage.create({
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

      // Update lastMessageAt
      await db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: aiMsg.createdAt },
      });

      // Emit AI response event
      this.eventEmitter.emit(CONVERSATION_EVENTS.NEW_MESSAGE, {
        tenantId: tenant.id,
        tenantDatabaseUrl: tenant.databaseUrl,
        conversationId: conversation.id,
        customerId: customer.id,
        message: { id: aiMsg.id, role: 'AI_ASSISTANT', content: result.answer, createdAt: aiMsg.createdAt },
      });

      // Send reply
      await this.telegramApi.sendMessage(bot, chatId, result.answer);

      // Trigger preference extraction every 3 messages
      const totalMessages = recentMessages.length + 1;
      if (totalMessages >= 3 && totalMessages % 3 === 0) {
        const allMessages = [...recentMessages.map((m) => ({ role: m.role, content: m.content })), { role: 'AI_ASSISTANT', content: result.answer }];
        this.eventEmitter.emit(
          'customer.message',
          new CustomerMessageEvent(
            tenant.id,
            tenant.databaseUrl,
            customer.id,
            conversation.id,
            allMessages,
          ),
        );
      }

      this.logger.log(`Replied to Telegram chat ${chatId}, confidence: ${result.confidence?.toFixed(2)}`);
    } catch (error: any) {
      this.logger.error(`Failed to process Telegram message from chat ${chatId}`, error);

      try {
        await bot.sendMessage(chatId, resolveTenantMessage(tenant.settings, 'aiUnavailableMessage', 'telegram'));
      } catch {
        // ignore
      }
    }
  }

  private async resolveTenantBySlug(slug: string) {
    return this.prisma.tenant.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true, slug: true, databaseUrl: true, settings: true },
    });
  }
}
