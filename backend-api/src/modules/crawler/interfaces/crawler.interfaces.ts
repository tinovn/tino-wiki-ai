export interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  metadata: Record<string, any>;
}

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  priority?: number;
}

export interface RssFeedItem {
  title: string;
  link: string;
  content: string;
  pubDate?: string;
}

export interface CrawlSourceConfig {
  /** CSS selector for main content area */
  contentSelector?: string;
  /** CSS selector for title */
  titleSelector?: string;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
  /** Max pages to crawl from sitemap */
  maxPages?: number;
  /** Request timeout in ms */
  timeout?: number;
  /** Delay between requests in ms */
  delayMs?: number;
  /** Number of days before a crawled URL is considered stale (default: 30) */
  staleDays?: number;
  /** Default document type for crawled documents */
  defaultDocumentType?: string;
  /** Default audience for crawled documents */
  defaultAudience?: string;
  /** Default priority for crawled documents (1-10) */
  defaultPriority?: number;
  /** JSON field mapping for API source type */
  apiMapping?: {
    /** JSONPath to array of items (e.g., "$" for root array, "$.data.posts") */
    itemsPath?: string;
    /** Field name for title (e.g., "title", "title.rendered") */
    titleField?: string;
    /** Field name for content (e.g., "content", "content.rendered") */
    contentField?: string;
    /** Field name for excerpt (e.g., "excerpt", "excerpt.rendered") */
    excerptField?: string;
    /** Field name for URL/link (e.g., "link", "url") */
    linkField?: string;
  };
}

export type CrawlMode = 'new_only' | 'recrawl_stale' | 'force_all';

export interface CrawlJobData {
  sourceId: string;
  jobId: string;
  tenantId: string;
  tenantDatabaseUrl: string;
  /** Crawl mode: new_only (default) = skip known URLs, recrawl_stale = re-fetch URLs older than staleDays, force_all = re-fetch everything */
  mode?: CrawlMode;
}

export interface CrawlUrlJobData {
  jobId: string;
  url: string;
  sourceConfig: CrawlSourceConfig;
  tenantId: string;
  tenantDatabaseUrl: string;
}
