import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerController } from './controllers/crawler.controller';
import { CrawlerService } from './services/crawler.service';
import { UrlFetcherService } from './services/url-fetcher.service';
import { SitemapParserService } from './services/sitemap-parser.service';
import { RssParserService } from './services/rss-parser.service';
import { CrawlSchedulerService } from './services/crawl-scheduler.service';
import { CrawlerProcessor } from './processors/crawler.processor';
import { CrawlSourceRepository } from './repositories/crawl-source.repository';
import { CrawlJobRepository } from './repositories/crawl-job.repository';
import { CrawlResultRepository } from './repositories/crawl-result.repository';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    UrlFetcherService,
    SitemapParserService,
    RssParserService,
    CrawlSchedulerService,
    CrawlerProcessor,
    CrawlSourceRepository,
    CrawlJobRepository,
    CrawlResultRepository,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
