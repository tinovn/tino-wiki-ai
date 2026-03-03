import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';

interface TenantInfo {
  id: string;
  slug: string;
  databaseUrl: string;
  settings: any;
}

export interface InitSessionResponse {
  sessionId: string;
  config: {
    theme: { primaryColor: string; position: string };
    welcomeMessage: string;
    placeholder: string;
    title: string;
  };
  history: Array<{ role: string; content: string; createdAt: string }>;
}

@Injectable()
export class ChatWidgetService {
  private readonly logger = new Logger(ChatWidgetService.name);

  constructor(
    private readonly clientManager: PrismaClientManager,
    private readonly queryEngine: QueryEngineService,
  ) {}

  async initSession(
    tenant: TenantInfo,
    dto: { sessionId?: string; visitorName?: string; metadata?: Record<string, any> },
  ): Promise<InitSessionResponse> {
    const db = await this.clientManager.getClient(tenant.databaseUrl);
    const chatwidgetConfig = tenant.settings?.chatwidget || {};

    // Generate or resume session
    let sessionId = dto.sessionId;
    let history: Array<{ role: string; content: string; createdAt: string }> = [];

    if (sessionId) {
      // Try to resume existing session
      const customer = await db.customer.findUnique({ where: { externalId: sessionId } });
      if (customer) {
        const conversation = await db.conversation.findFirst({
          where: { customerId: customer.id, channel: 'chatwidget', status: 'ACTIVE' },
          orderBy: { startedAt: 'desc' },
        });
        if (conversation) {
          const messages = await db.conversationMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'asc' },
            take: 50,
            select: { role: true, content: true, createdAt: true },
          });
          history = messages.map((m) => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
          }));
        }
      } else {
        // Session ID not found, generate new one
        sessionId = undefined;
      }
    }

    if (!sessionId) {
      sessionId = 'ws_' + crypto.randomBytes(16).toString('hex');
    }

    // Upsert customer
    const existing = await db.customer.findUnique({ where: { externalId: sessionId } });
    if (!existing) {
      await db.customer.create({
        data: {
          externalId: sessionId,
          name: dto.visitorName || null,
          metadata: {
            channel: 'chatwidget',
            ...(dto.metadata || {}),
          },
        },
      });
    }

    // Return widget config
    return {
      sessionId,
      config: {
        theme: chatwidgetConfig.theme || { primaryColor: '#1890ff', position: 'bottom-right' },
        welcomeMessage: chatwidgetConfig.welcomeMessage || 'Xin chào! Tôi có thể giúp gì cho bạn?',
        placeholder: chatwidgetConfig.placeholder || 'Nhập câu hỏi...',
        title: chatwidgetConfig.title || 'Hỗ trợ AI',
      },
      history,
    };
  }

  async sendMessage(
    tenant: TenantInfo,
    dto: { sessionId: string; message: string },
  ) {
    const db = await this.clientManager.getClient(tenant.databaseUrl);

    // Find customer
    const customer = await db.customer.findUnique({
      where: { externalId: dto.sessionId },
    });
    if (!customer) {
      throw new Error('Session not found. Please reinitialize.');
    }

    // Find or create conversation
    let conversation = await db.conversation.findFirst({
      where: { customerId: customer.id, channel: 'chatwidget', status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
    });
    if (!conversation) {
      conversation = await db.conversation.create({
        data: { customerId: customer.id, channel: 'chatwidget' },
      });
    }

    // Store customer message
    await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'CUSTOMER',
        content: dto.message,
        metadata: { sessionId: dto.sessionId },
      },
    });

    // Load customer memories
    const memories = await db.customerMemory.findMany({
      where: { customerId: customer.id },
    });

    const tenantSettings = tenant.settings || {};
    const aiSettings = tenantSettings.ai || {};

    // Query AI
    const result = await this.queryEngine.query({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantDatabaseUrl: tenant.databaseUrl,
      question: dto.message,
      customerId: customer.id,
      customerMemory: memories.map((m) => ({
        type: m.type,
        key: m.key,
        value: m.value,
      })),
      allowGeneralKnowledge: aiSettings.allowGeneralKnowledge ?? false,
    });

    // Store AI response
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

    return result;
  }

  async *sendMessageStream(
    tenant: TenantInfo,
    dto: { sessionId: string; message: string },
  ) {
    const db = await this.clientManager.getClient(tenant.databaseUrl);

    // Find customer
    const customer = await db.customer.findUnique({
      where: { externalId: dto.sessionId },
    });
    if (!customer) {
      throw new Error('Session not found. Please reinitialize.');
    }

    // Find or create conversation
    let conversation = await db.conversation.findFirst({
      where: { customerId: customer.id, channel: 'chatwidget', status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
    });
    if (!conversation) {
      conversation = await db.conversation.create({
        data: { customerId: customer.id, channel: 'chatwidget' },
      });
    }

    // Store customer message
    await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'CUSTOMER',
        content: dto.message,
        metadata: { sessionId: dto.sessionId },
      },
    });

    // Load customer memories
    const memories = await db.customerMemory.findMany({
      where: { customerId: customer.id },
    });

    const tenantSettings = tenant.settings || {};
    const aiSettings = tenantSettings.ai || {};

    // Stream AI response
    let fullAnswer = '';
    const stream = this.queryEngine.queryStream({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantDatabaseUrl: tenant.databaseUrl,
      question: dto.message,
      customerId: customer.id,
      customerMemory: memories.map((m) => ({
        type: m.type,
        key: m.key,
        value: m.value,
      })),
      allowGeneralKnowledge: aiSettings.allowGeneralKnowledge ?? false,
    });

    for await (const chunk of stream) {
      fullAnswer += chunk.content || '';
      yield chunk;
      if (chunk.isLast) break;
    }

    // Store complete AI response
    await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'AI_ASSISTANT',
        content: fullAnswer,
        metadata: { streamed: true },
      },
    });
  }

  async getHistory(
    tenant: TenantInfo,
    sessionId: string,
  ): Promise<Array<{ role: string; content: string; createdAt: string }>> {
    const db = await this.clientManager.getClient(tenant.databaseUrl);

    const customer = await db.customer.findUnique({
      where: { externalId: sessionId },
    });
    if (!customer) return [];

    const conversation = await db.conversation.findFirst({
      where: { customerId: customer.id, channel: 'chatwidget', status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
    });
    if (!conversation) return [];

    const messages = await db.conversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: { role: true, content: true, createdAt: true },
    });

    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));
  }
}
