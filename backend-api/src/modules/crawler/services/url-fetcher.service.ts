import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { load } from 'cheerio';
import * as TurndownService from 'turndown';
import type { ExtractedContent, CrawlSourceConfig } from '../interfaces/crawler.interfaces';

type ApiMapping = NonNullable<CrawlSourceConfig['apiMapping']>;

@Injectable()
export class UrlFetcherService {
  private readonly logger = new Logger(UrlFetcherService.name);
  private readonly turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
    // Remove images to keep content text-focused
    this.turndown.addRule('removeImages', {
      filter: 'img',
      replacement: () => '',
    });
  }

  async fetchAndExtract(url: string, config?: CrawlSourceConfig): Promise<ExtractedContent> {
    const timeout = config?.timeout || 30000;
    const headers: Record<string, string> = {
      'User-Agent': 'TinoWikiCrawler/1.0',
      Accept: 'text/html,application/xhtml+xml',
      ...config?.headers,
    };

    const response = await axios.get(url, { timeout, headers, maxRedirects: 5 });
    const html = response.data as string;
    const $ = load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, .sidebar, .nav, .footer, .header, .ads, .advertisement, iframe, noscript').remove();

    const title = this.extractTitle($, config);
    const contentHtml = this.extractContentHtml($, config);
    const content = this.htmlToMarkdown(contentHtml);
    const excerpt = this.stripHtml(contentHtml).substring(0, 300).trim();

    const metadata: Record<string, any> = {
      sourceUrl: url,
      crawledAt: new Date().toISOString(),
      httpStatus: response.status,
      contentType: response.headers['content-type'],
    };

    // Extract meta tags
    const description = $('meta[name="description"]').attr('content');
    const author = $('meta[name="author"]').attr('content');
    const publishedDate = $('meta[property="article:published_time"]').attr('content');
    if (description) metadata.description = description;
    if (author) metadata.author = author;
    if (publishedDate) metadata.publishedDate = publishedDate;

    return { title, content, excerpt, metadata };
  }

  private extractTitle($: ReturnType<typeof load>, config?: CrawlSourceConfig): string {
    if (config?.titleSelector) {
      const customTitle = $(config.titleSelector).first().text().trim();
      if (customTitle) return customTitle;
    }

    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) return ogTitle.trim();

    const h1 = $('h1').first().text().trim();
    if (h1) return h1;

    return $('title').text().trim() || 'Untitled';
  }

  private extractContentHtml($: ReturnType<typeof load>, config?: CrawlSourceConfig): string {
    if (config?.contentSelector) {
      const el = $(config.contentSelector).first();
      if (el.length) return el.html() || '';
    }

    const selectors = [
      'article', 'main', '[role="main"]',
      '.post-content', '.entry-content', '.article-content',
      '.content', '#content', '.post-body',
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length && el.text().trim().length > 100) {
        return el.html() || '';
      }
    }

    return $('body').html() || '';
  }

  async fetchApi(url: string, config?: CrawlSourceConfig): Promise<ExtractedContent[]> {
    const timeout = config?.timeout || 30000;
    const headers: Record<string, string> = {
      'User-Agent': 'TinoWikiCrawler/1.0',
      Accept: 'application/json',
      ...config?.headers,
    };

    const response = await axios.get(url, { timeout, headers, maxRedirects: 5 });
    const data = response.data;
    const mapping = config?.apiMapping || {};

    let items: any[];
    if (mapping.itemsPath) {
      items = this.resolvePath(data, mapping.itemsPath);
      if (!Array.isArray(items)) items = [items];
    } else if (Array.isArray(data)) {
      items = data;
    } else {
      items = [data];
    }

    return items.map((item) => this.extractFromJson(item, mapping, url));
  }

  private extractFromJson(item: any, mapping: ApiMapping, sourceUrl: string): ExtractedContent {
    const titleField = mapping.titleField || 'title';
    const contentField = mapping.contentField || 'content';
    const excerptField = mapping.excerptField || 'excerpt';
    const linkField = mapping.linkField || 'link';

    const rawTitle = this.resolvePath(item, titleField);
    const rawContent = this.resolvePath(item, contentField);
    const rawExcerpt = this.resolvePath(item, excerptField);
    const rawLink = this.resolvePath(item, linkField);

    const title = this.stripHtml(typeof rawTitle === 'string' ? rawTitle : String(rawTitle || 'Untitled'));

    // Convert HTML content to Markdown
    let content: string;
    if (typeof rawContent === 'string') {
      content = this.htmlToMarkdown(rawContent);
    } else {
      content = JSON.stringify(rawContent || '');
    }

    const excerpt = typeof rawExcerpt === 'string'
      ? this.stripHtml(rawExcerpt).substring(0, 300)
      : this.stripHtml(content).substring(0, 300);

    return {
      title: title || 'Untitled',
      content,
      excerpt: excerpt.trim(),
      metadata: {
        sourceUrl: rawLink || sourceUrl,
        crawledAt: new Date().toISOString(),
        originalId: item.id,
        slug: item.slug,
        date: item.date,
      },
    };
  }

  private htmlToMarkdown(html: string): string {
    if (!html || !html.trim()) return '';
    const md = this.turndown.turndown(html);
    // Clean up excessive blank lines
    return md.replace(/\n{3,}/g, '\n\n').trim();
  }

  private resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((cur, key) => cur?.[key], obj);
  }

  private stripHtml(html: string): string {
    const $ = load(html);
    const text = $('body').text() || $.root().text();
    return text.replace(/\s+/g, ' ').trim();
  }
}
