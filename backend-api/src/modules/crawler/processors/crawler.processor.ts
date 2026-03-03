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
import type { CrawlJobData, CrawlMode, CrawlSourceConfig, ExtractedContent } from '../interfaces/crawler.interfaces';

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
    if (job.name === JOBS.CRAWL_SOURCE || job.name === JOBS.RECRAWL_STALE) {
      return this.processCrawlSource(job.data);
    }
  }

  private async processCrawlSource(data: CrawlJobData): Promise<void> {
    const { sourceId, jobId, tenantDatabaseUrl, mode = 'new_only' } = data;
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

      // Filter URLs based on crawl mode
      const filteredUrls = await this.filterUrlsByMode(prisma, urls, mode, config);
      const skippedBeforeFetch = urls.length - filteredUrls.length;

      counters.totalUrls = urls.length;
      counters.skippedUrls = skippedBeforeFetch;
      counters.processedUrls = skippedBeforeFetch;
      await prisma.crawlJob.update({
        where: { id: jobId },
        data: { totalUrls: urls.length, skippedUrls: skippedBeforeFetch, processedUrls: skippedBeforeFetch },
      });

      this.logger.log(
        `[${mode}] ${source.name}: ${urls.length} total URLs, ${filteredUrls.length} to crawl, ${skippedBeforeFetch} skipped`,
      );

      const delayMs = config.delayMs || 1000;

      for (const item of filteredUrls) {
        try {
          const result = await this.processUrl(prisma, jobId, item, config, source, mode);
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
          if (filteredUrls.length > 1) {
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
        `Crawl completed for ${source.name} [${mode}]: ${counters.newDocuments} new, ${counters.updatedDocs} updated, ${counters.skippedUrls} skipped, ${counters.failedUrls} failed`,
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

  /**
   * Filter URLs based on crawl mode:
   * - new_only: skip URLs that have been successfully crawled before
   * - recrawl_stale: only include URLs crawled more than staleDays ago
   * - force_all: include all URLs
   */
  private async filterUrlsByMode(
    prisma: any,
    urls: { url: string; title?: string; content?: string }[],
    mode: CrawlMode,
    config: CrawlSourceConfig,
  ): Promise<{ url: string; title?: string; content?: string }[]> {
    if (mode === 'force_all') return urls;

    const urlStrings = urls.map((u) => u.url);

    // Get latest successful crawl result for each URL
    const existingResults = await prisma.crawlResult.findMany({
      where: {
        url: { in: urlStrings },
        status: 'SUCCESS',
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['url'],
      select: { url: true, createdAt: true },
    });

    const crawledUrlMap = new Map<string, Date>();
    for (const result of existingResults) {
      crawledUrlMap.set(result.url, result.createdAt);
    }

    if (mode === 'new_only') {
      // Only crawl URLs that have never been successfully crawled
      return urls.filter((item) => !crawledUrlMap.has(item.url));
    }

    if (mode === 'recrawl_stale') {
      const staleDays = config.staleDays || 30;
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - staleDays);

      // Only crawl URLs that were last crawled before the stale date
      return urls.filter((item) => {
        const lastCrawled = crawledUrlMap.get(item.url);
        if (!lastCrawled) return true; // never crawled = include
        return lastCrawled < staleDate;
      });
    }

    return urls;
  }

  private async processUrl(
    prisma: any,
    jobId: string,
    item: { url: string; title?: string; content?: string },
    config: CrawlSourceConfig,
    source: any,
    mode: CrawlMode = 'new_only',
  ): Promise<'new' | 'updated' | 'skipped'> {
    // Check if this URL was already crawled successfully
    const existingResult = await prisma.crawlResult.findFirst({
      where: { url: item.url, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, contentHash: true, documentId: true, createdAt: true },
    });

    // For new_only mode: if URL already crawled, skip without fetching
    if (mode === 'new_only' && existingResult) {
      await prisma.crawlResult.create({
        data: {
          jobId,
          url: item.url,
          status: 'SKIPPED',
          title: item.title,
          contentHash: existingResult.contentHash,
          metadata: { reason: 'already_crawled', lastCrawledAt: existingResult.createdAt },
        },
      });
      return 'skipped';
    }

    // Fetch content
    let extracted: ExtractedContent;
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

    const contentHash = createHash('md5').update(extracted.content).digest('hex');

    // For recrawl modes: if content hasn't changed, skip
    if (existingResult && existingResult.contentHash === contentHash) {
      await prisma.crawlResult.create({
        data: {
          jobId,
          url: item.url,
          status: 'SKIPPED',
          title: extracted.title,
          contentHash,
          metadata: { reason: 'content_unchanged' },
        },
      });
      return 'skipped';
    }

    // If URL was crawled before and content changed → update existing Document
    if (existingResult?.documentId) {
      const existingDoc = await prisma.document.findUnique({
        where: { id: existingResult.documentId },
        select: { id: true, currentVersion: true },
      });

      if (existingDoc) {
        const wordCount = extracted.content.split(/\s+/).length;
        const newVersion = (existingDoc.currentVersion || 1) + 1;

        await prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            title: extracted.title,
            content: extracted.content,
            excerpt: extracted.excerpt,
            wordCount,
            currentVersion: newVersion,
            metadata: {
              ...extracted.metadata,
              crawlSourceId: source.id,
              crawlSourceName: source.name,
              lastRecrawledAt: new Date().toISOString(),
            },
          },
        });

        await prisma.documentVersion.create({
          data: {
            documentId: existingDoc.id,
            version: newVersion,
            title: extracted.title,
            content: extracted.content,
            createdById: source.createdById,
            changeNote: `Re-crawled from ${item.url} (content changed)`,
          },
        });

        await prisma.crawlResult.create({
          data: {
            jobId,
            url: item.url,
            status: 'SUCCESS',
            title: extracted.title,
            contentHash,
            documentId: existingDoc.id,
            metadata: { ...extracted.metadata, action: 'updated' },
          },
        });

        return 'updated';
      }
    }

    // New URL → create new Document
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
        type: config.defaultDocumentType || 'REFERENCE',
        audience: config.defaultAudience || 'PUBLIC',
        priority: config.defaultPriority ?? 3,
        metadata: {
          ...extracted.metadata,
          crawlSourceId: source.id,
          crawlSourceName: source.name,
        },
      },
    });

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

    if (source.tagIds && source.tagIds.length > 0) {
      await prisma.documentTag.createMany({
        data: source.tagIds.map((tagId: string) => ({ documentId: document.id, tagId })),
        skipDuplicates: true,
      });
    }

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
