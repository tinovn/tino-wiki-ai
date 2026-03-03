import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHash } from 'crypto';
import { QUEUES, JOBS } from '@common/constants';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import { generateSlug } from '@common/utils';
import { UrlFetcherService } from '../services/url-fetcher.service';
import { SitemapParserService } from '../services/sitemap-parser.service';
import { RssParserService } from '../services/rss-parser.service';
import type { CrawlJobData, CrawlSourceConfig, ExtractedContent } from '../interfaces/crawler.interfaces';

@Processor(QUEUES.CRAWLER)
export class CrawlerProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlerProcessor.name);

  constructor(
    private readonly prismaClientManager: PrismaClientManager,
    private readonly urlFetcher: UrlFetcherService,
    private readonly sitemapParser: SitemapParserService,
    private readonly rssParser: RssParserService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOBS.CRAWL_SOURCE) {
      return this.processCrawlSource(job.data);
    }
  }

  private async processCrawlSource(data: CrawlJobData): Promise<void> {
    const { sourceId, jobId, tenantDatabaseUrl } = data;
    const prisma = await this.prismaClientManager.getClient(tenantDatabaseUrl);

    const source = await prisma.crawlSource.findUnique({ where: { id: sourceId } });
    if (!source) {
      this.logger.warn(`CrawlSource ${sourceId} not found, skipping`);
      return;
    }

    // Mark job as running
    await prisma.crawlJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const config = (source.config || {}) as CrawlSourceConfig;
    const counters = { totalUrls: 0, processedUrls: 0, newDocuments: 0, updatedDocs: 0, skippedUrls: 0, failedUrls: 0 };

    try {
      let urls: { url: string; title?: string; content?: string }[] = [];

      switch (source.type) {
        case 'URL':
          urls = [{ url: source.url }];
          break;

        case 'SITEMAP': {
          const entries = await this.sitemapParser.parseSitemap(source.url, config.maxPages);
          urls = entries.map((e) => ({ url: e.url }));
          break;
        }

        case 'RSS': {
          const items = await this.rssParser.parseFeed(source.url);
          urls = items
            .filter((item) => item.link)
            .map((item) => ({ url: item.link, title: item.title, content: item.content }));
          break;
        }

        case 'API': {
          const apiItems = await this.urlFetcher.fetchApi(source.url, config);
          urls = apiItems.map((item) => ({
            url: item.metadata.sourceUrl || source.url,
            title: item.title,
            content: item.content,
          }));
          break;
        }
      }

      counters.totalUrls = urls.length;
      await prisma.crawlJob.update({ where: { id: jobId }, data: { totalUrls: urls.length } });

      const delayMs = config.delayMs || 1000;

      for (const item of urls) {
        try {
          const result = await this.processUrl(prisma, jobId, item, config, source);
          counters.processedUrls++;

          if (result === 'new') counters.newDocuments++;
          else if (result === 'updated') counters.updatedDocs++;
          else if (result === 'skipped') counters.skippedUrls++;

          // Update progress
          await prisma.crawlJob.update({
            where: { id: jobId },
            data: {
              processedUrls: counters.processedUrls,
              newDocuments: counters.newDocuments,
              updatedDocs: counters.updatedDocs,
              skippedUrls: counters.skippedUrls,
              failedUrls: counters.failedUrls,
            },
          });

          // Delay between requests to be polite
          if (urls.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        } catch (err) {
          counters.failedUrls++;
          counters.processedUrls++;
          await prisma.crawlResult.create({
            data: {
              jobId,
              url: item.url,
              status: 'FAILED',
              error: err.message,
            },
          });
          this.logger.warn(`Failed to crawl ${item.url}: ${err.message}`);
        }
      }

      // Mark job complete
      await prisma.crawlJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          processedUrls: counters.processedUrls,
          newDocuments: counters.newDocuments,
          updatedDocs: counters.updatedDocs,
          skippedUrls: counters.skippedUrls,
          failedUrls: counters.failedUrls,
        },
      });

      // Update source lastCrawlAt
      await prisma.crawlSource.update({
        where: { id: sourceId },
        data: { lastCrawlAt: new Date() },
      });

      this.logger.log(
        `Crawl completed for ${source.name}: ${counters.newDocuments} new, ${counters.skippedUrls} skipped, ${counters.failedUrls} failed`,
      );
    } catch (err) {
      await prisma.crawlJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', completedAt: new Date(), error: err.message },
      });
      await prisma.crawlSource.update({
        where: { id: sourceId },
        data: { status: 'ERROR' },
      });
      this.logger.error(`Crawl failed for ${source.name}: ${err.message}`);
    }
  }

  private async processUrl(
    prisma: any,
    jobId: string,
    item: { url: string; title?: string; content?: string },
    config: CrawlSourceConfig,
    source: any,
  ): Promise<'new' | 'updated' | 'skipped'> {
    let extracted: ExtractedContent;

    // If RSS already provided content, use it; otherwise fetch
    if (item.content && item.content.length > 50) {
      extracted = {
        title: item.title || 'Untitled',
        content: item.content,
        excerpt: item.content.substring(0, 300).trim(),
        metadata: { sourceUrl: item.url, crawledAt: new Date().toISOString() },
      };
    } else {
      extracted = await this.urlFetcher.fetchAndExtract(item.url, config);
    }

    // Hash content for dedup
    const contentHash = createHash('md5').update(extracted.content).digest('hex');

    // Check if we already have this exact content
    const existing = await prisma.crawlResult.findFirst({
      where: { url: item.url, contentHash, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await prisma.crawlResult.create({
        data: {
          jobId,
          url: item.url,
          status: 'SKIPPED',
          title: extracted.title,
          contentHash,
          metadata: { reason: 'duplicate_content' },
        },
      });
      return 'skipped';
    }

    // Create document as DRAFT
    const slug = generateSlug(extracted.title) + '-' + Date.now();
    const wordCount = extracted.content.split(/\s+/).length;

    const document = await prisma.document.create({
      data: {
        title: extracted.title,
        slug,
        content: extracted.content,
        excerpt: extracted.excerpt,
        status: 'DRAFT',
        authorId: source.createdById,
        categoryId: source.categoryId,
        wordCount,
        metadata: {
          ...extracted.metadata,
          crawlSourceId: source.id,
          crawlSourceName: source.name,
        },
      },
    });

    // Create initial version
    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        title: extracted.title,
        content: extracted.content,
        createdById: source.createdById,
        changeNote: `Crawled from ${item.url}`,
      },
    });

    // Set tags if source has tagIds
    if (source.tagIds && source.tagIds.length > 0) {
      await prisma.documentTag.createMany({
        data: source.tagIds.map((tagId: string) => ({ documentId: document.id, tagId })),
        skipDuplicates: true,
      });
    }

    // Record crawl result
    await prisma.crawlResult.create({
      data: {
        jobId,
        url: item.url,
        status: 'SUCCESS',
        title: extracted.title,
        contentHash,
        documentId: document.id,
        metadata: extracted.metadata,
      },
    });

    return 'new';
  }
}
