import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class CrawlSourceRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: {
    name: string;
    type: string;
    url: string;
    config?: Record<string, any>;
    categoryId?: string;
    tagIds?: string[];
    schedule?: string;
    createdById: string;
  }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlSource.create({
      data: {
        name: data.name,
        type: data.type as any,
        url: data.url,
        config: data.config || {},
        categoryId: data.categoryId,
        tagIds: data.tagIds || [],
        schedule: data.schedule,
        createdById: data.createdById,
      },
      include: { category: true, _count: { select: { jobs: true } } },
    });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlSource.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, displayName: true } },
        _count: { select: { jobs: true } },
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    type?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const prisma = await this.tenantPrisma.getClient();
    const where: any = {};

    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { url: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.crawlSource.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' },
        include: {
          category: true,
          createdBy: { select: { id: true, displayName: true } },
          _count: { select: { jobs: true } },
        },
      }),
      prisma.crawlSource.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlSource.update({
      where: { id },
      data,
      include: { category: true, _count: { select: { jobs: true } } },
    });
  }

  async delete(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlSource.delete({ where: { id } });
  }

  async findActiveWithSchedule() {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlSource.findMany({
      where: { status: 'ACTIVE', schedule: { not: null } },
    });
  }
}
