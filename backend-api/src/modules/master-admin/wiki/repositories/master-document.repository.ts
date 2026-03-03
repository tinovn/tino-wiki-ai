import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class MasterDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    authorId: string;
    categoryId?: string;
    wordCount: number;
  }) {
    return this.prisma.masterDocument.create({
      data: {
        ...data,
        status: 'DRAFT' as any,
      },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async findById(id: string) {
    return this.prisma.masterDocument.findFirst({
      where: { id, isDeleted: false },
      include: {
        author: { select: { id: true, email: true, displayName: true } },
        category: true,
        tags: { include: { tag: true } },
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
    categoryId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: any = { isDeleted: false };

    if (params.status) where.status = params.status;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { content: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.masterDocument.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' },
        include: {
          author: { select: { id: true, displayName: true } },
          category: true,
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.masterDocument.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Record<string, any>) {
    return this.prisma.masterDocument.update({
      where: { id },
      data,
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async softDelete(id: string) {
    return this.prisma.masterDocument.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async setTags(documentId: string, tagIds: string[]) {
    await this.prisma.masterDocumentTag.deleteMany({ where: { documentId } });
    if (tagIds.length > 0) {
      await this.prisma.masterDocumentTag.createMany({
        data: tagIds.map((tagId) => ({ documentId, tagId })),
      });
    }
  }
}
