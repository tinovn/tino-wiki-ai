import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class VersionRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: {
    documentId: string;
    version: number;
    title: string;
    content: string;
    changeNote?: string;
    createdById: string;
  }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.documentVersion.create({ data });
  }

  async findByDocumentId(documentId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
    });
  }

  async findByVersion(documentId: string, version: number) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.documentVersion.findUnique({
      where: { documentId_version: { documentId, version } },
    });
  }
}
