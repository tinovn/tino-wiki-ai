import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MasterCategoryService } from '../services/master-category.service';
import { CreateMasterCategoryDto } from '../dto/create-master-category.dto';
import { UpdateMasterCategoryDto } from '../dto/update-master-category.dto';
import { ApiResponseDto } from '@common/dto';
import { MasterRoles, SuperAdminOnly } from '@common/decorators';

@ApiTags('Master Wiki - Categories')
@ApiBearerAuth()
@Controller('master/categories')
@SuperAdminOnly()
export class MasterCategoryController {
  constructor(private readonly categoryService: MasterCategoryService) {}

  @Post()
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async create(@Body() dto: CreateMasterCategoryDto) {
    const category = await this.categoryService.create(dto);
    return ApiResponseDto.success(category);
  }

  @Get()
  async findAll() {
    const categories = await this.categoryService.findAll();
    return ApiResponseDto.success(categories);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const category = await this.categoryService.findById(id);
    return ApiResponseDto.success(category);
  }

  @Patch(':id')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateMasterCategoryDto) {
    const category = await this.categoryService.update(id, dto);
    return ApiResponseDto.success(category);
  }

  @Delete(':id')
  @MasterRoles('SUPER_OWNER', 'ADMIN')
  async delete(@Param('id') id: string) {
    await this.categoryService.delete(id);
    return ApiResponseDto.success({ deleted: true });
  }
}
