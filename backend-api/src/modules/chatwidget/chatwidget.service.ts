import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';
import { HandoffService } from '@modules/conversations/services/handoff.service';
import { CONVERSATION_EVENTS } from '@modules/conversations/interfaces/conversation-events.interface';
import { CustomerMessageEvent } from '@core/event-bus/events/customer-message.event';
import { EcommerceChatbotService } from '@modules/ecommerce-chatbot/ecommerce-chatbot.service';
import { resolveTenantMessage } from '@common/utils';

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
    @Optional() private readonly ecommerceChatbot?: EcommerceChatbotService,
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
          where: { customerId: customer.id, channel: 'chatwidget' },
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
        welcomeMessage: history.length > 0
          ? resolveTenantMessage(tenant.settings, 'welcomeBackMessage', 'chatwidget')
          : resolveTenantMessage(tenant.settings, 'welcomeMessage', 'chatwidget'),
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
      where: { customerId: customer.id, channel: 'chatwidget' },
      orderBy: { startedAt: 'desc' },
    });
    let welcomeBack: string | null = null;
    if (!conversation) {
      conversation = await db.conversation.create({
        data: { customerId: customer.id, channel: 'chatwidget' },
      });
    } else if (conversation.status === 'CLOSED') {
      conversation = await db.conversation.update({
        where: { id: conversation.id },
        data: { status: 'ACTIVE', endedAt: null },
      });
      welcomeBack = resolveTenantMessage(tenant.settings, 'welcomeBackMessage', 'chatwidget');
    }

    // Store welcome back as SYSTEM message if reopened
    if (welcomeBack) {
      await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'SYSTEM',
          content: welcomeBack,
          metadata: { event: 'conversation_reopened' },
        },
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
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'customer_request', tenant.settings, 'chatwidget');
      return { answer: resolveTenantMessage(tenant.settings, 'handoffMessage', 'chatwidget'), confidence: 1, sources: [] };
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

    // Check if AI is enabled for this tenant
    const aiEnabled = aiSettings.enabled !== false;
    if (!aiEnabled) {
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'ai_disabled', tenant.settings, 'chatwidget');
      return { answer: resolveTenantMessage(tenant.settings, 'handoffMessage', 'chatwidget'), confidence: 1, sources: [] };
    }

    // Query AI - route to ecommerce chatbot if enabled
    let result;
    const isEcommerce = tenantSettings.ecommerce?.enabled === true;

    try {
      if (isEcommerce && this.ecommerceChatbot) {
        // Ecommerce chatbot pipeline
        const convMessages = await db.conversationMessage.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'asc' },
          take: 50,
          select: { role: true, content: true },
        });

        const ecomResult = await this.ecommerceChatbot.chat({
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantDatabaseUrl: tenant.databaseUrl,
          customerId: customer.id,
          conversationId: conversation.id,
          channel: 'chatwidget',
          message: dto.message,
          conversationMessages: convMessages.map((m) => ({ role: m.role.toLowerCase(), content: m.content })),
          customerMemories: memories.map((m) => ({ type: m.type, key: m.key, value: m.value })),
        });

        result = { answer: ecomResult.answer, confidence: ecomResult.confidence, sources: ecomResult.sources };
      } else {
        // Standard wiki RAG pipeline
        result = await this.queryEngine.query({
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
      }
    } catch (aiError: any) {
      this.logger.error(`AI query failed for conversation ${conversation.id}`, aiError);
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'ai_unavailable', tenant.settings, 'chatwidget');
      return { answer: resolveTenantMessage(tenant.settings, 'aiUnavailableMessage', 'chatwidget'), confidence: 1, sources: [] };
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
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'low_confidence', tenant.settings, 'chatwidget');
      return { answer: resolveTenantMessage(tenant.settings, 'handoffMessage', 'chatwidget'), confidence: 1, sources: [] };
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

    // Trigger preference extraction every 3 messages
    const messageCount = await db.conversationMessage.count({ where: { conversationId: conversation.id } });
    if (messageCount >= 3 && messageCount % 3 === 0) {
      const recentForExtraction = await db.conversationMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: { role: true, content: true },
      });
      this.eventEmitter.emit(
        'customer.message',
        new CustomerMessageEvent(tenant.id, tenant.databaseUrl, customer.id, conversation.id, recentForExtraction.map((m) => ({ role: m.role, content: m.content }))),
      );
    }

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
      where: { customerId: customer.id, channel: 'chatwidget' },
      orderBy: { startedAt: 'desc' },
    });
    let welcomeBack: string | null = null;
    if (!conversation) {
      conversation = await db.conversation.create({
        data: { customerId: customer.id, channel: 'chatwidget' },
      });
    } else if (conversation.status === 'CLOSED') {
      conversation = await db.conversation.update({
        where: { id: conversation.id },
        data: { status: 'ACTIVE', endedAt: null },
      });
      welcomeBack = resolveTenantMessage(tenant.settings, 'welcomeBackMessage', 'chatwidget');
    }

    // Store welcome back as SYSTEM message if reopened
    if (welcomeBack) {
      await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'SYSTEM',
          content: welcomeBack,
          metadata: { event: 'conversation_reopened' },
        },
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
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'customer_request', tenant.settings, 'chatwidget');
      yield { content: resolveTenantMessage(tenant.settings, 'handoffMessage', 'chatwidget'), isLast: true };
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

    // Check if AI is enabled for this tenant
    const aiEnabled = aiSettings.enabled !== false;
    if (!aiEnabled) {
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'ai_disabled', tenant.settings, 'chatwidget');
      yield { content: resolveTenantMessage(tenant.settings, 'handoffMessage', 'chatwidget'), isLast: true };
      return;
    }

    // Stream AI response
    let fullAnswer = '';
    try {
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
    } catch (aiError: any) {
      this.logger.error(`AI stream failed for conversation ${conversation.id}`, aiError);
      await this.handoffService.triggerHandoff(tenant.id, tenant.databaseUrl, conversation.id, customer.id, 'ai_unavailable', tenant.settings, 'chatwidget');
      yield { content: resolveTenantMessage(tenant.settings, 'aiUnavailableMessage', 'chatwidget'), isLast: true };
      return;
    }

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

    // Trigger preference extraction every 3 messages
    const messageCount = await db.conversationMessage.count({ where: { conversationId: conversation.id } });
    if (messageCount >= 3 && messageCount % 3 === 0) {
      const recentForExtraction = await db.conversationMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: { role: true, content: true },
      });
      this.eventEmitter.emit(
        'customer.message',
        new CustomerMessageEvent(tenant.id, tenant.databaseUrl, customer.id, conversation.id, recentForExtraction.map((m) => ({ role: m.role, content: m.content }))),
      );
    }
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
      where: { customerId: customer.id, channel: 'chatwidget' },
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
