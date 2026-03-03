import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PaginationDto, ApiResponseDto } from '@common/dto';
import { SuperAdminOnly } from '@common/decorators';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@SuperAdminOnly()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  async create(@Body() dto: CreateTenantDto) {
    const tenant = await this.tenantService.create(dto);
    return ApiResponseDto.success(tenant);
  }

  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { data, total } = await this.tenantService.findAll(query.page, query.limit);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const tenant = await this.tenantService.findById(id);
    return ApiResponseDto.success(tenant);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    const tenant = await this.tenantService.update(id, dto);
    return ApiResponseDto.success(tenant);
  }

  @Post(':id/suspend')
  async suspend(@Param('id') id: string) {
    const tenant = await this.tenantService.suspend(id);
    return ApiResponseDto.success(tenant);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    const tenant = await this.tenantService.activate(id);
    return ApiResponseDto.success(tenant);
  }
}
