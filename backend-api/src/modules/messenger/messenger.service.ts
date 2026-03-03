import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';
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

      // 5. Find or create active conversation
      let conversation = await db.conversation.findFirst({
        where: { customerId: customer.id, channel: 'messenger', status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
      });
      if (!conversation) {
        conversation = await db.conversation.create({
          data: { customerId: customer.id, channel: 'messenger' },
        });
      }

      // 6. Store customer message
      await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'CUSTOMER',
          content: userText,
          metadata: { psid, timestamp: messaging.timestamp },
        },
      });

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
        conversationHistory: history,
        allowGeneralKnowledge: aiSettings.allowGeneralKnowledge ?? false,
      });

      // Strip markdown for FB (basic: remove **, ##, etc.)
      const plainAnswer = this.stripMarkdown(result.answer);

      // 8. Store AI response
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

      // 9. Send reply to Facebook
      await this.fbApi.sendMessage(psid, plainAnswer, config.pageAccessToken);

      this.logger.log(`Replied to ${psid}, confidence: ${result.confidence?.toFixed(2)}`);
    } catch (error) {
      this.logger.error(`Failed to process FB message from ${psid}`, error);

      // Send fallback message
      try {
        await this.fbApi.sendMessage(
          psid,
          'Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau hoặc liên hệ hotline để được hỗ trợ.',
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
