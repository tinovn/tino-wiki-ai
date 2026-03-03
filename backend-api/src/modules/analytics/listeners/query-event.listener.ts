import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueryCompletedEvent } from '@core/event-bus/events/query-completed.event';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';

@Injectable()
export class QueryEventListener {
  private readonly logger = new Logger(QueryEventListener.name);

  constructor(private readonly clientManager: PrismaClientManager) {}

  @OnEvent('query.completed')
  async handleQueryCompleted(event: QueryCompletedEvent) {
    try {
      if (!event.tenantDatabaseUrl) {
        this.logger.warn('No tenantDatabaseUrl in query.completed event, skipping log');
        return;
      }

      const prisma = await this.clientManager.getClient(event.tenantDatabaseUrl);
      const queryLog = await prisma.queryLog.create({ data: event.queryLogData as any });

      // Track content gaps for low-confidence queries
      if (!event.queryLogData.wasSuccessful || (event.queryLogData.confidence && event.queryLogData.confidence < 0.5)) {
        const existing = await prisma.contentGap.findFirst({
          where: { question: event.queryLogData.question },
        });
        if (existing) {
          await prisma.contentGap.update({
            where: { id: existing.id },
            data: { frequency: { increment: 1 } },
          });
        } else {
          await prisma.contentGap.create({
            data: { question: event.queryLogData.question, frequency: 1 },
          });
        }
        this.logger.debug(`Content gap tracked for: "${event.queryLogData.question.substring(0, 50)}..."`);
      }

      this.logger.debug(`Query logged: ${queryLog.id}`);
    } catch (error) {
      this.logger.error('Failed to log query', error);
    }
  }
}
