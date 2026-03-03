import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class QueryLogRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: {
    question: string;
    answer?: string;
    customerId?: string;
    userId?: string;
    sourceDocIds: string[];
    searchLayers: string[];
    confidence?: number;
    latencyMs?: number;
    tokenUsage?: any;
    wasSuccessful: boolean;
    failureReason?: string;
  }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.queryLog.create({ data: data as any });
  }

  async findAll(params: {
    page: number;
    limit: number;
    wasSuccessful?: boolean;
    startDate?: Date;
    endDate?: Date;
  }) {
    const prisma = await this.tenantPrisma.getClient();
    const where: any = {};

    if (params.wasSuccessful !== undefined) where.wasSuccessful = params.wasSuccessful;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [data, total] = await Promise.all([
      prisma.queryLog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          feedbacks: { select: { id: true, type: true } },
        },
      }),
      prisma.queryLog.count({ where }),
    ]);

    return { data, total };
  }

  async getFailedQueries(page: number, limit: number) {
    const prisma = await this.tenantPrisma.getClient();
    const where = { wasSuccessful: false };
    const [data, total] = await Promise.all([
      prisma.queryLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.queryLog.count({ where }),
    ]);
    return { data, total };
  }

  async getDashboardMetrics(startDate: Date, endDate: Date) {
    const prisma = await this.tenantPrisma.getClient();
    const where = { createdAt: { gte: startDate, lte: endDate } };

    const [totalQueries, successfulQueries, avgLatency] = await Promise.all([
      prisma.queryLog.count({ where }),
      prisma.queryLog.count({ where: { ...where, wasSuccessful: true } }),
      prisma.queryLog.aggregate({ where, _avg: { latencyMs: true } }),
    ]);

    return {
      totalQueries,
      successfulQueries,
      failedQueries: totalQueries - successfulQueries,
      successRate: totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0,
      avgLatencyMs: Math.round(avgLatency._avg.latencyMs || 0),
    };
  }
}
