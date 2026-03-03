import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class CannedResponsesRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll() {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.cannedResponse.findMany({
      orderBy: { shortCode: 'asc' },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async findByShortCode(shortCode: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.cannedResponse.findUnique({ where: { shortCode } });
  }

  async create(data: { shortCode: string; title: string; content: string; createdBy: string }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.cannedResponse.create({
      data,
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async update(id: string, data: { title?: string; content?: string }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.cannedResponse.update({
      where: { id },
      data,
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async delete(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.cannedResponse.delete({ where: { id } });
  }
}
