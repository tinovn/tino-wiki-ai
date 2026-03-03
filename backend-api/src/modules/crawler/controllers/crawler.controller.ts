import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CrawlerService } from '../services/crawler.service';
import { CrawlSchedulerService } from '../services/crawl-scheduler.service';
import { CreateCrawlSourceDto } from '../dto/create-crawl-source.dto';
import { UpdateCrawlSourceDto } from '../dto/update-crawl-source.dto';
import { CrawlSourceQueryDto } from '../dto/crawl-source-query.dto';
import { ApiResponseDto } from '@common/dto';
import { CurrentUser, Roles } from '@common/decorators';

@ApiTags('Crawler')
@ApiBearerAuth()
@Controller('crawler')
@Roles('ADMIN', 'EDITOR')
export class CrawlerController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly schedulerService: CrawlSchedulerService,
  ) {}

  @Post('sources')
  async createSource(
    @Body() dto: CreateCrawlSourceDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const source = await this.crawlerService.createSource(dto, userId);

    // Register scheduled crawl if schedule is provided
    if (dto.schedule) {
      this.schedulerService.addCronJob(source.id, dto.schedule, req.tenant?.id, req.tenant?.databaseUrl);
    }

    return ApiResponseDto.success(source);
  }

  @Get('sources')
  async findAllSources(@Query() query: CrawlSourceQueryDto) {
    const { data, total } = await this.crawlerService.findAllSources(query);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get('sources/:id')
  async findSourceById(@Param('id') id: string) {
    const source = await this.crawlerService.findSourceById(id);
    return ApiResponseDto.success(source);
  }

  @Patch('sources/:id')
  async updateSource(
    @Param('id') id: string,
    @Body() dto: UpdateCrawlSourceDto,
    @Req() req: any,
  ) {
    const source = await this.crawlerService.updateSource(id, dto);

    // Update scheduled crawl
    if (dto.schedule !== undefined) {
      if (dto.schedule) {
        this.schedulerService.addCronJob(source.id, dto.schedule, req.tenant?.id, req.tenant?.databaseUrl);
      } else {
        this.schedulerService.removeCronJob(source.id);
      }
    }

    if (dto.status === 'PAUSED') {
      this.schedulerService.removeCronJob(source.id);
    }

    return ApiResponseDto.success(source);
  }

  @Delete('sources/:id')
  async deleteSource(@Param('id') id: string) {
    this.schedulerService.removeCronJob(id);
    await this.crawlerService.deleteSource(id);
    return ApiResponseDto.success({ deleted: true });
  }

  @Post('sources/:id/crawl')
  async triggerCrawl(@Param('id') id: string, @Req() req: any) {
    const job = await this.crawlerService.triggerCrawl(id, req.tenant?.id, req.tenant?.databaseUrl, 'new_only');
    return ApiResponseDto.success(job);
  }

  @Post('sources/:id/recrawl')
  async triggerRecrawl(@Param('id') id: string, @Req() req: any) {
    const job = await this.crawlerService.triggerCrawl(id, req.tenant?.id, req.tenant?.databaseUrl, 'recrawl_stale');
    return ApiResponseDto.success(job);
  }

  @Get('sources/:id/jobs')
  async getJobHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { data, total } = await this.crawlerService.getJobHistory(id, page || 1, limit || 20);
    return ApiResponseDto.paginated(data, total, page || 1, limit || 20);
  }

  @Get('jobs/:jobId')
  async getJobDetail(@Param('jobId') jobId: string) {
    const job = await this.crawlerService.getJobDetail(jobId);
    return ApiResponseDto.success(job);
  }

  @Get('jobs/:jobId/results')
  async getJobResults(
    @Param('jobId') jobId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { data, total } = await this.crawlerService.getJobResults(jobId, page || 1, limit || 50);
    return ApiResponseDto.paginated(data, total, page || 1, limit || 50);
  }
}
