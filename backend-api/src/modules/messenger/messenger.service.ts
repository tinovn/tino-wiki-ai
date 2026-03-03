import { Injectable, Logger, ForbiddenException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';
import { HandoffService } from '@modules/conversations/services/handoff.service';
import { CONVERSATION_EVENTS } from '@modules/conversations/interfaces/conversation-events.interface';
import { CustomerMessageEvent } from '@core/event-bus/events/customer-message.event';
import { EcommerceChatbotService } from '@modules/ecommerce-chatbot/ecommerce-chatbot.service';
import { resolveTenantMessage } from '@common/utils';
import { FacebookApiService } from './facebook-api.service';
import { FacebookWebhookDto, FbMessaging } from './dto/facebook-webhook.dto';

interface MessengerConfig {
  pageId: string;
  pageAccessToken: string;
  appSecret: string;
}

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientManager: PrismaClientManager,
    private readonly queryEngine: QueryEngineService,
    private readonly fbApi: FacebookApiService,
    private readonly eventEmitter: EventEmitter2,
    private readonly handoffService: HandoffService,
    @Optional() private readonly ecommerceChatbot?: EcommerceChatbotService,
  ) {}

  async handleWebhook(body: FacebookWebhookDto, rawBody: Buffer, signature: string): Promise<void> {
    if (body.object !== 'page') return;

    for (const entry of body.entry) {
      const pageId = entry.id;

      // 1. Resolve tenant by pageId
      const tenant = await this.resolveTenantByPageId(pageId);
      if (!tenant) {
        this.logger.warn(`No tenant found for FB pageId: ${pageId}`);
        continue;
      }

      const config = (tenant.settings as any)?.messenger as MessengerConfig;
      if (!config?.pageAccessToken) {
        this.logger.warn(`Tenant ${tenant.slug} missing messenger config`);
        continue;
      }

      // 2. Verify HMAC signature
      if (config.appSecret && signature) {
        this.verifySignature(rawBody, config.appSecret, signature);
      }

      // 3. Process each messaging event
      for (const messaging of entry.messaging) {
        // Skip non-text events (delivery receipts, read receipts, etc.)
        if (!messaging.message?.text) continue;

        await this.processMessage(tenant, config, messaging);
      }
    }
  }

  private async processMessage(
    tenant: { id: string; slug: string; databaseUrl: string; settings: any },
    config: MessengerConfig,
    messaging: FbMessaging,
  ): Promise<void> {
    const psid = messaging.sender.id;
    const userText = messaging.message!.text!;

    this.logger.log(`FB message from ${psid} to page ${config.pageId}: "${userText.slice(0, 50)}..."`);

    try {
      // Show typing indicator
      await this.fbApi.sendTypingOn(psid, config.pageAccessToken);

      // Get tenant DB client
      const db = await this.clientManager.getClient(tenant.databaseUrl);

      // 4. Upsert customer by PSID
      let customer = await db.customer.findUnique({ where: { externalId: psid } });
      if (!customer) {
        customer = await db.customer.create({
          data: {
            externalId: psid,
            metadata: { channel: 'messenger', pageId: config.pageId },
          },
        });
        this.logger.log(`Created new customer for PSID ${psid}`);
      }

      // 5. Find or create conversation (always reuse existing)
      let conversation = await db.conversation.findFirst({
        where: { customerId: customer.id, channel: 'messenger' },
        orderBy: { startedAt: 'desc' },
      });
      if (!conversation) {
        conversation = await db.conversation.create({
          data: { customerId: customer.id, channel: 'messenger' },
        });
        // Send welcome message for new conversations
        const welcomeMsg = resolveTenantMessage(tenant.settings, 'welcomeMessage', 'messenger');
        await this.fbApi.sendMessage(psid, welcomeMsg, config.pageAccessToken);
        await db.conversationMessage.create({
          data: { conversationId: conversation.id, role: 'SYSTEM', content: welcomeMsg, metadata: { event: 'welcome' } },
        });
      } else if (conversation.status === 'CLOSED') {
        conversation = await db.conversation.update({
          where: { id: conversation.id },
          data: { status: 'ACTIVE', endedAt: null },
        });
        // Send welcome back message
        const welcomeBackMsg = resolveTenantMessage(tenant.settings, 'welcomeBackMessage', 'messenger');
        await this.fbApi.sendMessage(psid, welcomeBackMsg, config.pageAccessToken);
        await db.conversationMessage.create({
          data: { conversationId: conversation.id, role: 'SYSTEM', content: welcomeBackMsg, metadata: { event: 'conversation_reopened' } },
        });
      }

      // 6. Store customer message
      const customerMsg = await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'CUSTOMER',
          content: userText,
          metadata: { psid, timestamp: messaging.timestamp },
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

      // Check handoff: keyword detection
      if (this.handoffService.shouldHandoffByKeyword(userText)) {
        await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'customer_request', tenant.settings, 'messenger');
        await this.fbApi.sendMessage(psid, resolveTenantMessage(tenant.settings, 'handoffMessage', 'messenger'), config.pageAccessToken);
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
      const history = recentMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 7. Query AI with customer memory + history
      const memories = await db.customerMemory.findMany({
        where: { customerId: customer.id },
      });

      const tenantSettings = (tenant.settings as any) || {};
      const aiSettings = tenantSettings.ai || {};

      // Check if AI is enabled for this tenant
      const aiEnabled = aiSettings.enabled !== false;
      if (!aiEnabled) {
        await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'ai_disabled', tenant.settings, 'messenger');
        await this.fbApi.sendMessage(psid, resolveTenantMessage(tenant.settings, 'handoffMessage', 'messenger'), config.pageAccessToken);
        return;
      }

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
            channel: 'messenger',
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
        await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'ai_unavailable', tenant.settings, 'messenger');
        await this.fbApi.sendMessage(psid, resolveTenantMessage(tenant.settings, 'aiUnavailableMessage', 'messenger'), config.pageAccessToken);
        return;
      }

      // Check handoff: low confidence
      if (this.handoffService.shouldHandoffByConfidence(result.confidence ?? 1)) {
        // Store AI response as suggestion (not sent to customer)
        await db.conversationMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'AI_ASSISTANT',
            content: result.answer,
            metadata: { confidence: result.confidence, isSuggestion: true },
          },
        });
        await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'low_confidence', tenant.settings, 'messenger');
        await this.fbApi.sendMessage(psid, resolveTenantMessage(tenant.settings, 'handoffMessage', 'messenger'), config.pageAccessToken);
        return;
      }

      // Strip markdown for FB (basic: remove **, ##, etc.)
      const plainAnswer = this.stripMarkdown(result.answer);

      // 8. Store AI response
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

      // 9. Send reply to Facebook
      await this.fbApi.sendMessage(psid, plainAnswer, config.pageAccessToken);

      // Trigger preference extraction every 3 messages
      const totalMessages = recentMessages.length + 1;
      if (totalMessages >= 3 && totalMessages % 3 === 0) {
        const allMessages = [...recentMessages.map((m) => ({ role: m.role, content: m.content })), { role: 'AI_ASSISTANT', content: result.answer }];
        this.eventEmitter.emit(
          'customer.message',
          new CustomerMessageEvent(tenant.id, tenant.databaseUrl, customer.id, conversation.id, allMessages),
        );
      }

      this.logger.log(`Replied to ${psid}, confidence: ${result.confidence?.toFixed(2)}`);
    } catch (error) {
      this.logger.error(`Failed to process FB message from ${psid}`, error);

      // Send fallback message
      try {
        await this.fbApi.sendMessage(
          psid,
          resolveTenantMessage(tenant.settings, 'aiUnavailableMessage', 'messenger'),
          config.pageAccessToken,
        );
      } catch {
        // ignore fallback errors
      }
    }
  }

  private async resolveTenantByPageId(pageId: string) {
    return this.prisma.tenant.findFirst({
      where: {
        status: 'ACTIVE',
        settings: {
          path: ['messenger', 'pageId'],
          equals: pageId,
        },
      },
      select: {
        id: true,
        slug: true,
        databaseUrl: true,
        settings: true,
      },
    });
  }

  private verifySignature(rawBody: Buffer, appSecret: string, signature: string): void {
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');

    try {
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        throw new ForbiddenException('Invalid FB webhook signature');
      }
    } catch {
      throw new ForbiddenException('Invalid FB webhook signature');
    }
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s/g, '')        // headings
      .replace(/\*\*(.*?)\*\*/g, '$1') // bold
      .replace(/\*(.*?)\*/g, '$1')     // italic
      .replace(/`{1,3}(.*?)`{1,3}/gs, '$1') // code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .trim();
  }
}
