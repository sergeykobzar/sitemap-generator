import { normaliseUrl, isAllowedDomain } from "./normalise-url.js";
import { parseHtml, parseXRobotsTag } from "./parser.js";
import { countSkip, createReport } from "./report.js";
import { RobotsManager } from "./robots.js";
import type { CrawlReport, QueueItem, SitemapConfig, SitemapEntry } from "./types.js";

export interface CrawlResult {
  entries: SitemapEntry[];
  report: CrawlReport;
}

interface FetchResult {
  response?: Response;
  error?: Error;
}

export class Crawler {
  private readonly robots: RobotsManager;
  private readonly seen = new Set<string>();
  private readonly queued = new Set<string>();
  private readonly sitemapUrls = new Set<string>();
  private readonly entries: SitemapEntry[] = [];
  private readonly queue: QueueItem[] = [];
  private readonly includePatterns: RegExp[];
  private readonly excludePatterns: RegExp[];
  private readonly report = createReport();
  private active = 0;
  private lastRequestAt = 0;

  constructor(private readonly config: SitemapConfig) {
    this.robots = new RobotsManager(config);
    this.includePatterns = config.includePatterns.map((pattern) => new RegExp(pattern));
    this.excludePatterns = config.excludePatterns.map((pattern) => new RegExp(pattern));
  }

  async crawl(): Promise<CrawlResult> {
    for (const startUrl of this.config.startUrls) {
      this.enqueue(startUrl, 0);
    }

    await new Promise<void>((resolve) => {
      const schedule = (): void => {
        while (
          this.active < this.config.concurrency &&
          this.queue.length > 0 &&
          this.entries.length < this.config.maxUrls
        ) {
          const item = this.queue.shift();
          if (!item) break;
          this.active += 1;
          void this.process(item).finally(() => {
            this.active -= 1;
            schedule();
          });
        }

        if (this.active === 0 && (this.queue.length === 0 || this.entries.length >= this.config.maxUrls)) {
          resolve();
        }
      };

      schedule();
    });

    this.report.finishedAt = new Date().toISOString();
    this.report.urlsWritten = this.entries.length;
    return { entries: this.entries, report: this.report };
  }

  private enqueue(input: string, depth: number, source?: string): void {
    if (depth > this.config.maxDepth) return;
    if (this.seen.size + this.queue.length >= this.config.maxUrls) return;

    const url = normaliseUrl(input, source, this.config);
    if (!url) return;
    if (this.queued.has(url) || this.seen.has(url)) return;
    if (!this.shouldConsider(url)) {
      countSkip(this.report, "pattern-or-domain");
      return;
    }

    this.queued.add(url);
    this.queue.push({ url, depth, source });
  }

  private async process(item: QueueItem): Promise<void> {
    this.queued.delete(item.url);
    if (this.seen.has(item.url)) return;
    this.seen.add(item.url);

    if (!(await this.robots.isAllowed(item.url))) {
      countSkip(this.report, "robots.txt");
      return;
    }

    await this.applyDelay(item.url);
    const { response, error } = await this.fetchWithRetries(item.url);
    if (!response) {
      this.report.brokenLinks.push({ url: item.url, source: item.source, error: error?.message });
      countSkip(this.report, "request-error");
      return;
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const target = location ? normaliseUrl(location, item.url, this.config) : undefined;
      if (target) {
        this.report.redirects.push({ from: item.url, to: target, status: response.status });
        this.enqueue(target, item.depth, item.source ?? item.url);
      }
      countSkip(this.report, "redirect");
      return;
    }

    if (response.status !== 200) {
      this.report.brokenLinks.push({ url: item.url, source: item.source, status: response.status });
      countSkip(this.report, "http-status");
      return;
    }

    if (!this.isAllowedContentType(response.headers.get("content-type"))) {
      countSkip(this.report, "content-type");
      return;
    }

    const html = await response.text();
    const parsed = parseHtml(html);
    const xRobots = this.config.respectXRobotsTag
      ? parseXRobotsTag(response.headers)
      : { noindex: false, nofollow: false };
    const noindex =
      xRobots.noindex || (this.config.respectMetaRobots ? parsed.metaNoindex : false);
    const nofollow =
      xRobots.nofollow || (this.config.respectMetaRobots ? parsed.metaNofollow : false);

    this.report.pagesCrawled += 1;

    if (noindex) {
      this.report.pagesExcludedNoindex += 1;
      countSkip(this.report, "noindex");
    } else {
      const sitemapUrl = this.resolveSitemapUrl(item.url, parsed.canonicalUrl);
      if (sitemapUrl && !this.sitemapUrls.has(sitemapUrl)) {
        this.sitemapUrls.add(sitemapUrl);
        this.entries.push({
          loc: sitemapUrl,
          lastmod: this.resolveLastmod(response.headers),
          changefreq: this.config.defaults.changefreq,
          priority: this.config.defaults.priority
        });
      }
    }

    if (nofollow) {
      this.report.pagesNotFollowedNofollow += 1;
      return;
    }

    for (const link of parsed.links) {
      this.enqueue(link, item.depth + 1, item.url);
    }
  }

  private shouldConsider(url: string): boolean {
    if (!isAllowedDomain(url, this.config.allowedDomains)) return false;
    if (this.includePatterns.length > 0 && !this.includePatterns.some((pattern) => pattern.test(url))) {
      return false;
    }
    if (this.excludePatterns.some((pattern) => pattern.test(url))) return false;
    return true;
  }

  private resolveSitemapUrl(crawledUrl: string, canonical: string | undefined): string | undefined {
    if (!this.config.respectCanonical || !canonical) return crawledUrl;

    const canonicalUrl = normaliseUrl(canonical, crawledUrl, this.config);
    if (!canonicalUrl) return crawledUrl;
    if (isAllowedDomain(canonicalUrl, this.config.allowedDomains)) return canonicalUrl;
    return this.config.includeCanonicalOutsideDomain ? canonicalUrl : undefined;
  }

  private isAllowedContentType(contentType: string | null): boolean {
    if (!contentType) return false;
    const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
    return this.config.allowedContentTypes.some((allowed) => allowed.toLowerCase() === mediaType);
  }

  private resolveLastmod(headers: Headers): string | undefined {
    if (!this.config.lastmod.enabled || this.config.lastmod.source === "disabled") return undefined;
    if (this.config.lastmod.source === "today") return today();

    const header = headers.get("last-modified");
    if (header) {
      const date = new Date(header);
      if (!Number.isNaN(date.valueOf())) return date.toISOString();
    }

    return this.config.lastmod.fallbackToToday ? today() : undefined;
  }

  private async fetchWithRetries(url: string): Promise<FetchResult> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.config.retries; attempt += 1) {
      try {
        const response = await fetch(url, {
          redirect: "manual",
          headers: {
            "user-agent": this.config.userAgent,
            accept: this.config.allowedContentTypes.join(", "),
            ...this.config.requestHeaders
          },
          signal: AbortSignal.timeout(this.config.timeoutMs)
        });
        return { response };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    return { error: lastError };
  }

  private async applyDelay(url: string): Promise<void> {
    const robotDelay = await this.robots.crawlDelayMs(url);
    const delayMs = Math.max(this.config.crawlDelayMs, robotDelay ?? 0);
    if (delayMs <= 0) return;

    const waitMs = Math.max(0, this.lastRequestAt + delayMs - Date.now());
    if (waitMs > 0) await sleep(waitMs);
    this.lastRequestAt = Date.now();
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
