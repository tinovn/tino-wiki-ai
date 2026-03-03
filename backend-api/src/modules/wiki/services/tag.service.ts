import { Injectable, NotFoundException } from '@nestjs/common';
import { TagRepository } from '../repositories/tag.repository';
import { CreateTagDto } from '../dto/create-tag.dto';
import { generateSlug } from '@common/utils';

@Injectable()
export class TagService {
  constructor(private readonly tagRepo: TagRepository) {}

  async create(dto: CreateTagDto) {
    const slug = generateSlug(dto.name);
    return this.tagRepo.create({ name: dto.name, slug, color: dto.color });
  }

  async findAll() {
    return this.tagRepo.findAll();
  }

  async findById(id: string) {
    const tag = await this.tagRepo.findById(id);
    if (!tag) throw new NotFoundException(`Tag "${id}" not found`);
    return tag;
  }

  async update(id: string, data: Partial<CreateTagDto>) {
    await this.findById(id);
    const updateData: any = { ...data };
    if (data.name) updateData.slug = generateSlug(data.name);
    return this.tagRepo.update(id, updateData);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.tagRepo.delete(id);
  }
}
