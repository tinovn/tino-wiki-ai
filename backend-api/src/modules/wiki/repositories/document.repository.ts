import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class DocumentRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    authorId: string;
    categoryId?: string;
    wordCount: number;
  }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.document.create({
      data: {
        ...data,
        status: 'DRAFT' as any,
      },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.document.findFirst({
      where: { id, isDeleted: false },
      include: {
        author: { select: { id: true, email: true, displayName: true } },
        category: true,
        tags: { include: { tag: true } },
        summaries: true,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
    categoryId?: string;
    tagId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const prisma = await this.tenantPrisma.getClient();
    const where: any = { isDeleted: false };

    if (params.status) where.status = params.status;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.tagId) where.tags = { some: { tagId: params.tagId } };
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { content: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.document.findMany({
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
      prisma.document.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.document.update({
      where: { id },
      data,
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async softDelete(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.document.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async setTags(documentId: string, tagIds: string[]) {
    const prisma = await this.tenantPrisma.getClient();
    await prisma.documentTag.deleteMany({ where: { documentId } });
    if (tagIds.length > 0) {
      await prisma.documentTag.createMany({
        data: tagIds.map((tagId) => ({ documentId, tagId })),
      });
    }
  }
}
