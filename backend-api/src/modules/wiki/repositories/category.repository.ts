import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class CategoryRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: { name: string; slug: string; description?: string; parentId?: string; sortOrder?: number }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.category.create({ data });
  }

  async findAll() {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { children: true, _count: { select: { documents: true } } },
    });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.category.findUnique({
      where: { id },
      include: { children: true, _count: { select: { documents: true } } },
    });
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.category.delete({ where: { id } });
  }
}
