import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class MasterTagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; slug: string; color?: string }) {
    return this.prisma.masterTag.create({ data });
  }

  async findById(id: string) {
    return this.prisma.masterTag.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
  }

  async findAll() {
    return this.prisma.masterTag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { documents: true } } },
    });
  }

  async update(id: string, data: Record<string, any>) {
    return this.prisma.masterTag.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.masterTag.delete({ where: { id } });
  }
}
