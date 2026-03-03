import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(data: { email: string; password: string; displayName: string; role?: string }) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        role: (data.role as any) || 'AGENT',
      },
    });
  }

  async findById(id: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.user.findUnique({ where: { email } });
  }

  async findAll(page: number, limit: number) {
    const prisma = await this.tenantPrisma.getClient();
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, displayName: true, role: true,
          isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.user.count(),
    ]);
    return { data, total };
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.user.update({ where: { id }, data });
  }
}
