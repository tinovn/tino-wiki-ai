import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class MasterDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalMasterDocs,
      publishedMasterDocs,
      draftMasterDocs,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.masterDocument.count({ where: { isDeleted: false } }),
      this.prisma.masterDocument.count({ where: { status: 'PUBLISHED', isDeleted: false } }),
      this.prisma.masterDocument.count({ where: { status: 'DRAFT', isDeleted: false } }),
    ]);

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
      },
      masterDocuments: {
        total: totalMasterDocs,
        published: publishedMasterDocs,
        draft: draftMasterDocs,
      },
    };
  }
}
