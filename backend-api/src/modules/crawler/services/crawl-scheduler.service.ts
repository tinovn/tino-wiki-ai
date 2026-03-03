import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '@common/constants';

@Injectable()
export class CrawlSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlSchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectQueue(QUEUES.CRAWLER) private readonly crawlerQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('CrawlSchedulerService initialized - scheduled crawls will be registered per tenant on demand');
  }

  addCronJob(sourceId: string, cronExpression: string, tenantId: string, tenantDatabaseUrl: string) {
    const jobName = `crawl-${sourceId}`;

    // Remove existing job if any
    this.removeCronJob(sourceId);

    const cronJob = new CronJob(cronExpression, async () => {
      this.logger.log(`Scheduled crawl triggered for source: ${sourceId}`);
      await this.crawlerQueue.add(JOBS.CRAWL_SOURCE, {
        sourceId,
        tenantId,
        tenantDatabaseUrl,
      } as any);
    });

    this.schedulerRegistry.addCronJob(jobName, cronJob);
    cronJob.start();
    this.logger.log(`Registered scheduled crawl: ${jobName} (${cronExpression})`);
  }

  removeCronJob(sourceId: string) {
    const jobName = `crawl-${sourceId}`;
    try {
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
        this.logger.log(`Removed scheduled crawl: ${jobName}`);
      }
    } catch {
      // Job doesn't exist, ignore
    }
  }

  listScheduledJobs(): string[] {
    const jobs = this.schedulerRegistry.getCronJobs();
    return Array.from(jobs.keys()).filter((name) => name.startsWith('crawl-'));
  }
}
