import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDashboardService } from './master-dashboard.service';
import { ApiResponseDto } from '@common/dto';
import { SuperAdminOnly } from '@common/decorators';

@ApiTags('Master Dashboard')
@ApiBearerAuth()
@Controller('master/dashboard')
@SuperAdminOnly()
export class MasterDashboardController {
  constructor(private readonly dashboardService: MasterDashboardService) {}

  @Get('overview')
  async getOverview() {
    const overview = await this.dashboardService.getOverview();
    return ApiResponseDto.success(overview);
  }
}
