import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '@common/constants';
import { CrawlSourceRepository } from '../repositories/crawl-source.repository';
import { CrawlJobRepository } from '../repositories/crawl-job.repository';
import { CrawlResultRepository } from '../repositories/crawl-result.repository';
import { CreateCrawlSourceDto } from '../dto/create-crawl-source.dto';
import { UpdateCrawlSourceDto } from '../dto/update-crawl-source.dto';
import { CrawlSourceQueryDto } from '../dto/crawl-source-query.dto';
import type { CrawlJobData, CrawlMode } from '../interfaces/crawler.interfaces';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private readonly sourceRepo: CrawlSourceRepository,
    private readonly jobRepo: CrawlJobRepository,
    private readonly resultRepo: CrawlResultRepository,
    @InjectQueue(QUEUES.CRAWLER) private readonly crawlerQueue: Queue,
  ) {}

  async createSource(dto: CreateCrawlSourceDto, userId: string) {
    const source = await this.sourceRepo.create({
      name: dto.name,
      type: dto.type,
      url: dto.url,
      config: dto.config,
      categoryId: dto.categoryId,
      tagIds: dto.tagIds,
      schedule: dto.schedule,
      createdById: userId,
    });
    this.logger.log(`Created crawl source: ${source.name} (${source.type})`);
    return source;
  }

  async updateSource(id: string, dto: UpdateCrawlSourceDto) {
    await this.findSourceById(id);
    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.config !== undefined) data.config = dto.config;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.tagIds !== undefined) data.tagIds = dto.tagIds;
    if (dto.schedule !== undefined) data.schedule = dto.schedule;
    if (dto.status !== undefined) data.status = dto.status;

    return this.sourceRepo.update(id, data);
  }

  async deleteSource(id: string) {
    await this.findSourceById(id);
    return this.sourceRepo.delete(id);
  }

  async findAllSources(query: CrawlSourceQueryDto) {
    return this.sourceRepo.findAll({
      page: query.page || 1,
      limit: query.limit || 20,
      type: query.type,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findSourceById(id: string) {
    const source = await this.sourceRepo.findById(id);
    if (!source) throw new NotFoundException(`CrawlSource ${id} not found`);
    return source;
  }

  async triggerCrawl(sourceId: string, tenantId: string, tenantDatabaseUrl: string, mode: CrawlMode = 'new_only') {
    const source = await this.findSourceById(sourceId);
    const job = await this.jobRepo.create(sourceId);

    const jobData: CrawlJobData = {
      sourceId,
      jobId: job.id,
      tenantId,
      tenantDatabaseUrl,
      mode,
    };

    const jobName = mode === 'recrawl_stale' ? JOBS.RECRAWL_STALE : JOBS.CRAWL_SOURCE;

    await this.crawlerQueue.add(jobName, jobData, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(`Triggered crawl [${mode}] for source: ${source.name}, job: ${job.id}`);
    return job;
  }

  async getJobHistory(sourceId: string, page = 1, limit = 20) {
    await this.findSourceById(sourceId);
    return this.jobRepo.findBySourceId(sourceId, page, limit);
  }

  async getJobDetail(jobId: string) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new NotFoundException(`CrawlJob ${jobId} not found`);
    return job;
  }

  async getJobResults(jobId: string, page = 1, limit = 50) {
    await this.getJobDetail(jobId);
    return this.resultRepo.findByJobId(jobId, page, limit);
  }
}
