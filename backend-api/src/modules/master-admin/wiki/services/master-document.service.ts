import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MasterDocumentRepository } from '../repositories/master-document.repository';
import { MasterVersionRepository } from '../repositories/master-version.repository';
import { CreateMasterDocumentDto } from '../dto/create-master-document.dto';
import { UpdateMasterDocumentDto } from '../dto/update-master-document.dto';
import { MasterDocumentQueryDto } from '../dto/master-document-query.dto';
import { VectorStoreService } from '@modules/vector-store/vector-store.service';
import { generateSlug } from '@common/utils';

@Injectable()
export class MasterDocumentService {
  private readonly logger = new Logger(MasterDocumentService.name);

  constructor(
    private readonly documentRepo: MasterDocumentRepository,
    private readonly versionRepo: MasterVersionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly vectorStore: VectorStoreService,
  ) {}

  async create(dto: CreateMasterDocumentDto, authorId: string) {
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
    if (!document) throw new NotFoundException(`Master document ${id} not found`);
    return document;
  }

  async findAll(query: MasterDocumentQueryDto) {
    return this.documentRepo.findAll({
      page: query.page || 1,
      limit: query.limit || 20,
      status: query.status,
      categoryId: query.categoryId,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async update(id: string, dto: UpdateMasterDocumentDto, userId: string) {
    const document = await this.findById(id);
    const newVersion = document.currentVersion + 1;
    const wordCount = dto.content ? dto.content.split(/\s+/).length : undefined;

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

    await this.documentRepo.update(id, updateData);

    if (dto.tagIds) {
      await this.documentRepo.setTags(id, dto.tagIds);
    }

    return this.documentRepo.findById(id);
  }

  async publish(id: string) {
    const document = await this.findById(id);

    await this.documentRepo.update(id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    this.eventEmitter.emit('master-document.published', {
      documentId: id,
      version: document.currentVersion,
    });

    this.logger.log(`Master document published: ${document.title} (v${document.currentVersion})`);
    return this.documentRepo.findById(id);
  }

  async unpublish(id: string) {
    await this.findById(id);
    await this.documentRepo.update(id, { status: 'DRAFT', publishedAt: null });

    // Xóa vector khỏi Qdrant khi unpublish
    try {
      await this.vectorStore.deleteByDocumentId('master', id);
      this.logger.log(`Deleted vectors for unpublished master document: ${id}`);
    } catch (error) {
      this.logger.warn(`Failed to delete vectors for master document ${id}: ${error}`);
    }

    return this.documentRepo.findById(id);
  }

  async softDelete(id: string) {
    await this.findById(id);

    // Xóa vector khỏi Qdrant khi xóa document
    try {
      await this.vectorStore.deleteByDocumentId('master', id);
      this.logger.log(`Deleted vectors for deleted master document: ${id}`);
    } catch (error) {
      this.logger.warn(`Failed to delete vectors for master document ${id}: ${error}`);
    }

    return this.documentRepo.softDelete(id);
  }

  async getVersions(documentId: string) {
    await this.findById(documentId);
    return this.versionRepo.findByDocumentId(documentId);
  }

  async getVersion(documentId: string, version: number) {
    const v = await this.versionRepo.findByVersion(documentId, version);
    if (!v) throw new NotFoundException(`Master document ${documentId} version ${version} not found`);
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
