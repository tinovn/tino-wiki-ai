import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentService } from '../services/document.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { DocumentQueryDto } from '../dto/document-query.dto';
import { ApiResponseDto } from '@common/dto';
import { CurrentUser, Roles } from '@common/decorators';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() dto: CreateDocumentDto, @CurrentUser('id') userId: string) {
    const doc = await this.documentService.create(dto, userId);
    return ApiResponseDto.success(doc);
  }

  @Get()
  async findAll(@Query() query: DocumentQueryDto) {
    const { data, total } = await this.documentService.findAll(query);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Post('bulk/publish')
  @Roles('ADMIN', 'EDITOR')
  async bulkPublish(@Body('ids') ids: string[], @Req() req: any) {
    const results = await Promise.allSettled(
      ids.map((id) => this.documentService.publish(id, req.tenant?.id, req.tenant?.databaseUrl)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    return ApiResponseDto.success({ succeeded, failed: ids.length - succeeded, total: ids.length });
  }

  @Post('bulk/unpublish')
  @Roles('ADMIN', 'EDITOR')
  async bulkUnpublish(@Body('ids') ids: string[], @Req() req: any) {
    const results = await Promise.allSettled(
      ids.map((id) => this.documentService.unpublish(id, req.tenant?.slug)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    return ApiResponseDto.success({ succeeded, failed: ids.length - succeeded, total: ids.length });
  }

  @Get('stats/indexing')
  @Roles('ADMIN')
  async getIndexingStats(@Req() req: any) {
    const stats = await this.documentService.getIndexingStats(req.tenant?.id, req.tenant?.databaseUrl);
    return ApiResponseDto.success(stats);
  }

  @Post('bulk/reprocess')
  @Roles('ADMIN')
  async bulkReprocess(@Query('force') force: string, @Req() req: any) {
    const result = await this.documentService.reprocessAll(
      req.tenant?.id,
      req.tenant?.databaseUrl,
      force === 'true',
    );
    return ApiResponseDto.success(result);
  }

  @Post('bulk/delete')
  @Roles('ADMIN', 'EDITOR')
  async bulkDelete(@Body('ids') ids: string[], @Req() req: any) {
    const results = await Promise.allSettled(
      ids.map((id) => this.documentService.softDelete(id, req.tenant?.slug)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    return ApiResponseDto.success({ succeeded, failed: ids.length - succeeded, total: ids.length });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const doc = await this.documentService.findById(id);
    return ApiResponseDto.success(doc);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    const doc = await this.documentService.update(id, dto, userId);
    return ApiResponseDto.success(doc);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EDITOR')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.documentService.softDelete(id, req.tenant?.slug);
    return ApiResponseDto.success({ deleted: true });
  }

  @Post(':id/publish')
  @Roles('ADMIN', 'EDITOR')
  async publish(@Param('id') id: string, @Req() req: any) {
    const doc = await this.documentService.publish(id, req.tenant?.id, req.tenant?.databaseUrl);
    return ApiResponseDto.success(doc);
  }

  @Post(':id/unpublish')
  @Roles('ADMIN', 'EDITOR')
  async unpublish(@Param('id') id: string, @Req() req: any) {
    const doc = await this.documentService.unpublish(id, req.tenant?.slug);
    return ApiResponseDto.success(doc);
  }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    const versions = await this.documentService.getVersions(id);
    return ApiResponseDto.success(versions);
  }

  @Get(':id/versions/:version')
  async getVersion(@Param('id') id: string, @Param('version') version: number) {
    const v = await this.documentService.getVersion(id, version);
    return ApiResponseDto.success(v);
  }

  @Post(':id/reprocess')
  @Roles('ADMIN')
  async reprocess(@Param('id') id: string, @Req() req: any) {
    const result = await this.documentService.reprocessOne(id, req.tenant?.id, req.tenant?.databaseUrl);
    return ApiResponseDto.success(result);
  }

  @Post(':id/rollback')
  @Roles('ADMIN', 'EDITOR')
  async rollback(
    @Param('id') id: string,
    @Body('version') version: number,
    @CurrentUser('id') userId: string,
  ) {
    const doc = await this.documentService.rollback(id, version, userId);
    return ApiResponseDto.success(doc);
  }
}
