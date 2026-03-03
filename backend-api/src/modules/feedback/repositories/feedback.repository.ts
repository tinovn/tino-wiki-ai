import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class FeedbackRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: {
    queryLogId: string;
    documentId?: string;
    userId: string;
    type: string;
    comment?: string;
  }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.feedback.create({ data: data as any });
  }

  async findAll(page: number, limit: number) {
    const prisma = await this.tenantPrisma.getClient();
    const [data, total] = await Promise.all([
      prisma.feedback.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          queryLog: { select: { question: true, answer: true } },
          user: { select: { id: true, displayName: true } },
          document: { select: { id: true, title: true } },
        },
      }),
      prisma.feedback.count(),
    ]);
    return { data, total };
  }

  async findByDocumentId(documentId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.feedback.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      include: {
        queryLog: { select: { question: true } },
        user: { select: { displayName: true } },
      },
    });
  }

  async getSummary() {
    const prisma = await this.tenantPrisma.getClient();
    const [results, total] = await Promise.all([
      prisma.feedback.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
      prisma.feedback.count(),
    ]);

    const scoreMap: Record<string, number> = {
      GOOD: 5,
      PARTIALLY_CORRECT: 3,
      OUTDATED: 2,
      BAD: 1,
      WRONG_SOURCE: 1,
    };

    const byType: Record<string, number> = {};
    let weightedSum = 0;
    for (const r of results) {
      byType[r.type] = r._count.type;
      weightedSum += (scoreMap[r.type] ?? 3) * r._count.type;
    }

    return {
      total,
      byType,
      averageScore: total > 0 ? Math.round((weightedSum / total) * 10) / 10 : 0,
    };
  }
}
