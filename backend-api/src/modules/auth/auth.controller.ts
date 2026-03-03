import { Controller, Post, Body, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '@common/decorators';
import { ApiResponseDto } from '@common/dto';
import { TenantService } from '../tenant/tenant.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantService: TenantService,
  ) {}

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    // Validate tenant exists and is active (since @Public() skips TenantGuard)
    const tenant = await this.tenantService.resolveFromHeader(tenantId);
    if (!tenant) {
      throw new ForbiddenException('Tenant not found or inactive');
    }

    // Attach tenant to request for downstream services
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      status: tenant.status,
    };

    const result = await this.authService.login(dto, tenantId);
    return ApiResponseDto.success(result);
  }

  @Post('register')
  @Public()
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    // Validate tenant exists and is active (since @Public() skips TenantGuard)
    const tenant = await this.tenantService.resolveFromHeader(tenantId);
    if (!tenant) {
      throw new ForbiddenException('Tenant not found or inactive');
    }

    // Attach tenant to request for downstream services
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      status: tenant.status,
    };

    const result = await this.authService.register(dto, tenantId);
    return ApiResponseDto.success(result);
  }
}
