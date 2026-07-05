export default {
  siteUrl: "https://www.example.com",
  startUrls: ["https://www.example.com"],
  outputDir: "./dist/sitemaps",
  sitemapBaseUrl: "https://www.example.com",
  allowedDomains: ["www.example.com"],
  userAgent: "SitemapGenerator/1.0",
  concurrency: 5,
  crawlDelayMs: 250,
  maxUrls: 100000,
  maxDepth: 20,
  respectRobotsTxt: true,
  respectMetaRobots: true,
  respectXRobotsTag: true,
  respectCanonical: true,
  includeCanonicalOutsideDomain: false,
  includePatterns: ["^https://www\\.example\\.com/"],
  excludePatterns: ["/account", "/login", "/checkout", "\\?sort=", "\\?filter="],
  stripQueryParameters: [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid"
  ],
  includeQueryParameters: false,
  allowedContentTypes: ["text/html", "application/xhtml+xml"],
  requestHeaders: {},
  lastmod: {
    enabled: true,
    source: "http-header",
    fallbackToToday: true
  },
  defaults: {
    changefreq: "weekly",
    priority: 0.7
  }
};
