import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@core/database/prisma/prisma.service';
import { MasterLoginDto } from './dto/master-login.dto';

@Injectable()
export class MasterAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: MasterLoginDto) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.superAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      scope: 'superadmin' as const,
    };

    return this.generateTokens(payload);
  }

  private generateTokens(payload: {
    sub: string;
    email: string;
    role: string;
    scope: 'superadmin';
  }) {
    const accessExpiration = this.configService.get<string>('jwt.accessExpiration');
    const refreshExpiration = this.configService.get<string>('jwt.refreshExpiration');

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessExpiration,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshExpiration,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiration,
    };
  }
}
