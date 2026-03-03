import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MasterTenantService } from './master-tenant.service';
import { ApiResponseDto, PaginationDto } from '@common/dto';
import { MasterRoles, SuperAdminOnly } from '@common/decorators';

@ApiTags('Master - Tenants')
@ApiBearerAuth()
@Controller('master/tenants')
@SuperAdminOnly()
export class MasterTenantController {
  constructor(private readonly tenantService: MasterTenantService) {}

  @Post()
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async create(@Body() dto: any) {
    const tenant = await this.tenantService.create(dto);
    return ApiResponseDto.success(tenant);
  }

  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { data, total } = await this.tenantService.findAll(query.page!, query.limit!);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const tenant = await this.tenantService.findById(id);
    return ApiResponseDto.success(tenant);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    const stats = await this.tenantService.getStats(id);
    return ApiResponseDto.success(stats);
  }

  @Patch(':id')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async update(@Param('id') id: string, @Body() dto: any) {
    const tenant = await this.tenantService.update(id, dto);
    return ApiResponseDto.success(tenant);
  }

  @Post(':id/suspend')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async suspend(@Param('id') id: string) {
    const tenant = await this.tenantService.suspend(id);
    return ApiResponseDto.success(tenant);
  }

  @Post(':id/activate')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async activate(@Param('id') id: string) {
    const tenant = await this.tenantService.activate(id);
    return ApiResponseDto.success(tenant);
  }

  @Delete(':id')
  @MasterRoles('SUPER_OWNER')
  async delete(@Param('id') id: string) {
    const result = await this.tenantService.delete(id);
    return ApiResponseDto.success(result);
  }
}
