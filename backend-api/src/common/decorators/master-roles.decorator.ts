import { SetMetadata } from '@nestjs/common';

export const MASTER_ROLES_KEY = 'masterRoles';
export const MasterRoles = (...roles: string[]) => SetMetadata(MASTER_ROLES_KEY, roles);
