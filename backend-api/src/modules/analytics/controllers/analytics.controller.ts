import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { PaginationDto, ApiResponseDto } from '@common/dto';
import { Roles } from '@common/decorators';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@Roles('ADMIN')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const metrics = await this.analyticsService.getDashboard(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return ApiResponseDto.success(metrics);
  }

  @Get('queries')
  async getQueryLogs(@Query() query: AnalyticsQueryDto) {
    const { data, total } = await this.analyticsService.getQueryLogs(
      query.page,
      query.limit,
      query.wasSuccessful,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get('queries/failures')
  async getFailedQueries(@Query() query: PaginationDto) {
    const { data, total } = await this.analyticsService.getFailedQueries(query.page, query.limit);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get('content-gaps')
  async getContentGaps(@Query() query: PaginationDto, @Query('status') status?: string) {
    const { data, total } = await this.analyticsService.getContentGaps(query.page, query.limit, status);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Patch('content-gaps/:id')
  async updateContentGap(
    @Param('id') id: string,
    @Body() body: { status?: string; resolvedDocId?: string },
  ) {
    const gap = await this.analyticsService.updateContentGap(id, body);
    return ApiResponseDto.success(gap);
  }
}
