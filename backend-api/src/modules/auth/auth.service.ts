import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, tenantId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const user = await prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId,
      scope: 'tenant',
    });
  }

  async register(dto: RegisterDto, tenantId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // SECURITY: Always create AGENT role via registration.
    // First ADMIN is created via tenant provisioning flow only.
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        displayName: dto.displayName,
        role: 'AGENT' as any,
      },
    });

    return this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId,
      scope: 'tenant',
    });
  }

  private generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessExpiration'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.refreshExpiration'),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('jwt.accessExpiration'),
    };
  }
}
