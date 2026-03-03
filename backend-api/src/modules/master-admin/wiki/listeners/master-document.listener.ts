import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '@common/constants';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class MasterDocumentEventListener {
  private readonly logger = new Logger(MasterDocumentEventListener.name);

  constructor(
    @InjectQueue(QUEUES.AI_PIPELINE) private readonly aiQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('master-document.published')
  async handleMasterDocumentPublished(event: { documentId: string; version: number }) {
    this.logger.log(`Master document published: ${event.documentId} v${event.version}`);

    const job = await this.prisma.masterAiProcessingJob.create({
      data: {
        documentId: event.documentId,
        version: event.version,
        status: 'PENDING' as any,
      },
    });

    await this.aiQueue.add(JOBS.PROCESS_MASTER_DOCUMENT, {
      isMaster: true,
      documentId: event.documentId,
      version: event.version,
      processingJobId: job.id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(`Enqueued master AI pipeline job for document ${event.documentId}`);
  }
}
