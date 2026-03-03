import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    slug: string;
    domain?: string;
    databaseUrl: string;
    databaseName: string;
  }) {
    return this.prisma.tenant.create({ data });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  async findByDomain(domain: string) {
    return this.prisma.tenant.findUnique({ where: { domain } });
  }

  async findAll(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);
    return { data, total };
  }

  async update(id: string, data: Record<string, any>) {
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async createAdmin(data: {
    tenantId: string;
    email: string;
    password: string;
    role?: string;
  }) {
    return this.prisma.tenantAdmin.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        password: data.password,
        role: (data.role as any) || 'OWNER',
      },
    });
  }

  async delete(id: string) {
    return this.prisma.tenant.delete({ where: { id } });
  }

  async findAdminByEmail(tenantId: string, email: string) {
    return this.prisma.tenantAdmin.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
  }
}
