import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class CrawlResultRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: {
    jobId: string;
    url: string;
    status: string;
    title?: string;
    contentHash?: string;
    documentId?: string;
    error?: string;
    metadata?: Record<string, any>;
  }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlResult.create({
      data: {
        jobId: data.jobId,
        url: data.url,
        status: data.status as any,
        title: data.title,
        contentHash: data.contentHash,
        documentId: data.documentId,
        error: data.error,
        metadata: data.metadata || {},
      },
    });
  }

  async findByJobId(jobId: string, page: number, limit: number) {
    const prisma = await this.tenantPrisma.getClient();
    const where = { jobId };

    const [data, total] = await Promise.all([
      prisma.crawlResult.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.crawlResult.count({ where }),
    ]);

    return { data, total };
  }

  async findByContentHash(contentHash: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlResult.findFirst({
      where: { contentHash, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUrl(url: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.crawlResult.findFirst({
      where: { url, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
