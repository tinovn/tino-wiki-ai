import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerMemoryRepository } from '../repositories/customer-memory.repository';
import { CreateMemoryEntryDto } from '../dto/create-memory-entry.dto';

@Injectable()
export class CustomerMemoryService {
  constructor(private readonly memoryRepo: CustomerMemoryRepository) {}

  async addMemory(customerId: string, dto: CreateMemoryEntryDto) {
    return this.memoryRepo.upsert({
      customerId,
      type: dto.type,
      key: dto.key,
      value: dto.value,
      source: dto.source || 'AGENT_MANUAL',
      confidence: dto.confidence ?? 1.0,
    });
  }

  async getMemories(customerId: string) {
    return this.memoryRepo.findByCustomerId(customerId);
  }

  async updateMemory(memoryId: string, data: Partial<CreateMemoryEntryDto>) {
    const memory = await this.memoryRepo.findById(memoryId);
    if (!memory) throw new NotFoundException(`Memory "${memoryId}" not found`);
    return this.memoryRepo.update(memoryId, data);
  }

  async deleteMemory(memoryId: string) {
    const memory = await this.memoryRepo.findById(memoryId);
    if (!memory) throw new NotFoundException(`Memory "${memoryId}" not found`);
    return this.memoryRepo.delete(memoryId);
  }

  async getMemoriesForAi(customerId: string): Promise<Array<{ type: string; key: string; value: string }>> {
    const memories = await this.memoryRepo.findByCustomerId(customerId);
    return memories.map((m) => ({
      type: m.type,
      key: m.key,
      value: m.value,
    }));
  }
}
