export type LastmodSource = "http-header" | "today" | "disabled";

export type Changefreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface LastmodConfig {
  enabled: boolean;
  source: LastmodSource;
  fallbackToToday: boolean;
}

export interface SitemapDefaults {
  changefreq?: Changefreq;
  priority?: number;
}

export interface SitemapConfig {
  siteUrl: string;
  startUrls: string[];
  outputDir: string;
  sitemapBaseUrl: string;
  allowedDomains: string[];
  userAgent: string;
  concurrency: number;
  crawlDelayMs: number;
  maxUrls: number;
  maxDepth: number;
  respectRobotsTxt: boolean;
  respectMetaRobots: boolean;
  respectXRobotsTag: boolean;
  respectCanonical: boolean;
  includeCanonicalOutsideDomain: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  stripQueryParameters: string[];
  includeQueryParameters: boolean;
  allowedContentTypes: string[];
  requestHeaders: Record<string, string>;
  verboseLogging: boolean;
  timeoutMs: number;
  retries: number;
  lastmod: LastmodConfig;
  defaults: SitemapDefaults;
}

export interface QueueItem {
  url: string;
  depth: number;
  source?: string;
}

export interface ParsedPage {
  links: string[];
  canonicalUrl?: string;
  metaNoindex: boolean;
  metaNofollow: boolean;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: Changefreq;
  priority?: number;
}

export interface BrokenLink {
  url: string;
  source?: string;
  status?: number;
  error?: string;
}

export interface RedirectRecord {
  from: string;
  to: string;
  status: number;
}

export interface SkippedUrl {
  url: string;
  reason: string;
  source?: string;
}

export interface CrawlReport {
  startedAt: string;
  finishedAt?: string;
  pagesCrawled: number;
  pagesSkipped: number;
  pagesExcludedNoindex: number;
  pagesNotFollowedNofollow: number;
  brokenLinks: BrokenLink[];
  redirects: RedirectRecord[];
  skippedUrls: SkippedUrl[];
  urlsWritten: number;
  skippedReasons: Record<string, number>;
}

export interface NormaliseOptions {
  stripQueryParameters: string[];
  includeQueryParameters: boolean;
}
