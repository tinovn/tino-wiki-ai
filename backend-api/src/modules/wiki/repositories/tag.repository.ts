import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class TagRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: { name: string; slug: string; color?: string }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.tag.create({ data });
  }

  async findAll() {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { documents: true } } },
    });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.tag.findUnique({ where: { id } });
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.tag.update({ where: { id }, data });
  }

  async delete(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.tag.delete({ where: { id } });
  }
}
