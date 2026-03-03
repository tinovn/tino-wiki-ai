import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class ConversationRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(customerId: string, channel = 'chat') {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.create({
      data: { customerId, channel },
    });
  }

  async findByCustomerId(customerId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.findMany({
      where: { customerId },
      orderBy: { startedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.findUnique({ where: { id } });
  }

  async getMessages(conversationId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMessage(conversationId: string, role: string, content: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversationMessage.create({
      data: { conversationId, role: role as any, content },
    });
  }

  async close(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.conversation.update({
      where: { id },
      data: { status: 'CLOSED' as any, endedAt: new Date() },
    });
  }
}
