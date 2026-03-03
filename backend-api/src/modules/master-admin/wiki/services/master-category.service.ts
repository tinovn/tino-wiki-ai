import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { MasterCategoryRepository } from '../repositories/master-category.repository';
import { CreateMasterCategoryDto } from '../dto/create-master-category.dto';
import { UpdateMasterCategoryDto } from '../dto/update-master-category.dto';
import { generateSlug } from '@common/utils';

@Injectable()
export class MasterCategoryService {
  constructor(private readonly categoryRepo: MasterCategoryRepository) {}

  async create(dto: CreateMasterCategoryDto) {
    const slug = generateSlug(dto.name);
    return this.categoryRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
      parentId: dto.parentId,
      sortOrder: dto.sortOrder,
    });
  }

  async findById(id: string) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async findAll() {
    return this.categoryRepo.findAll();
  }

  async update(id: string, dto: UpdateMasterCategoryDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.name) data.slug = generateSlug(dto.name);
    return this.categoryRepo.update(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.categoryRepo.delete(id);
  }
}
