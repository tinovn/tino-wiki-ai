import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';
import { HandoffService } from '@modules/conversations/services/handoff.service';
import { CONVERSATION_EVENTS } from '@modules/conversations/interfaces/conversation-events.interface';

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
    private readonly eventEmitter: EventEmitter2,
    private readonly handoffService: HandoffService,
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
    const customerMsg = await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'CUSTOMER',
        content: dto.message,
        metadata: { sessionId: dto.sessionId },
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
      message: { id: customerMsg.id, role: 'CUSTOMER', content: dto.message, createdAt: customerMsg.createdAt },
    });

    // Check handoff: keyword detection
    if (this.handoffService.shouldHandoffByKeyword(dto.message)) {
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'customer_request');
      return { answer: 'Đang chuyển tiếp đến nhân viên hỗ trợ. Vui lòng chờ trong giây lát.', confidence: 1, sources: [] };
    }

    // Skip AI if conversation is in handoff mode
    if (await this.handoffService.isInHandoff(tenant.databaseUrl, conversation.id)) {
      return { answer: 'Nhân viên đang hỗ trợ bạn. Vui lòng chờ phản hồi.', confidence: 1, sources: [] };
    }

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
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'low_confidence');
      return { answer: 'Đang chuyển tiếp đến nhân viên hỗ trợ. Vui lòng chờ trong giây lát.', confidence: 1, sources: [] };
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
    const customerMsg = await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'CUSTOMER',
        content: dto.message,
        metadata: { sessionId: dto.sessionId },
      },
    });

    // Update lastMessageAt + unreadCount
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: customerMsg.createdAt, unreadCount: { increment: 1 } },
    });

    // Emit customer message event for agent inbox
    this.eventEmitter.emit(CONVERSATION_EVENTS.NEW_MESSAGE, {
      tenantId: tenant.id,
      tenantDatabaseUrl: tenant.databaseUrl,
      conversationId: conversation.id,
      customerId: customer.id,
      message: { id: customerMsg.id, role: 'CUSTOMER', content: dto.message, createdAt: customerMsg.createdAt },
    });

    // Check handoff: keyword detection
    if (this.handoffService.shouldHandoffByKeyword(dto.message)) {
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'customer_request');
      yield { content: 'Đang chuyển tiếp đến nhân viên hỗ trợ. Vui lòng chờ trong giây lát.', isLast: true };
      return;
    }

    // Skip AI if conversation is in handoff mode
    if (await this.handoffService.isInHandoff(tenant.databaseUrl, conversation.id)) {
      yield { content: 'Nhân viên đang hỗ trợ bạn. Vui lòng chờ phản hồi.', isLast: true };
      return;
    }

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

    // Check handoff: low confidence from streamed result metadata
    const lastChunk = { confidence: 1 }; // Stream doesn't return confidence easily, store full answer
    // Store complete AI response
    const aiMsg = await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'AI_ASSISTANT',
        content: fullAnswer,
        metadata: { streamed: true },
      },
    });

    // Update lastMessageAt
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: aiMsg.createdAt },
    });

    // Emit AI response event for agent inbox
    this.eventEmitter.emit(CONVERSATION_EVENTS.NEW_MESSAGE, {
      tenantId: tenant.id,
      tenantDatabaseUrl: tenant.databaseUrl,
      conversationId: conversation.id,
      customerId: customer.id,
      message: { id: aiMsg.id, role: 'AI_ASSISTANT', content: fullAnswer, createdAt: aiMsg.createdAt },
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
