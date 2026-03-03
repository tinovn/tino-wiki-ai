import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { MASTER_ROLES_KEY } from '../decorators/master-roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No user found');

    // Check tenant-scope @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check master-scope @MasterRoles()
    const requiredMasterRoles = this.reflector.getAllAndOverride<string[]>(MASTER_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If neither @Roles() nor @MasterRoles() is set, allow all authenticated users
    if (!requiredRoles && !requiredMasterRoles) return true;

    // For @MasterRoles(): user must be superadmin scope with matching role
    if (requiredMasterRoles) {
      if (user.scope !== 'superadmin') {
        throw new ForbiddenException('Master admin access required');
      }
      const hasMasterRole = requiredMasterRoles.some((role: string) => user.role === role);
      if (!hasMasterRole) throw new ForbiddenException('Insufficient master admin permissions');
      return true;
    }

    // For @Roles(): superadmin bypasses tenant role checks
    if (requiredRoles) {
      if (user.scope === 'superadmin') return true;
      const hasRole = requiredRoles.some((role: string) => user.role === role);
      if (!hasRole) throw new ForbiddenException('Insufficient permissions');
      return true;
    }

    return true;
  }
}
