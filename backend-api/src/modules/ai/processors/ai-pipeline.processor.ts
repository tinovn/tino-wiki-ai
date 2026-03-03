import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, JOBS } from '@common/constants';
import { AiOrchestratorService } from '../services/ai-orchestrator.service';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Processor(QUEUES.AI_PIPELINE)
export class AiPipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(AiPipelineProcessor.name);

  constructor(
    private readonly orchestrator: AiOrchestratorService,
    private readonly prismaClientManager: PrismaClientManager,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOBS.PROCESS_MASTER_DOCUMENT) {
      return this.processMasterDocument(job);
    }

    const { tenantId, tenantDatabaseUrl, tenantSlug, documentId, version, processingJobId } = job.data;
    this.logger.log(`Processing document ${documentId} v${version} for tenant ${tenantId}`);

    const prisma = await this.prismaClientManager.getClient(tenantDatabaseUrl);
    const document = await prisma.document.findUnique({ where: { id: documentId } });

    if (!document) {
      this.logger.warn(`Document ${documentId} not found, skipping`);
      return;
    }

    await this.orchestrator.processDocument({
      tenantId,
      tenantDatabaseUrl,
      tenantSlug,
      documentId,
      version,
      processingJobId,
      rawContent: document.content,
    });
  }

  private async processMasterDocument(job: Job): Promise<void> {
    const { documentId, version, processingJobId } = job.data;
    this.logger.log(`Processing master document ${documentId} v${version}`);

    const document = await this.prisma.masterDocument.findUnique({ where: { id: documentId } });

    if (!document) {
      this.logger.warn(`Master document ${documentId} not found, skipping`);
      return;
    }

    await this.orchestrator.processMasterDocument({
      documentId,
      version,
      processingJobId,
      rawContent: document.content,
    });
  }
}
