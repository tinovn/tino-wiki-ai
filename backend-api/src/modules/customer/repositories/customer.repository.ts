import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class CustomerRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: { externalId?: string; name?: string; email?: string; phone?: string; metadata?: any }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customer.create({ data: data as any });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customer.findUnique({
      where: { id },
      include: { memories: true },
    });
  }

  async findByExternalId(externalId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customer.findUnique({ where: { externalId } });
  }

  async findAll(page: number, limit: number) {
    const prisma = await this.tenantPrisma.getClient();
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { memories: true, conversations: true } } },
      }),
      prisma.customer.count(),
    ]);
    return { data, total };
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customer.update({ where: { id }, data });
  }

  async delete(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.customer.delete({ where: { id } });
  }
}
