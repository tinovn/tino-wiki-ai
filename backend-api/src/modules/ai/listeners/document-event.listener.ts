import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '@common/constants';
import { DocumentPublishedEvent } from '@core/event-bus/events/document-published.event';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class DocumentEventListener {
  private readonly logger = new Logger(DocumentEventListener.name);

  constructor(
    @InjectQueue(QUEUES.AI_PIPELINE) private readonly aiQueue: Queue,
    private readonly prismaClientManager: PrismaClientManager,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('document.published')
  async handleDocumentPublished(event: DocumentPublishedEvent) {
    this.logger.log(`Document published event: ${event.documentId} v${event.version}`);

    const prisma = await this.prismaClientManager.getClient(event.tenantDatabaseUrl);

    // Create processing job record
    const job = await prisma.aiProcessingJob.create({
      data: {
        documentId: event.documentId,
        version: event.version,
        status: 'PENDING' as any,
      },
    });

    // Look up actual tenant slug from master DB
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: event.tenantId },
      select: { slug: true },
    });
    const tenantSlug = tenant?.slug || event.tenantId.replace(/-/g, '_').substring(0, 20);

    // Enqueue the processing job
    await this.aiQueue.add(JOBS.PROCESS_DOCUMENT, {
      tenantId: event.tenantId,
      tenantDatabaseUrl: event.tenantDatabaseUrl,
      tenantSlug,
      documentId: event.documentId,
      version: event.version,
      processingJobId: job.id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(`Enqueued AI pipeline job for document ${event.documentId}`);
  }
}
