import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationRepository } from '../repositories/conversation.repository';
import { ConversationMessageDto } from '../dto/conversation-message.dto';
import { CustomerMessageEvent } from '@core/event-bus/events/customer-message.event';

@Injectable()
export class ConversationHistoryService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createConversation(customerId: string, channel = 'chat') {
    return this.conversationRepo.create(customerId, channel);
  }

  async getConversations(customerId: string) {
    return this.conversationRepo.findByCustomerId(customerId);
  }

  async getMessages(conversationId: string) {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) throw new NotFoundException(`Conversation "${conversationId}" not found`);
    return this.conversationRepo.getMessages(conversationId);
  }

  async addMessage(
    conversationId: string,
    dto: ConversationMessageDto,
    tenantId?: string,
    tenantDatabaseUrl?: string,
  ) {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) throw new NotFoundException(`Conversation "${conversationId}" not found`);

    const message = await this.conversationRepo.addMessage(conversationId, dto.role, dto.content);

    // Emit event for preference extraction (after a few messages)
    if (tenantId && tenantDatabaseUrl) {
      const messages = await this.conversationRepo.getMessages(conversationId);
      if (messages.length >= 3 && messages.length % 3 === 0) {
        this.eventEmitter.emit(
          'customer.message',
          new CustomerMessageEvent(
            tenantId,
            tenantDatabaseUrl,
            conversation.customerId,
            conversationId,
            messages.map((m) => ({ role: m.role, content: m.content })),
          ),
        );
      }
    }

    return message;
  }

  async closeConversation(conversationId: string) {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) throw new NotFoundException(`Conversation "${conversationId}" not found`);
    return this.conversationRepo.close(conversationId);
  }
}
