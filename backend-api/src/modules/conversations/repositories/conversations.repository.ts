import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';
import { QueryConversationsDto } from '../dto';

@Injectable()
export class ConversationsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(filter: QueryConversationsDto, agentId?: string) {
    const prisma = await this.tenantPrisma.getClient();
    const { view, channel, status, search, page = 1, limit = 20 } = filter;

    const where: Record<string, unknown> = {};

    // View filter
    if (view === 'mine' && agentId) {
      where.assignedAgentId = agentId;
    } else if (view === 'unassigned') {
      where.assignedAgentId = null;
    }

    // Channel filter
    if (channel) {
      where.channel = channel;
    }

    // Status filter (default: show ACTIVE)
    where.status = status || 'ACTIVE';

    // Search by customer name/email
    if (search) {
      where.customer = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { externalId: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true, externalId: true, metadata: true },
          },
          assignedAgent: {
            select: { id: true, displayName: true, email: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, role: true, createdAt: true },
          },
        },
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    // Transform: embed lastMessage
    const conversations = data.map((conv) => {
      const { messages, ...rest } = conv;
      return {
        ...rest,
        lastMessage: messages[0] || null,
      };
    });

    return { data: conversations, total };
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            memories: true,
          },
        },
        assignedAgent: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
  }

  async findMessages(conversationId: string, cursor?: string, limit = 50) {
    const prisma = await this.tenantPrisma.getClient();

    const where: Record<string, unknown> = { conversationId };
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    // Fetch DESC to get newest messages first, then reverse for chronological order
    const messages = await prisma.conversationMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async createMessage(data: {
    conversationId: string;
    role: string;
    content: string;
    senderId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const prisma = await this.tenantPrisma.getClient();

    const message = await prisma.conversationMessage.create({
      data: {
        conversationId: data.conversationId,
        role: data.role as any,
        content: data.content,
        senderId: data.senderId,
        metadata: (data.metadata as any) || {},
      },
    });

    // Update lastMessageAt and unreadCount
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: {
        lastMessageAt: message.createdAt,
        ...(data.role === 'CUSTOMER' ? { unreadCount: { increment: 1 } } : {}),
      },
    });

    return message;
  }

  async updateConversation(id: string, data: Record<string, unknown>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.update({
      where: { id },
      data: data as any,
    });
  }

  async assignAgent(id: string, agentId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.update({
      where: { id },
      data: { assignedAgentId: agentId },
    });
  }

  async unassignAgent(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.update({
      where: { id },
      data: { assignedAgentId: null },
    });
  }

  async closeConversation(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.update({
      where: { id },
      data: { status: 'CLOSED', endedAt: new Date(), assignedAgentId: null, isHandoff: false, handoffReason: null },
    });
  }

  async reopenConversation(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.update({
      where: { id },
      data: { status: 'ACTIVE', endedAt: null },
    });
  }

  async markAsRead(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  /**
   * Find all conversations for a customer across channels, excluding a given conversation.
   */
  async findByCustomer(customerId: string, excludeConversationId?: string) {
    const prisma = await this.tenantPrisma.getClient();
    const where: Record<string, unknown> = { customerId };
    if (excludeConversationId) {
      where.id = { not: excludeConversationId };
    }
    return prisma.conversation.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    });
  }

  // Notes
  async findNotes(conversationId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversationNote.findMany({
      where: { conversationId },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createNote(data: { conversationId: string; userId: string; content: string }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversationNote.create({
      data,
      include: { user: { select: { id: true, displayName: true } } },
    });
  }
}
