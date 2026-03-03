import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class MasterCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; slug: string; description?: string; parentId?: string; sortOrder?: number }) {
    return this.prisma.masterCategory.create({ data });
  }

  async findById(id: string) {
    return this.prisma.masterCategory.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
  }

  async findAll() {
    return this.prisma.masterCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { children: true, _count: { select: { documents: true } } },
    });
  }

  async update(id: string, data: Record<string, any>) {
    return this.prisma.masterCategory.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.masterCategory.delete({ where: { id } });
  }
}
