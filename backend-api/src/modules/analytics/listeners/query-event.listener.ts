import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueryCompletedEvent } from '@core/event-bus/events/query-completed.event';
import { QueryTrackerService } from '../services/query-tracker.service';

@Injectable()
export class QueryEventListener {
  private readonly logger = new Logger(QueryEventListener.name);

  constructor(private readonly queryTracker: QueryTrackerService) {}

  @OnEvent('query.completed')
  async handleQueryCompleted(event: QueryCompletedEvent) {
    try {
      await this.queryTracker.logQuery(event.queryLogData);
    } catch (error) {
      this.logger.error('Failed to log query', error);
    }
  }
}
