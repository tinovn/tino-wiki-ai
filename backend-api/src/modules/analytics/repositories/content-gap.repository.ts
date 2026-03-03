import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class ContentGapRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async upsertGap(question: string) {
    const prisma = await this.tenantPrisma.getClient();

    // Try to find a similar existing gap
    const existing = await prisma.contentGap.findFirst({
      where: {
        question: { contains: question.substring(0, 50), mode: 'insensitive' },
        status: 'OPEN',
      },
    });

    if (existing) {
      return prisma.contentGap.update({
        where: { id: existing.id },
        data: { frequency: { increment: 1 } },
      });
    }

    return prisma.contentGap.create({
      data: { question, frequency: 1 },
    });
  }

  async findAll(params: { page: number; limit: number; status?: string }) {
    const prisma = await this.tenantPrisma.getClient();
    const where: any = {};
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      prisma.contentGap.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { frequency: 'desc' },
      }),
      prisma.contentGap.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.contentGap.update({ where: { id }, data });
  }
}
