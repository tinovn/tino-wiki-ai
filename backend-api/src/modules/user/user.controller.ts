import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { PaginationDto, ApiResponseDto } from '@common/dto';
import { Roles } from '@common/decorators';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateUserDto) {
    const user = await this.userService.create(dto);
    return ApiResponseDto.success(user);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(@Query() query: PaginationDto) {
    const { data, total } = await this.userService.findAll(query.page, query.limit);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    return ApiResponseDto.success(user);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.userService.update(id, dto);
    return ApiResponseDto.success(user);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @Req() req: any,
  ) {
    const caller = {
      id: req.user.id,
      role: req.user.role,
      scope: req.user.scope,
    };
    const user = await this.userService.changeRole(id, dto.role, caller);
    return ApiResponseDto.success(user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deactivate(@Param('id') id: string) {
    const user = await this.userService.deactivate(id);
    return ApiResponseDto.success(user);
  }
}
