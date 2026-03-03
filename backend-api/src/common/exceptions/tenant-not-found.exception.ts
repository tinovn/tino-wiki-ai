import { NotFoundException } from '@nestjs/common';

export class TenantNotFoundException extends NotFoundException {
  constructor(tenantId: string) {
    super(`Tenant with ID "${tenantId}" not found`);
  }
}
