export interface TenantContext {
  id: string;
  slug: string;
  databaseUrl: string;
  llmProvider: string;
  llmConfig: Record<string, any>;
  status: string;
}

export interface SuperAdminUserContext {
  id: string;
  email: string;
  role: string;
  scope: 'superadmin';
}

export interface TenantUserContext {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  scope: 'tenant';
}

export type UserContext = SuperAdminUserContext | TenantUserContext;

export interface RequestContext {
  tenant?: TenantContext;
  user?: UserContext;
}
