import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { ApiResponseDto } from '@common/dto';
import { Roles } from '@common/decorators';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateCategoryDto) {
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
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    const category = await this.categoryService.update(id, dto);
    return ApiResponseDto.success(category);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.categoryService.delete(id);
    return ApiResponseDto.success({ deleted: true });
  }
}
