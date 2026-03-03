import { Injectable } from '@nestjs/common';
import { QueryLogRepository } from '../repositories/query-log.repository';
import { ContentGapRepository } from '../repositories/content-gap.repository';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly queryLogRepo: QueryLogRepository,
    private readonly contentGapRepo: ContentGapRepository,
  ) {}

  async getDashboard(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const end = endDate || new Date();

    const [metrics, tokenUsage, queriesByDay, confidenceDistribution, recentQueries] =
      await Promise.all([
        this.queryLogRepo.getDashboardMetrics(start, end),
        this.queryLogRepo.getTokenUsageSummary(start, end),
        this.queryLogRepo.getQueriesByDay(7),
        this.queryLogRepo.getConfidenceDistribution(start, end),
        this.queryLogRepo.getRecentQueries(5),
      ]);

    return {
      ...metrics,
      tokenUsage,
      queriesByDay,
      confidenceDistribution,
      recentQueries,
    };
  }

  async getQueryLogs(page = 1, limit = 20, wasSuccessful?: boolean, startDate?: Date, endDate?: Date) {
    return this.queryLogRepo.findAll({ page, limit, wasSuccessful, startDate, endDate });
  }

  async getFailedQueries(page = 1, limit = 20) {
    return this.queryLogRepo.getFailedQueries(page, limit);
  }

  async getContentGaps(page = 1, limit = 20, status?: string) {
    return this.contentGapRepo.findAll({ page, limit, status });
  }

  async updateContentGap(id: string, data: { status?: string; resolvedDocId?: string }) {
    return this.contentGapRepo.update(id, data);
  }
}
