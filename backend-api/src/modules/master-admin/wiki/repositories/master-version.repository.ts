import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class MasterVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    documentId: string;
    version: number;
    title: string;
    content: string;
    changeNote?: string;
    createdById: string;
  }) {
    return this.prisma.masterDocumentVersion.create({ data });
  }

  async findByDocumentId(documentId: string) {
    return this.prisma.masterDocumentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
    });
  }

  async findByVersion(documentId: string, version: number) {
    return this.prisma.masterDocumentVersion.findUnique({
      where: { documentId_version: { documentId, version } },
    });
  }
}
