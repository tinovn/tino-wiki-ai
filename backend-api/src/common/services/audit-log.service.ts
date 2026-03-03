import { Injectable, Logger } from '@nestjs/common';

export interface AuditLogEntry {
  action: string;
  actor: { id: string; email?: string; scope: string; role?: string };
  target?: { type: string; id: string };
  details?: Record<string, any>;
  tenantId?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger('AuditLog');

  log(entry: AuditLogEntry) {
    this.logger.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    }));
  }

  roleChange(params: {
    actorId: string;
    actorScope: string;
    actorRole: string;
    targetUserId: string;
    oldRole: string;
    newRole: string;
    tenantId?: string;
  }) {
    this.log({
      action: 'ROLE_CHANGE',
      actor: { id: params.actorId, scope: params.actorScope, role: params.actorRole },
      target: { type: 'user', id: params.targetUserId },
      details: { oldRole: params.oldRole, newRole: params.newRole },
      tenantId: params.tenantId,
    });
  }

  crossTenantAttempt(params: {
    userId: string;
    userTenantId: string;
    requestedTenantId: string;
  }) {
    this.log({
      action: 'CROSS_TENANT_ACCESS_ATTEMPT',
      actor: { id: params.userId, scope: 'tenant' },
      details: {
        userTenantId: params.userTenantId,
        requestedTenantId: params.requestedTenantId,
      },
    });
  }

  userCreated(params: {
    actorId: string;
    actorScope: string;
    newUserId: string;
    email: string;
    role: string;
    tenantId?: string;
  }) {
    this.log({
      action: 'USER_CREATED',
      actor: { id: params.actorId, scope: params.actorScope },
      target: { type: 'user', id: params.newUserId },
      details: { email: params.email, role: params.role },
      tenantId: params.tenantId,
    });
  }

  tenantAccess(params: {
    userId: string;
    tenantId: string;
    action: string;
  }) {
    this.log({
      action: 'TENANT_ACCESS',
      actor: { id: params.userId, scope: 'tenant' },
      target: { type: 'tenant', id: params.tenantId },
      details: { action: params.action },
    });
  }
}
