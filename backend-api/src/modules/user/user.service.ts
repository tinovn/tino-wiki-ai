import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 40,
  EDITOR: 30,
  AGENT: 20,
  VIEWER: 10,
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepo: UserRepository) {}

  async create(dto: CreateUserDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    // New users created by admin always get AGENT role
    return this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName,
      role: 'AGENT',
    });
  }

  async findById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException(`User "${id}" not found`);
    return user;
  }

  async findAll(page = 1, limit = 20) {
    return this.userRepo.findAll(page, limit);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    return this.userRepo.update(id, dto);
  }

  async changeRole(
    targetUserId: string,
    newRole: string,
    caller: { id: string; role: string; scope: string },
  ) {
    // Users cannot change their own role
    if (caller.id === targetUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const targetUser = await this.findById(targetUserId);

    // Only superadmin can assign ADMIN role
    if (newRole === 'ADMIN' && caller.scope !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can assign ADMIN role');
    }

    // Tenant callers cannot assign role >= their own level
    if (caller.scope === 'tenant') {
      const callerLevel = ROLE_HIERARCHY[caller.role] || 0;
      const targetLevel = ROLE_HIERARCHY[newRole] || 0;
      if (targetLevel >= callerLevel) {
        throw new ForbiddenException('Cannot assign role equal to or higher than your own');
      }
    }

    this.logger.log(
      `Role change: user ${targetUserId} from ${targetUser.role} to ${newRole} by ${caller.id} (${caller.scope}/${caller.role})`,
    );

    return this.userRepo.update(targetUserId, { role: newRole });
  }

  async deactivate(id: string) {
    return this.userRepo.update(id, { isActive: false });
  }
}
