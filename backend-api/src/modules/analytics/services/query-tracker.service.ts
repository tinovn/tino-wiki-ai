import { Injectable, Logger } from '@nestjs/common';
import { QueryLogRepository } from '../repositories/query-log.repository';
import { ContentGapRepository } from '../repositories/content-gap.repository';

@Injectable()
export class QueryTrackerService {
  private readonly logger = new Logger(QueryTrackerService.name);

  constructor(
    private readonly queryLogRepo: QueryLogRepository,
    private readonly contentGapRepo: ContentGapRepository,
  ) {}

  async logQuery(data: {
    question: string;
    answer?: string;
    customerId?: string;
    userId?: string;
    sourceDocIds: string[];
    searchLayers: string[];
    confidence?: number;
    latencyMs: number;
    tokenUsage?: { prompt: number; completion: number; total: number };
    wasSuccessful: boolean;
    failureReason?: string;
  }) {
    const queryLog = await this.queryLogRepo.create(data);

    // Track content gaps for failed queries
    if (!data.wasSuccessful || (data.confidence && data.confidence < 0.5)) {
      await this.contentGapRepo.upsertGap(data.question);
      this.logger.debug(`Content gap tracked for: "${data.question.substring(0, 50)}..."`);
    }

    return queryLog;
  }
}
