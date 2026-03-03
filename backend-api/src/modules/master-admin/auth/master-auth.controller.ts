import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@common/decorators';
import { ApiResponseDto } from '@common/dto';
import { MasterAuthService } from './master-auth.service';
import { MasterLoginDto } from './dto/master-login.dto';

@ApiTags('Master Auth')
@Controller('master/auth')
export class MasterAuthController {
  constructor(private readonly masterAuthService: MasterAuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: MasterLoginDto) {
    const result = await this.masterAuthService.login(dto);
    return ApiResponseDto.success(result);
  }
}
