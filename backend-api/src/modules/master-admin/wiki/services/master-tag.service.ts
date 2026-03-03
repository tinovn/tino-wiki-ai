import { Injectable, NotFoundException } from '@nestjs/common';
import { MasterTagRepository } from '../repositories/master-tag.repository';
import { CreateMasterTagDto } from '../dto/create-master-tag.dto';
import { generateSlug } from '@common/utils';

@Injectable()
export class MasterTagService {
  constructor(private readonly tagRepo: MasterTagRepository) {}

  async create(dto: CreateMasterTagDto) {
    const slug = generateSlug(dto.name);
    return this.tagRepo.create({
      name: dto.name,
      slug,
      color: dto.color,
    });
  }

  async findById(id: string) {
    const tag = await this.tagRepo.findById(id);
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);
    return tag;
  }

  async findAll() {
    return this.tagRepo.findAll();
  }

  async update(id: string, dto: Partial<CreateMasterTagDto>) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.name) data.slug = generateSlug(dto.name);
    return this.tagRepo.update(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.tagRepo.delete(id);
  }
}
