import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDocumentService } from '../services/master-document.service';
import { CreateMasterDocumentDto } from '../dto/create-master-document.dto';
import { UpdateMasterDocumentDto } from '../dto/update-master-document.dto';
import { MasterDocumentQueryDto } from '../dto/master-document-query.dto';
import { ApiResponseDto } from '@common/dto';
import { CurrentUser, MasterRoles, SuperAdminOnly } from '@common/decorators';

@ApiTags('Master Wiki - Documents')
@ApiBearerAuth()
@Controller('master/documents')
@SuperAdminOnly()
export class MasterDocumentController {
  constructor(private readonly documentService: MasterDocumentService) {}

  @Post()
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async create(@Body() dto: CreateMasterDocumentDto, @CurrentUser('id') userId: string) {
    const doc = await this.documentService.create(dto, userId);
    return ApiResponseDto.success(doc);
  }

  @Get()
  async findAll(@Query() query: MasterDocumentQueryDto) {
    const { data, total } = await this.documentService.findAll(query);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const doc = await this.documentService.findById(id);
    return ApiResponseDto.success(doc);
  }

  @Patch(':id')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMasterDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    const doc = await this.documentService.update(id, dto, userId);
    return ApiResponseDto.success(doc);
  }

  @Delete(':id')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async delete(@Param('id') id: string) {
    await this.documentService.softDelete(id);
    return ApiResponseDto.success({ deleted: true });
  }

  @Post(':id/publish')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async publish(@Param('id') id: string) {
    const doc = await this.documentService.publish(id);
    return ApiResponseDto.success(doc);
  }

  @Post(':id/unpublish')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async unpublish(@Param('id') id: string) {
    const doc = await this.documentService.unpublish(id);
    return ApiResponseDto.success(doc);
  }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    const versions = await this.documentService.getVersions(id);
    return ApiResponseDto.success(versions);
  }

  @Get(':id/versions/:version')
  async getVersion(@Param('id') id: string, @Param('version') version: number) {
    const v = await this.documentService.getVersion(id, +version);
    return ApiResponseDto.success(v);
  }

  @Post(':id/rollback')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async rollback(
    @Param('id') id: string,
    @Body('version') version: number,
    @CurrentUser('id') userId: string,
  ) {
    const doc = await this.documentService.rollback(id, version, userId);
    return ApiResponseDto.success(doc);
  }
}
