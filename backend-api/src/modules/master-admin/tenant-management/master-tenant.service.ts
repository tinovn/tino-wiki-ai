import { Injectable, Logger } from '@nestjs/common';
import { TenantService } from '@modules/tenant/tenant.service';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class MasterTenantService {
  private readonly logger = new Logger(MasterTenantService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(page: number, limit: number) {
    return this.tenantService.findAll(page, limit);
  }

  async findById(id: string) {
    return this.tenantService.findById(id);
  }

  async create(dto: any) {
    return this.tenantService.create(dto);
  }

  async update(id: string, dto: any) {
    return this.tenantService.update(id, dto);
  }

  async suspend(id: string) {
    return this.tenantService.suspend(id);
  }

  async activate(id: string) {
    return this.tenantService.activate(id);
  }

  async delete(id: string) {
    return this.tenantService.delete(id);
  }

  async getStats(id: string) {
    const tenant = await this.tenantService.findById(id);
    const adminCount = await this.prisma.tenantAdmin.count({
      where: { tenantId: id },
    });
    const apiKeyCount = await this.prisma.apiKey.count({
      where: { tenantId: id },
    });
    return {
      tenant,
      stats: {
        adminCount,
        apiKeyCount,
      },
    };
  }

  async getOverview() {
    const [total, active, suspended, pendingSetup] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.tenant.count({ where: { status: 'PENDING_SETUP' } }),
    ]);
    return { total, active, suspended, pendingSetup };
  }
}
