import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@common/decorators';
import { ApiResponseDto } from '@common/dto';
import { CannedResponsesRepository } from '../repositories/canned-responses.repository';
import { CreateCannedResponseDto, UpdateCannedResponseDto } from '../dto';

@ApiTags('Canned Responses')
@ApiBearerAuth()
@Controller('conversations/canned-responses')
@Roles('ADMIN', 'AGENT')
export class CannedResponsesController {
  constructor(private readonly repo: CannedResponsesRepository) {}

  @Get()
  async findAll() {
    const data = await this.repo.findAll();
    return ApiResponseDto.success(data);
  }

  @Post()
  async create(
    @Body() dto: CreateCannedResponseDto,
    @CurrentUser('sub') userId: string,
  ) {
    const response = await this.repo.create({
      shortCode: dto.shortCode,
      title: dto.title,
      content: dto.content,
      createdBy: userId,
    });
    return ApiResponseDto.success(response);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCannedResponseDto,
  ) {
    const response = await this.repo.update(id, dto);
    return ApiResponseDto.success(response);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.repo.delete(id);
    return ApiResponseDto.success({ deleted: true });
  }
}
