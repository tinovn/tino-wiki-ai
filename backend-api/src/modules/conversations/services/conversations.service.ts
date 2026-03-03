import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';
import { EcommerceChatbotService } from '@modules/ecommerce-chatbot/ecommerce-chatbot.service';
import { MockCartService } from '@modules/ecommerce-chatbot/mock/mock-cart.service';
import { MockOrderService } from '@modules/ecommerce-chatbot/mock/mock-order.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { QueryConversationsDto } from '../dto';
import { CONVERSATION_EVENTS, ConversationNewMessagePayload } from '../interfaces/conversation-events.interface';
import { resolveTenantMessage } from '@common/utils';
import { ChannelDispatcherService } from './channel-dispatcher.service';
import { HandoffService } from './handoff.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly repo: ConversationsRepository,
    private readonly channelDispatcher: ChannelDispatcherService,
    private readonly queryEngine: QueryEngineService,
    private readonly eventEmitter: EventEmitter2,
    private readonly handoffService: HandoffService,
    @Optional() private readonly ecommerceChatbot?: EcommerceChatbotService,
    @Optional() private readonly mockCartService?: MockCartService,
    @Optional() private readonly mockOrderService?: MockOrderService,
  ) {}

  async findAll(filter: QueryConversationsDto, agentId?: string) {
    return this.repo.findAll(filter, agentId);
  }

  async findById(id: string) {
    const conversation = await this.repo.findById(id);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async findMessages(conversationId: string, cursor?: string, limit?: number) {
    return this.repo.findMessages(conversationId, cursor, limit);
  }

  /**
   * Agent sends a message to a customer.
   * Message is saved and dispatched to the original channel.
   */
  async sendAgentMessage(
    conversationId: string,
    agentId: string,
    agentName: string,
    content: string,
    tenant: { id: string; slug: string; databaseUrl: string },
  ) {
    // Verify conversation exists
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Save message
    const message = await this.repo.createMessage({
      conversationId,
      role: 'AGENT',
      content,
      senderId: agentId,
      metadata: { agentName },
    });

    // Emit WebSocket event
    this.eventEmitter.emit(CONVERSATION_EVENTS.NEW_MESSAGE, {
      tenantId: tenant.id,
      tenantDatabaseUrl: tenant.databaseUrl,
      conversationId,
      customerId: conversation.customerId,
      message: {
        id: message.id,
        role: 'AGENT',
        content,
        senderId: agentId,
        senderName: agentName,
        createdAt: message.createdAt,
      },
    } satisfies ConversationNewMessagePayload);

    // Dispatch to original channel (FB, Telegram, Widget)
    await this.channelDispatcher.dispatch(
      tenant.id,
      tenant.databaseUrl,
      { id: conversationId, channel: conversation.channel, customerId: conversation.customerId },
      content,
    );

    return message;
  }

  async assignAgent(conversationId: string, agentId: string, tenantId: string) {
    const conv = await this.repo.assignAgent(conversationId, agentId);
    this.eventEmitter.emit(CONVERSATION_EVENTS.UPDATED, {
      tenantId,
      conversationId,
      changes: { assignedAgentId: agentId },
    });
    return conv;
  }

  async unassignAgent(conversationId: string, tenantId: string) {
    const conv = await this.repo.unassignAgent(conversationId);
    this.eventEmitter.emit(CONVERSATION_EVENTS.UPDATED, {
      tenantId,
      conversationId,
      changes: { assignedAgentId: null },
    });
    return conv;
  }

  async updateConversation(conversationId: string, data: Record<string, unknown>, tenantId: string) {
    const conv = await this.repo.updateConversation(conversationId, data);
    this.eventEmitter.emit(CONVERSATION_EVENTS.UPDATED, {
      tenantId,
      conversationId,
      changes: data,
    });
    return conv;
  }

  async closeConversation(
    conversationId: string,
    tenant: { id: string; slug?: string; databaseUrl?: string; settings?: any },
  ) {
    const conv = await this.repo.closeConversation(conversationId);
    const content = resolveTenantMessage(tenant.settings, 'closedMessage');

    await this.repo.createMessage({
      conversationId,
      role: 'SYSTEM',
      content,
      metadata: { event: 'conversation_closed' },
    });

    this.eventEmitter.emit(CONVERSATION_EVENTS.UPDATED, {
      tenantId: tenant.id,
      conversationId,
      changes: { status: 'CLOSED' },
    });

    // Dispatch to customer channel
    if (tenant.databaseUrl && conv.channel) {
      await this.channelDispatcher.dispatch(
        tenant.id,
        tenant.databaseUrl,
        { id: conversationId, channel: conv.channel, customerId: conv.customerId },
        content,
      );
    }

    return conv;
  }

  async reopenConversation(
    conversationId: string,
    tenant: { id: string; slug?: string; databaseUrl?: string; settings?: any },
  ) {
    const conv = await this.repo.reopenConversation(conversationId);
    const content = resolveTenantMessage(tenant.settings, 'reopenMessage');

    await this.repo.createMessage({
      conversationId,
      role: 'SYSTEM',
      content,
      metadata: { event: 'conversation_reopened' },
    });

    this.eventEmitter.emit(CONVERSATION_EVENTS.UPDATED, {
      tenantId: tenant.id,
      conversationId,
      changes: { status: 'ACTIVE' },
    });

    // Dispatch to customer channel
    if (tenant.databaseUrl && conv.channel) {
      await this.channelDispatcher.dispatch(
        tenant.id,
        tenant.databaseUrl,
        { id: conversationId, channel: conv.channel, customerId: conv.customerId },
        content,
      );
    }

    return conv;
  }

  async markAsRead(conversationId: string) {
    return this.repo.markAsRead(conversationId);
  }

  /**
   * Get AI suggestion for the last customer message in a conversation.
   * Routes to ecommerce chatbot when tenant has ecommerce enabled.
   */
  async getAiSuggestion(
    conversationId: string,
    tenant: { id: string; slug: string; databaseUrl: string; settings?: any },
  ) {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Find last customer message
    const messages = await this.repo.findMessages(conversationId);
    const lastCustomerMsg = [...messages].reverse().find((m) => m.role === 'CUSTOMER');
    if (!lastCustomerMsg) {
      return { suggestion: '' };
    }

    // Load customer memories
    const customer = conversation.customer;
    const memories = customer?.memories?.map((m) => ({
      type: m.type,
      key: m.key,
      value: m.value,
    })) || [];

    // Route to ecommerce chatbot if enabled
    const tenantSettings = tenant.settings || {};
    const isEcommerce = tenantSettings.ecommerce?.enabled === true && this.ecommerceChatbot;

    if (isEcommerce) {
      try {
        const convMessages = messages.map((m) => ({ role: m.role.toLowerCase(), content: m.content }));

        const ecomResult = await this.ecommerceChatbot!.chat({
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantDatabaseUrl: tenant.databaseUrl,
          customerId: customer?.id || '',
          conversationId,
          channel: conversation.channel || 'unknown',
          message: lastCustomerMsg.content,
          conversationMessages: convMessages,
          customerMemories: memories,
        });

        return {
          suggestion: ecomResult.answer,
          confidence: ecomResult.confidence,
          intents: ecomResult.intents,
          source: 'ecommerce',
        };
      } catch (error: any) {
        this.logger.error(`Ecommerce AI suggestion failed, falling back to standard RAG`, error);
        // Fall through to standard RAG
      }
    }

    // Standard wiki RAG pipeline
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    const result = await this.queryEngine.query({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantDatabaseUrl: tenant.databaseUrl,
      question: lastCustomerMsg.content,
      customerId: customer?.id,
      customerMemory: memories,
      conversationHistory: history.slice(0, -1),
    });

    return { suggestion: result.answer, confidence: result.confidence, source: 'rag' };
  }

  /**
   * Resume AI handling for a conversation (cancel handoff).
   */
  async resumeAi(
    conversationId: string,
    tenant: { id: string; slug: string; databaseUrl: string; settings?: any },
  ) {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    await this.handoffService.cancelHandoff(tenant.id, tenant.databaseUrl, conversationId, conversation.customerId);
    return conversation;
  }

  /**
   * Get cross-channel conversation history for a customer.
   */
  async getCustomerConversations(conversationId: string) {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    const conversations = await this.repo.findByCustomer(conversation.customerId, conversationId);
    return conversations.map((conv) => {
      const { messages, ...rest } = conv;
      return { ...rest, lastMessage: messages[0] || null };
    });
  }

  /**
   * Get ecommerce context for a conversation (cart, orders, recent intents).
   * Used by agents to see customer's shopping context in the inbox.
   */
  async getEcommerceContext(
    conversationId: string,
    tenant: { id: string; slug: string; databaseUrl: string; settings?: any },
  ) {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    const tenantSettings = tenant.settings || {};
    if (!tenantSettings.ecommerce?.enabled || !this.ecommerceChatbot) {
      return { enabled: false };
    }

    const customerId = conversation.customer?.id || '';
    const result: Record<string, unknown> = {
      enabled: true,
      customerId,
      channel: conversation.channel,
    };

    // Get cart state
    if (this.mockCartService) {
      const cart = this.mockCartService.getCart(customerId);
      result.cart = {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        currency: cart.currency,
        items: cart.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      };
    }

    // Get recent orders
    if (this.mockOrderService) {
      const orders = this.mockOrderService.getOrders(customerId);
      result.recentOrders = orders.slice(0, 5).map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        itemCount: order.items.length,
      }));
    }

    return result;
  }

  // Notes
  async findNotes(conversationId: string) {
    return this.repo.findNotes(conversationId);
  }

  async createNote(conversationId: string, userId: string, content: string) {
    return this.repo.createNote({ conversationId, userId, content });
  }
}
