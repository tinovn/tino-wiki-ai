import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { PaginationDto, ApiResponseDto } from '@common/dto';
import { Roles } from '@common/decorators';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@Roles('ADMIN', 'AGENT')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    const customer = await this.customerService.create(dto);
    return ApiResponseDto.success(customer);
  }

  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { data, total } = await this.customerService.findAll(query.page, query.limit);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const customer = await this.customerService.findById(id);
    return ApiResponseDto.success(customer);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    const customer = await this.customerService.update(id, dto);
    return ApiResponseDto.success(customer);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.customerService.delete(id);
    return ApiResponseDto.success({ deleted: true });
  }
}
