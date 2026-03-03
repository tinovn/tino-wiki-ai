import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class CrawlJobRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(sourceId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlJob.create({
      data: { sourceId },
    });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlJob.findUnique({
      where: { id },
      include: {
        source: { select: { id: true, name: true, type: true, url: true } },
        _count: { select: { results: true } },
      },
    });
  }

  async findBySourceId(sourceId: string, page: number, limit: number) {
    const prisma = await this.tenantPrisma.getClient();
    const where = { sourceId };

    const [data, total] = await Promise.all([
      prisma.crawlJob.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { results: true } } },
      }),
      prisma.crawlJob.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlJob.update({ where: { id }, data });
  }
}
