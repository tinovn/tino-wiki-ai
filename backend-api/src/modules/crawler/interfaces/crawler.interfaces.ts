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

export interface CrawlJobData {
  sourceId: string;
  jobId: string;
  tenantId: string;
  tenantDatabaseUrl: string;
}

export interface CrawlUrlJobData {
  jobId: string;
  url: string;
  sourceConfig: CrawlSourceConfig;
  tenantId: string;
  tenantDatabaseUrl: string;
}
