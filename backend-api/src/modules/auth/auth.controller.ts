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
    const tenant = await this.resolveTenant(req);

    // Attach tenant to request for downstream services
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      status: tenant.status,
    };

    const result = await this.authService.login(dto, tenant.id);
    return ApiResponseDto.success(result);
  }

  @Post('register')
  @Public()
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const tenant = await this.resolveTenant(req);

    // Attach tenant to request for downstream services
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      status: tenant.status,
    };

    const result = await this.authService.register(dto, tenant.id);
    return ApiResponseDto.success(result);
  }

  /**
   * Resolve tenant from x-tenant-id header or x-tenant-slug (subdomain)
   */
  private async resolveTenant(req: any) {
    const tenantId = req.headers['x-tenant-id'];
    const tenantSlug = req.headers['x-tenant-slug'];

    let tenant: any;
    if (tenantId) {
      tenant = await this.tenantService.resolveFromHeader(tenantId);
    } else if (tenantSlug) {
      tenant = await this.tenantService.resolveFromSlug(tenantSlug);
    }

    if (!tenant) {
      throw new ForbiddenException('Tenant not found or inactive');
    }

    return tenant;
  }
}
