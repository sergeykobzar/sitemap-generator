import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { SitemapConfig } from "./types.js";

const defaults: Omit<
  SitemapConfig,
  "siteUrl" | "startUrls" | "outputDir" | "sitemapBaseUrl" | "allowedDomains"
> = {
  userAgent: "SitemapGenerator/1.0",
  concurrency: 5,
  crawlDelayMs: 0,
  maxUrls: 100000,
  maxDepth: 20,
  respectRobotsTxt: true,
  respectMetaRobots: true,
  respectXRobotsTag: true,
  respectCanonical: true,
  includeCanonicalOutsideDomain: false,
  includePatterns: [],
  excludePatterns: [],
  stripQueryParameters: [],
  includeQueryParameters: true,
  allowedContentTypes: ["text/html", "application/xhtml+xml"],
  requestHeaders: {},
  verboseLogging: true,
  timeoutMs: 15000,
  retries: 0,
  lastmod: {
    enabled: true,
    source: "http-header",
    fallbackToToday: true
  },
  defaults: {}
};

export async function loadConfig(configPath: string): Promise<SitemapConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const rawConfig = configPath.endsWith(".json")
    ? JSON.parse(await readFile(configPath, "utf8"))
    : (await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`)).default;

  return validateConfig(mergeConfig(rawConfig));
}

export function mergeConfig(rawConfig: Partial<SitemapConfig>): SitemapConfig {
  const siteUrl = requiredString(rawConfig.siteUrl, "siteUrl");
  const site = new URL(siteUrl);
  const startUrls = rawConfig.startUrls?.length ? rawConfig.startUrls : [siteUrl];
  const allowedDomains = rawConfig.allowedDomains?.length
    ? rawConfig.allowedDomains.map((domain) => domain.toLowerCase())
    : [site.hostname.toLowerCase()];

  return {
    ...defaults,
    ...rawConfig,
    startUrls,
    siteUrl,
    sitemapBaseUrl: rawConfig.sitemapBaseUrl ?? site.origin,
    outputDir: rawConfig.outputDir ?? "./dist/sitemaps",
    allowedDomains,
    lastmod: {
      ...defaults.lastmod,
      ...rawConfig.lastmod
    },
    defaults: {
      ...defaults.defaults,
      ...rawConfig.defaults
    },
    requestHeaders: {
      ...defaults.requestHeaders,
      ...rawConfig.requestHeaders
    }
  };
}

export function validateConfig(config: SitemapConfig): SitemapConfig {
  for (const url of [config.siteUrl, ...config.startUrls]) {
    new URL(url);
  }

  if (config.concurrency < 1) throw new Error("concurrency must be at least 1");
  if (config.maxUrls < 1) throw new Error("maxUrls must be at least 1");
  if (config.maxDepth < 0) throw new Error("maxDepth must be at least 0");
  if (config.defaults.priority !== undefined) {
    if (config.defaults.priority < 0 || config.defaults.priority > 1) {
      throw new Error("defaults.priority must be between 0 and 1");
    }
  }

  return config;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required config field: ${field}`);
  }
  return value;
}
