import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryEngineService } from '@modules/ai/services/query-engine.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { QueryConversationsDto } from '../dto';
import { CONVERSATION_EVENTS, ConversationNewMessagePayload } from '../interfaces/conversation-events.interface';
import { ChannelDispatcherService } from './channel-dispatcher.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly repo: ConversationsRepository,
    private readonly channelDispatcher: ChannelDispatcherService,
    private readonly queryEngine: QueryEngineService,
    private readonly eventEmitter: EventEmitter2,
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

  async closeConversation(conversationId: string, tenantId: string) {
    const conv = await this.repo.closeConversation(conversationId);
    this.eventEmitter.emit(CONVERSATION_EVENTS.UPDATED, {
      tenantId,
      conversationId,
      changes: { status: 'CLOSED' },
    });
    return conv;
  }

  async reopenConversation(conversationId: string, tenantId: string) {
    const conv = await this.repo.reopenConversation(conversationId);
    this.eventEmitter.emit(CONVERSATION_EVENTS.UPDATED, {
      tenantId,
      conversationId,
      changes: { status: 'ACTIVE' },
    });
    return conv;
  }

  async markAsRead(conversationId: string) {
    return this.repo.markAsRead(conversationId);
  }

  /**
   * Get AI suggestion for the last customer message in a conversation.
   */
  async getAiSuggestion(
    conversationId: string,
    tenant: { id: string; slug: string; databaseUrl: string },
  ) {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Find last customer message
    const messages = await this.repo.findMessages(conversationId);
    const lastCustomerMsg = [...messages].reverse().find((m) => m.role === 'CUSTOMER');
    if (!lastCustomerMsg) {
      return { suggestion: '' };
    }

    // Build conversation history
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    // Load customer memories
    const customer = conversation.customer;
    const memories = customer?.memories?.map((m) => ({
      type: m.type,
      key: m.key,
      value: m.value,
    })) || [];

    const result = await this.queryEngine.query({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantDatabaseUrl: tenant.databaseUrl,
      question: lastCustomerMsg.content,
      customerId: customer?.id,
      customerMemory: memories,
      conversationHistory: history.slice(0, -1),
    });

    return { suggestion: result.answer, confidence: result.confidence };
  }

  // Notes
  async findNotes(conversationId: string) {
    return this.repo.findNotes(conversationId);
  }

  async createNote(conversationId: string, userId: string, content: string) {
    return this.repo.createNote({ conversationId, userId, content });
  }
}
