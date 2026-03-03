import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class CustomerMemoryRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async upsert(data: {
    customerId: string;
    type: string;
    key: string;
    value: string;
    source: string;
    confidence?: number;
  }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customerMemory.upsert({
      where: {
        customerId_type_key: {
          customerId: data.customerId,
          type: data.type as any,
          key: data.key,
        },
      },
      create: data as any,
      update: { value: data.value, confidence: data.confidence, source: data.source as any },
    });
  }

  async findByCustomerId(customerId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customerMemory.findMany({
      where: { customerId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customerMemory.findUnique({ where: { id } });
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customerMemory.update({ where: { id }, data });
  }

  async delete(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customerMemory.delete({ where: { id } });
  }
}
