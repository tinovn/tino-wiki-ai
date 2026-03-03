import { Injectable, Logger } from '@nestjs/common';
import * as Parser from 'rss-parser';
import type { RssFeedItem } from '../interfaces/crawler.interfaces';

@Injectable()
export class RssParserService {
  private readonly logger = new Logger(RssParserService.name);
  private readonly parser = new Parser({
    timeout: 30000,
    headers: { 'User-Agent': 'TinoWikiCrawler/1.0' },
  });

  async parseFeed(url: string): Promise<RssFeedItem[]> {
    const feed = await this.parser.parseURL(url);

    const items: RssFeedItem[] = (feed.items || []).map((item) => ({
      title: item.title || 'Untitled',
      link: item.link || '',
      content: item['content:encoded'] || item.content || item.contentSnippet || '',
      pubDate: item.pubDate || item.isoDate,
    }));

    this.logger.log(`Parsed ${items.length} items from RSS feed: ${url}`);
    return items;
  }
}
