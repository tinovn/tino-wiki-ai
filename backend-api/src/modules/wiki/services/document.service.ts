import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentRepository } from '../repositories/document.repository';
import { VersionRepository } from '../repositories/version.repository';
import { DocumentNotFoundException } from '@common/exceptions';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { DocumentQueryDto } from '../dto/document-query.dto';
import { DocumentPublishedEvent } from '@core/event-bus/events/document-published.event';
import { VectorStoreService } from '@modules/vector-store/vector-store.service';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { QUEUES, JOBS } from '@common/constants';
import { generateSlug } from '@common/utils';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly versionRepo: VersionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly vectorStore: VectorStoreService,
    private readonly prisma: PrismaService,
    private readonly clientManager: PrismaClientManager,
    @InjectQueue(QUEUES.AI_PIPELINE) private readonly aiQueue: Queue,
  ) {}

  async create(dto: CreateDocumentDto, authorId: string) {
    const slug = generateSlug(dto.title);
    const wordCount = dto.content.split(/\s+/).length;

    const document = await this.documentRepo.create({
      title: dto.title,
      slug,
      content: dto.content,
      excerpt: dto.excerpt,
      authorId,
      categoryId: dto.categoryId,
      wordCount,
    });

    // Create initial version
    await this.versionRepo.create({
      documentId: document.id,
      version: 1,
      title: dto.title,
      content: dto.content,
      createdById: authorId,
    });

    if (dto.tagIds?.length) {
      await this.documentRepo.setTags(document.id, dto.tagIds);
    }

    return this.documentRepo.findById(document.id);
  }

  async findById(id: string) {
    const document = await this.documentRepo.findById(id);
    if (!document) throw new DocumentNotFoundException(id);
    return document;
  }

  async findAll(query: DocumentQueryDto) {
    return this.documentRepo.findAll({
      page: query.page || 1,
      limit: query.limit || 20,
      status: query.status,
      categoryId: query.categoryId,
      tagId: query.tagId,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async update(id: string, dto: UpdateDocumentDto, userId: string) {
    const document = await this.findById(id);
    const newVersion = document.currentVersion + 1;
    const wordCount = dto.content ? dto.content.split(/\s+/).length : undefined;

    // Create version snapshot
    await this.versionRepo.create({
      documentId: id,
      version: newVersion,
      title: dto.title || document.title,
      content: dto.content || document.content,
      changeNote: dto.changeNote,
      createdById: userId,
    });

    const updateData: any = { currentVersion: newVersion };
    if (dto.title) updateData.title = dto.title;
    if (dto.content) updateData.content = dto.content;
    if (dto.excerpt !== undefined) updateData.excerpt = dto.excerpt;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (wordCount) updateData.wordCount = wordCount;

    const updated = await this.documentRepo.update(id, updateData);

    if (dto.tagIds) {
      await this.documentRepo.setTags(id, dto.tagIds);
    }

    return this.documentRepo.findById(id);
  }

  async publish(id: string, tenantId: string, tenantDatabaseUrl: string) {
    const document = await this.findById(id);

    await this.documentRepo.update(id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    this.eventEmitter.emit(
      'document.published',
      new DocumentPublishedEvent(tenantId, tenantDatabaseUrl, id, document.currentVersion),
    );

    this.logger.log(`Document published: ${document.title} (v${document.currentVersion})`);
    return this.documentRepo.findById(id);
  }

  async unpublish(id: string, tenantSlug?: string) {
    await this.findById(id);
    await this.documentRepo.update(id, { status: 'DRAFT', publishedAt: null });

    // Xóa vector khỏi Qdrant khi unpublish
    if (tenantSlug) {
      try {
        await this.vectorStore.deleteByDocumentId(tenantSlug, id);
        this.logger.log(`Deleted vectors for unpublished document: ${id}`);
      } catch (error) {
        this.logger.warn(`Failed to delete vectors for document ${id}: ${error}`);
      }
    }

    return this.documentRepo.findById(id);
  }

  async softDelete(id: string, tenantSlug?: string) {
    await this.findById(id);

    // Xóa vector khỏi Qdrant khi xóa document
    if (tenantSlug) {
      try {
        await this.vectorStore.deleteByDocumentId(tenantSlug, id);
        this.logger.log(`Deleted vectors for deleted document: ${id}`);
      } catch (error) {
        this.logger.warn(`Failed to delete vectors for document ${id}: ${error}`);
      }
    }

    return this.documentRepo.softDelete(id);
  }

  async getVersions(documentId: string) {
    await this.findById(documentId);
    return this.versionRepo.findByDocumentId(documentId);
  }

  async getVersion(documentId: string, version: number) {
    const v = await this.versionRepo.findByVersion(documentId, version);
    if (!v) throw new DocumentNotFoundException(`${documentId} version ${version}`);
    return v;
  }

  async rollback(documentId: string, version: number, userId: string) {
    const targetVersion = await this.getVersion(documentId, version);
    return this.update(
      documentId,
      {
        title: targetVersion.title,
        content: targetVersion.content,
        changeNote: `Rollback to version ${version}`,
      },
      userId,
    );
  }

  /**
   * Re-process all published documents that haven't been successfully embedded.
   * With force=true, reprocess ALL published documents (even completed ones).
   */
  async reprocessAll(
    tenantId: string,
    tenantDatabaseUrl: string,
    force = false,
  ): Promise<{ enqueued: number; skipped: number; total: number }> {
    const db = await this.clientManager.getClient(tenantDatabaseUrl);

    // Get all published documents
    const documents = await db.document.findMany({
      where: { status: 'PUBLISHED', isDeleted: false },
      select: { id: true, currentVersion: true },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    const tenantSlug = tenant?.slug || 'default';

    let enqueued = 0;
    let skipped = 0;

    for (const doc of documents) {
      if (!force) {
        // Check if there's already a COMPLETED job for this version
        const completedJob = await db.aiProcessingJob.findFirst({
          where: {
            documentId: doc.id,
            version: doc.currentVersion,
            status: 'COMPLETED' as any,
          },
        });
        if (completedJob) {
          skipped++;
          continue;
        }
      }

      // Create processing job + enqueue
      const job = await db.aiProcessingJob.create({
        data: {
          documentId: doc.id,
          version: doc.currentVersion,
          status: 'PENDING' as any,
        },
      });

      await this.aiQueue.add(JOBS.PROCESS_DOCUMENT, {
        tenantId,
        tenantDatabaseUrl,
        tenantSlug,
        documentId: doc.id,
        version: doc.currentVersion,
        processingJobId: job.id,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      enqueued++;
    }

    this.logger.log(`Bulk reprocess: enqueued=${enqueued} skipped=${skipped} total=${documents.length}`);
    return { enqueued, skipped, total: documents.length };
  }

  /**
   * Re-process a single document (force).
   */
  async reprocessOne(
    documentId: string,
    tenantId: string,
    tenantDatabaseUrl: string,
  ): Promise<{ jobId: string }> {
    const document = await this.findById(documentId);

    const db = await this.clientManager.getClient(tenantDatabaseUrl);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    const tenantSlug = tenant?.slug || 'default';

    const job = await db.aiProcessingJob.create({
      data: {
        documentId,
        version: document.currentVersion,
        status: 'PENDING' as any,
      },
    });

    await this.aiQueue.add(JOBS.PROCESS_DOCUMENT, {
      tenantId,
      tenantDatabaseUrl,
      tenantSlug,
      documentId,
      version: document.currentVersion,
      processingJobId: job.id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(`Reprocess enqueued for document ${documentId} v${document.currentVersion}`);
    return { jobId: job.id };
  }

  /**
   * Get indexing statistics: document counts by processing status + vector store info.
   */
  async getIndexingStats(
    tenantId: string,
    tenantDatabaseUrl: string,
  ) {
    const db = await this.clientManager.getClient(tenantDatabaseUrl);

    const totalPublished = await db.document.count({
      where: { status: 'PUBLISHED', isDeleted: false },
    });

    let indexed = 0;
    let pending = 0;
    let failed = 0;

    if (totalPublished > 0) {
      const completedDocs = await db.$queryRawUnsafe<{ cnt: bigint }[]>(`
        SELECT COUNT(DISTINCT d.id) as cnt
        FROM documents d
        INNER JOIN ai_processing_jobs j ON j.document_id = d.id AND j.version = d.current_version
        WHERE d.status = 'PUBLISHED' AND d.is_deleted = false AND j.status = 'COMPLETED'
      `);
      indexed = Number(completedDocs[0]?.cnt ?? 0);

      const pendingDocs = await db.$queryRawUnsafe<{ cnt: bigint }[]>(`
        SELECT COUNT(DISTINCT d.id) as cnt
        FROM documents d
        INNER JOIN ai_processing_jobs j ON j.document_id = d.id AND j.version = d.current_version
        WHERE d.status = 'PUBLISHED' AND d.is_deleted = false
          AND j.status IN ('PENDING', 'CLEANING', 'SUMMARIZING', 'CHUNKING', 'EMBEDDING')
      `);
      pending = Number(pendingDocs[0]?.cnt ?? 0);

      const failedDocs = await db.$queryRawUnsafe<{ cnt: bigint }[]>(`
        SELECT COUNT(DISTINCT d.id) as cnt
        FROM documents d
        INNER JOIN ai_processing_jobs j ON j.document_id = d.id AND j.version = d.current_version
        WHERE d.status = 'PUBLISHED' AND d.is_deleted = false AND j.status = 'FAILED'
          AND d.id NOT IN (
            SELECT j2.document_id FROM ai_processing_jobs j2
            WHERE j2.document_id = d.id AND j2.version = d.current_version AND j2.status = 'COMPLETED'
          )
      `);
      failed = Number(failedDocs[0]?.cnt ?? 0);
    }

    const notProcessed = Math.max(0, totalPublished - indexed - pending - failed);

    // Vector count from Qdrant
    let vectorCount = 0;
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { slug: true },
      });
      if (tenant?.slug) {
        const stats = await this.vectorStore.getCollectionStats(tenant.slug);
        vectorCount = stats.pointsCount;
      }
    } catch {
      // Qdrant unavailable
    }

    // Total chunks in DB
    const chunks = await db.documentChunk.count();

    return { totalPublished, indexed, pending, failed, notProcessed, vectorCount, chunks };
  }
}
