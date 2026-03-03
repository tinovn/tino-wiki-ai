import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentRepository } from '../repositories/document.repository';
import { VersionRepository } from '../repositories/version.repository';
import { DocumentNotFoundException } from '@common/exceptions';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { DocumentQueryDto } from '../dto/document-query.dto';
import { DocumentPublishedEvent } from '@core/event-bus/events/document-published.event';
import { generateSlug } from '@common/utils';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly versionRepo: VersionRepository,
    private readonly eventEmitter: EventEmitter2,
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

  async unpublish(id: string) {
    await this.findById(id);
    await this.documentRepo.update(id, { status: 'DRAFT', publishedAt: null });
    return this.documentRepo.findById(id);
  }

  async softDelete(id: string) {
    await this.findById(id);
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
}
