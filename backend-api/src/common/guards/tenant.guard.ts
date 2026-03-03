import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_SUPER_ADMIN_KEY } from '../decorators/super-admin.decorator';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip for @Public() endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Skip for @SuperAdminOnly() endpoints
    const isSuperAdmin = this.reflector.getAllAndOverride<boolean>(IS_SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isSuperAdmin) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SuperAdmin scope bypasses tenant requirement
    if (user?.scope === 'superadmin') return true;

    // Resolve tenant ID: from header, or from subdomain slug (injected by nginx as X-Tenant-Slug)
    let headerTenantId = request.headers['x-tenant-id'];
    const tenantSlug = request.headers['x-tenant-slug'] as string;

    // If no explicit tenant ID but we have a slug from subdomain, resolve it
    let tenant: any;
    if (!headerTenantId && tenantSlug) {
      tenant = await this.prisma.tenant.findFirst({
        where: { slug: tenantSlug, status: 'ACTIVE' },
      });
      if (tenant) {
        headerTenantId = tenant.id;
        // Inject resolved tenant ID into headers for downstream compatibility
        request.headers['x-tenant-id'] = tenant.id;
      }
    }

    if (!headerTenantId) {
      throw new BadRequestException('x-tenant-id header or tenant subdomain is required');
    }

    // CRITICAL: Validate JWT tenantId matches header tenantId
    if (user?.tenantId && user.tenantId !== headerTenantId) {
      this.logger.warn(
        `Cross-tenant access attempt: user ${user.id} (tenant ${user.tenantId}) tried to access tenant ${headerTenantId}`,
      );
      this.auditLog.crossTenantAttempt({
        userId: user.id,
        userTenantId: user.tenantId,
        requestedTenantId: headerTenantId,
      });
      throw new ForbiddenException('Access denied: tenant mismatch');
    }

    // Resolve tenant from master DB (skip if already resolved from slug above)
    if (!tenant) {
      tenant = await this.prisma.tenant.findUnique({
        where: { id: headerTenantId },
      });
    }

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Tenant is not active');
    }

    // Attach resolved tenant to request
    request.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      llmProvider: tenant.llmProvider,
      llmConfig: typeof tenant.llmConfig === 'string' ? JSON.parse(tenant.llmConfig) : (tenant.llmConfig || {}),
      settings: typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {}),
      status: tenant.status,
    };

    return true;
  }
}
