interface JwtPayloadBase {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface SuperAdminJwtPayload extends JwtPayloadBase {
  scope: 'superadmin';
  role: string;
}

export interface TenantJwtPayload extends JwtPayloadBase {
  scope: 'tenant';
  role: string;
  tenantId: string;
}

export type JwtPayload = SuperAdminJwtPayload | TenantJwtPayload;
