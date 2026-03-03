import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '.prisma/tenant-client';
import { PrismaClientManager } from './prisma-client.manager';

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private client: PrismaClient | null = null;

  constructor(
    @Inject(REQUEST) private readonly request: any,
    private readonly clientManager: PrismaClientManager,
  ) {}

  async getClient(): Promise<PrismaClient> {
    if (this.client) return this.client;

    const tenant = this.request.tenant;
    if (!tenant?.databaseUrl) {
      throw new Error('Tenant context not available. Ensure TenantGuard is applied.');
    }

    this.client = await this.clientManager.getClient(tenant.databaseUrl);
    return this.client;
  }
}
