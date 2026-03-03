import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MasterTagService } from '../services/master-tag.service';
import { CreateMasterTagDto } from '../dto/create-master-tag.dto';
import { ApiResponseDto } from '@common/dto';
import { MasterRoles, SuperAdminOnly } from '@common/decorators';

@ApiTags('Master Wiki - Tags')
@ApiBearerAuth()
@Controller('master/tags')
@SuperAdminOnly()
export class MasterTagController {
  constructor(private readonly tagService: MasterTagService) {}

  @Post()
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async create(@Body() dto: CreateMasterTagDto) {
    const tag = await this.tagService.create(dto);
    return ApiResponseDto.success(tag);
  }

  @Get()
  async findAll() {
    const tags = await this.tagService.findAll();
    return ApiResponseDto.success(tags);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const tag = await this.tagService.findById(id);
    return ApiResponseDto.success(tag);
  }

  @Patch(':id')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateMasterTagDto>) {
    const tag = await this.tagService.update(id, dto);
    return ApiResponseDto.success(tag);
  }

  @Delete(':id')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async delete(@Param('id') id: string) {
    await this.tagService.delete(id);
    return ApiResponseDto.success({ deleted: true });
  }
}
