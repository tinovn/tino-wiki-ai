import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerRepository } from '../repositories/customer.repository';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async create(dto: CreateCustomerDto) {
    return this.customerRepo.create(dto);
  }

  async findById(id: string) {
    const customer = await this.customerRepo.findById(id);
    if (!customer) throw new NotFoundException(`Customer "${id}" not found`);
    return customer;
  }

  async findAll(page = 1, limit = 20) {
    return this.customerRepo.findAll(page, limit);
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findById(id);
    return this.customerRepo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.customerRepo.delete(id);
  }
}
