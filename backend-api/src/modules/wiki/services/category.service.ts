import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { generateSlug } from '@common/utils';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async create(dto: CreateCategoryDto) {
    const slug = generateSlug(dto.name);
    return this.categoryRepo.create({ ...dto, slug });
  }

  async findAll() {
    return this.categoryRepo.findAll();
  }

  async findById(id: string) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new NotFoundException(`Category "${id}" not found`);
    return category;
  }

  async update(id: string, data: Partial<CreateCategoryDto>) {
    await this.findById(id);
    const updateData: any = { ...data };
    if (data.name) updateData.slug = generateSlug(data.name);
    return this.categoryRepo.update(id, updateData);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.categoryRepo.delete(id);
  }
}
