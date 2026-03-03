import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TagService } from '../services/tag.service';
import { CreateTagDto } from '../dto/create-tag.dto';
import { ApiResponseDto } from '@common/dto';
import { Roles } from '@common/decorators';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() dto: CreateTagDto) {
    const tag = await this.tagService.create(dto);
    return ApiResponseDto.success(tag);
  }

  @Get()
  async findAll() {
    const tags = await this.tagService.findAll();
    return ApiResponseDto.success(tags);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateTagDto>) {
    const tag = await this.tagService.update(id, dto);
    return ApiResponseDto.success(tag);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.tagService.delete(id);
    return ApiResponseDto.success({ deleted: true });
  }
}
