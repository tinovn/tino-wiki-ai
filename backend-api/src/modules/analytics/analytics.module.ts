import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { QueryTrackerService } from './services/query-tracker.service';
import { QueryLogRepository } from './repositories/query-log.repository';
import { ContentGapRepository } from './repositories/content-gap.repository';
import { QueryEventListener } from './listeners/query-event.listener';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    QueryTrackerService,
    QueryLogRepository,
    ContentGapRepository,
    QueryEventListener,
  ],
  exports: [AnalyticsService, QueryTrackerService],
})
export class AnalyticsModule {}
