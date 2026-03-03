import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { load } from 'cheerio';
import type { SitemapEntry } from '../interfaces/crawler.interfaces';

@Injectable()
export class SitemapParserService {
  private readonly logger = new Logger(SitemapParserService.name);

  async parseSitemap(url: string, maxPages?: number): Promise<SitemapEntry[]> {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'TinoWikiCrawler/1.0' },
    });

    const $ = load(response.data, { xmlMode: true });
    const entries: SitemapEntry[] = [];

    // Check if this is a sitemap index (contains <sitemapindex>)
    const sitemapIndexUrls = $('sitemapindex sitemap loc')
      .map((_, el) => $(el).text().trim())
      .get();

    if (sitemapIndexUrls.length > 0) {
      // Recursively parse each sub-sitemap
      for (const subUrl of sitemapIndexUrls) {
        if (maxPages && entries.length >= maxPages) break;
        try {
          const subEntries = await this.parseSitemap(subUrl, maxPages ? maxPages - entries.length : undefined);
          entries.push(...subEntries);
        } catch (err) {
          this.logger.warn(`Failed to parse sub-sitemap ${subUrl}: ${err.message}`);
        }
      }
      return entries;
    }

    // Parse regular sitemap
    $('urlset url').each((_, el) => {
      if (maxPages && entries.length >= maxPages) return false;

      const loc = $(el).find('loc').text().trim();
      if (!loc) return;

      const lastmod = $(el).find('lastmod').text().trim() || undefined;
      const priority = parseFloat($(el).find('priority').text().trim()) || undefined;

      entries.push({ url: loc, lastmod, priority });
    });

    this.logger.log(`Parsed ${entries.length} URLs from sitemap: ${url}`);
    return entries;
  }
}
