import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { VectorStoreService } from '@modules/vector-store/vector-store.service';
import { LlmProviderFactory } from '@modules/llm/llm-provider.factory';
import { ContentCleanerService } from './content-cleaner.service';
import { SummarizerService } from './summarizer.service';
import { IntentDetectorService } from './intent-detector.service';
import { ChunkerService } from './chunker.service';
import { PipelineContext } from '../interfaces/pipeline-context.interface';

export interface MasterPipelineContext {
  documentId: string;
  version: number;
  processingJobId: string;
  rawContent: string;
}

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    private readonly prismaClientManager: PrismaClientManager,
    private readonly prisma: PrismaService,
    private readonly vectorStore: VectorStoreService,
    private readonly llmFactory: LlmProviderFactory,
    private readonly contentCleaner: ContentCleanerService,
    private readonly summarizer: SummarizerService,
    private readonly intentDetector: IntentDetectorService,
    private readonly chunker: ChunkerService,
  ) {}

  async processDocument(ctx: PipelineContext): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Starting pipeline for document ${ctx.documentId} v${ctx.version}`);

    const prisma = await this.prismaClientManager.getClient(ctx.tenantDatabaseUrl);

    try {
      // Step 1: Clean content
      await this.updateJobStatus(prisma, ctx.processingJobId, 'CLEANING');
      const { cleanedContent, headings } = this.contentCleaner.clean(ctx.rawContent);
      ctx.cleanedContent = cleanedContent;
      ctx.headings = headings;

      // Step 2 & 3: Summarize + Detect intents (parallel, soft-fail)
      await this.updateJobStatus(prisma, ctx.processingJobId, 'SUMMARIZING');
      const [summaryResult, intents] = await Promise.all([
        this.summarizer.generateAll(cleanedContent).catch((err) => {
          this.logger.warn(`Summarization failed (LLM unavailable?), skipping: ${err.message}`);
          return null;
        }),
        this.intentDetector.detect(cleanedContent),
      ]);

      if (summaryResult) {
        ctx.summaries = {
          short: summaryResult.short.summary,
          medium: summaryResult.medium.summary,
          keyPoints: summaryResult.keyPoints.summary,
        };
        await this.saveSummaries(prisma, ctx);
      }

      ctx.intents = intents;
      await this.saveIntents(prisma, ctx);

      // Step 4: Chunk
      await this.updateJobStatus(prisma, ctx.processingJobId, 'CHUNKING');
      const chunks = this.chunker.chunk(cleanedContent, headings);
      ctx.chunks = chunks;

      // Save chunks to DB
      await this.saveChunks(prisma, ctx);

      // Step 5: Embed + Store in Qdrant
      await this.updateJobStatus(prisma, ctx.processingJobId, 'EMBEDDING');

      // Load document classification metadata for vector payload
      const doc = await prisma.document.findUnique({
        where: { id: ctx.documentId },
        select: {
          type: true,
          audience: true,
          priority: true,
          categoryId: true,
          tags: { select: { tag: { select: { name: true } } } },
        },
      });
      if (doc) {
        ctx.documentType = doc.type || 'REFERENCE';
        ctx.audience = doc.audience || 'PUBLIC';
        ctx.priority = doc.priority ?? 5;
        ctx.categoryId = doc.categoryId || '';
        ctx.tags = (doc.tags || []).map((t: any) => t.tag.name);
      }

      // Delete old version vectors first
      await this.vectorStore.deleteByDocumentId(ctx.tenantSlug, ctx.documentId);

      // Embed chunks in batches
      const embeddingAdapter = this.llmFactory.getEmbeddingAdapter();
      const batchSize = 20;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const contents = batch.map((c) => c.content);
        const embedResult = await embeddingAdapter.embed(contents);

        const points = batch.map((chunk, idx) => ({
          vector: embedResult.embeddings[idx],
          payload: {
            tenantId: ctx.tenantId,
            documentId: ctx.documentId,
            chunkIndex: chunk.index,
            content: chunk.content,
            heading: chunk.heading,
            intents: (ctx.intents || []).map((i) => i.name),
            layer: 'tenant' as const,
            version: ctx.version,
            documentType: ctx.documentType || 'REFERENCE',
            audience: ctx.audience || 'PUBLIC',
            priority: ctx.priority ?? 5,
            categoryId: ctx.categoryId || '',
            tags: ctx.tags || [],
          },
        }));

        const vectorIds = await this.vectorStore.upsert(ctx.tenantSlug, points);

        // Update chunk records with vector IDs
        for (let j = 0; j < batch.length; j++) {
          await prisma.documentChunk.updateMany({
            where: {
              documentId: ctx.documentId,
              chunkIndex: batch[j].index,
              version: ctx.version,
            },
            data: { vectorId: vectorIds[j] },
          });
        }
      }

      // Mark complete
      await this.updateJobStatus(prisma, ctx.processingJobId, 'COMPLETED');
      const elapsed = Date.now() - startTime;
      this.logger.log(`Pipeline completed for document ${ctx.documentId} in ${elapsed}ms`);

    } catch (error) {
      this.logger.error(`Pipeline failed for document ${ctx.documentId}`, error);
      await prisma.aiProcessingJob.update({
        where: { id: ctx.processingJobId },
        data: {
          status: 'FAILED' as any,
          error: (error as Error).message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async updateJobStatus(prisma: any, jobId: string, status: string) {
    const data: any = { status };
    if (status === 'CLEANING') data.startedAt = new Date();
    if (status === 'COMPLETED' || status === 'FAILED') data.completedAt = new Date();

    await prisma.aiProcessingJob.update({
      where: { id: jobId },
      data,
    });
  }

  private async saveSummaries(prisma: any, ctx: PipelineContext) {
    // Delete existing summaries for this version
    await prisma.documentSummary.deleteMany({
      where: { documentId: ctx.documentId, version: ctx.version },
    });

    const summaryEntries = [
      { type: 'SHORT', content: ctx.summaries?.short || '' },
      { type: 'MEDIUM', content: ctx.summaries?.medium || '' },
      { type: 'KEY_POINTS', content: ctx.summaries?.keyPoints || '' },
    ];

    await prisma.documentSummary.createMany({
      data: summaryEntries.map((s) => ({
        documentId: ctx.documentId,
        type: s.type,
        content: s.content,
        version: ctx.version,
      })),
    });
  }

  private async saveIntents(prisma: any, ctx: PipelineContext) {
    await prisma.documentIntent.deleteMany({
      where: { documentId: ctx.documentId, version: ctx.version },
    });

    if (ctx.intents?.length) {
      await prisma.documentIntent.createMany({
        data: ctx.intents.map((i) => ({
          documentId: ctx.documentId,
          intent: i.name,
          confidence: i.confidence,
          version: ctx.version,
        })),
      });
    }
  }

  private async saveChunks(prisma: any, ctx: PipelineContext) {
    await prisma.documentChunk.deleteMany({
      where: { documentId: ctx.documentId, version: ctx.version },
    });

    if (ctx.chunks?.length) {
      await prisma.documentChunk.createMany({
        data: ctx.chunks.map((c) => ({
          documentId: ctx.documentId,
          chunkIndex: c.index,
          content: c.content,
          heading: c.heading,
          tokenCount: c.tokenCount,
          version: ctx.version,
        })),
      });
    }
  }

  // ─── Master Document Pipeline (clean → chunk → embed) ───────

  async processMasterDocument(ctx: MasterPipelineContext): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Starting master pipeline for document ${ctx.documentId} v${ctx.version}`);

    try {
      // Step 1: Clean content
      await this.updateMasterJobStatus(ctx.processingJobId, 'CLEANING');
      const { cleanedContent, headings } = this.contentCleaner.clean(ctx.rawContent);

      // Step 2: Chunk
      await this.updateMasterJobStatus(ctx.processingJobId, 'CHUNKING');
      const chunks = this.chunker.chunk(cleanedContent, headings);

      // Save chunks to master DB
      await this.prisma.masterDocumentChunk.deleteMany({
        where: { documentId: ctx.documentId, version: ctx.version },
      });

      if (chunks.length) {
        await this.prisma.masterDocumentChunk.createMany({
          data: chunks.map((c) => ({
            documentId: ctx.documentId,
            chunkIndex: c.index,
            content: c.content,
            heading: c.heading,
            tokenCount: c.tokenCount,
            version: ctx.version,
          })),
        });
      }

      // Step 3: Embed + Store in Qdrant (master collection)
      await this.updateMasterJobStatus(ctx.processingJobId, 'EMBEDDING');

      await this.vectorStore.deleteByDocumentId('master', ctx.documentId);

      const embeddingAdapter = this.llmFactory.getEmbeddingAdapter();
      const batchSize = 20;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const contents = batch.map((c) => c.content);
        const embedResult = await embeddingAdapter.embed(contents);

        const points = batch.map((chunk, idx) => ({
          vector: embedResult.embeddings[idx],
          payload: {
            tenantId: 'master',
            documentId: ctx.documentId,
            chunkIndex: chunk.index,
            content: chunk.content,
            heading: chunk.heading,
            intents: [],
            layer: 'master' as const,
            version: ctx.version,
          },
        }));

        const vectorIds = await this.vectorStore.upsert('master', points);

        for (let j = 0; j < batch.length; j++) {
          await this.prisma.masterDocumentChunk.updateMany({
            where: {
              documentId: ctx.documentId,
              chunkIndex: batch[j].index,
              version: ctx.version,
            },
            data: { vectorId: vectorIds[j] },
          });
        }
      }

      await this.updateMasterJobStatus(ctx.processingJobId, 'COMPLETED');
      const elapsed = Date.now() - startTime;
      this.logger.log(`Master pipeline completed for document ${ctx.documentId} in ${elapsed}ms`);

    } catch (error) {
      this.logger.error(`Master pipeline failed for document ${ctx.documentId}`, error);
      await this.prisma.masterAiProcessingJob.update({
        where: { id: ctx.processingJobId },
        data: {
          status: 'FAILED' as any,
          error: (error as Error).message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async updateMasterJobStatus(jobId: string, status: string) {
    const data: any = { status };
    if (status === 'CLEANING') data.startedAt = new Date();
    if (status === 'COMPLETED' || status === 'FAILED') data.completedAt = new Date();

    await this.prisma.masterAiProcessingJob.update({
      where: { id: jobId },
      data,
    });
  }
}
