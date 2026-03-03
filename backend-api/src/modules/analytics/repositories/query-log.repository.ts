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

  async getTokenUsageSummary(startDate: Date, endDate: Date) {
    const prisma = await this.tenantPrisma.getClient();
    const logs = await prisma.queryLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        tokenUsage: { not: null as any },
      },
      select: { tokenUsage: true },
    });

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    for (const log of logs) {
      const usage = log.tokenUsage as any;
      if (usage) {
        totalPromptTokens += usage.prompt || 0;
        totalCompletionTokens += usage.completion || 0;
      }
    }
    const totalTokens = totalPromptTokens + totalCompletionTokens;
    // Rough cost estimate: $0.002 per 1K tokens (adjustable)
    const estimatedCost = (totalTokens / 1000) * 0.002;

    return { totalPromptTokens, totalCompletionTokens, totalTokens, estimatedCost: Math.round(estimatedCost * 100) / 100 };
  }

  async getQueriesByDay(days = 7) {
    const prisma = await this.tenantPrisma.getClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const logs = await prisma.queryLog.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, wasSuccessful: true },
      orderBy: { createdAt: 'asc' },
    });

    const dayMap = new Map<string, { total: number; successful: number; failed: number }>();
    // Pre-fill all days
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { total: 0, successful: 0, failed: 0 });
    }

    for (const log of logs) {
      const key = log.createdAt.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        entry.total++;
        if (log.wasSuccessful) entry.successful++;
        else entry.failed++;
      }
    }

    return Array.from(dayMap.entries()).map(([date, stats]) => ({ date, ...stats }));
  }

  async getConfidenceDistribution(startDate: Date, endDate: Date) {
    const prisma = await this.tenantPrisma.getClient();
    const logs = await prisma.queryLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        confidence: { not: null },
      },
      select: { confidence: true },
    });

    const ranges = [
      { range: 'Thấp (0-30%)', min: 0, max: 0.3, count: 0, color: '#ff4d4f' },
      { range: 'TB (30-60%)', min: 0.3, max: 0.6, count: 0, color: '#faad14' },
      { range: 'Khá (60-80%)', min: 0.6, max: 0.8, count: 0, color: '#1677ff' },
      { range: 'Cao (80-100%)', min: 0.8, max: 1.01, count: 0, color: '#52c41a' },
    ];

    for (const log of logs) {
      const c = log.confidence ?? 0;
      for (const r of ranges) {
        if (c >= r.min && c < r.max) {
          r.count++;
          break;
        }
      }
    }

    return ranges.map(({ range, count, color }) => ({ range, count, color }));
  }

  async getRecentQueries(limit = 5) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.queryLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        question: true,
        confidence: true,
        wasSuccessful: true,
        latencyMs: true,
        createdAt: true,
      },
    });
  }
}
