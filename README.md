# Sitemap Generator

A reusable Node.js and TypeScript CLI that crawls public websites and writes valid XML sitemap files.

## Features

- Crawls from one or more start URLs
- Restricts crawling to configured domains
- Discovers links from HTML pages
- Normalizes URLs, removes fragments, resolves relative links, removes duplicate trailing slashes, and optionally strips query parameters
- Respects `robots.txt`, meta robots, Googlebot meta robots, `X-Robots-Tag`, and canonical links
- Excludes `noindex` pages and avoids following links from `nofollow` pages
- Includes only successful HTML pages by default
- Supports concurrency, crawl delay, max URL count, max depth, include/exclude patterns, custom headers, and custom user agents
- Writes `sitemap.xml` for up to 50,000 URLs
- Writes `sitemap-index.xml` plus numbered sitemap files for larger crawls
- Writes `crawl-report.json`

## Installation

```bash
npm install
npm run build
```

For published package usage:

```bash
npx sitemap-generator --config sitemap.config.js
```

## Usage

Create a config file:

```js
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
  verboseLogging: true,
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
```

Run the CLI:

```bash
node dist/cli.js --config sitemap.config.js
```

Or through npm:

```bash
npm run build
npm run start -- --config sitemap.config.js
```

JSON config files are also supported:

```bash
node dist/cli.js --config sitemap.config.json
```

## Output

The generator writes files to `outputDir`:

- `sitemap.xml` when there are 50,000 URLs or fewer
- `sitemap-index.xml` and `sitemap-1.xml`, `sitemap-2.xml`, etc. when there are more than 50,000 URLs
- `crawl-report.json`

Sitemap URLs are XML-escaped and duplicate sitemap entries are removed.

## Configuration

| Field | Description |
| --- | --- |
| `siteUrl` | Main site URL. Required. |
| `startUrls` | URLs where crawling starts. Defaults to `siteUrl`. |
| `outputDir` | Directory for generated files. Defaults to `./dist/sitemaps`. |
| `sitemapBaseUrl` | Public URL prefix used in sitemap indexes. Defaults to the origin of `siteUrl`. |
| `allowedDomains` | Hostnames that may be crawled. Defaults to the hostname of `siteUrl`. |
| `userAgent` | User agent sent with requests. |
| `concurrency` | Number of pages fetched in parallel. |
| `crawlDelayMs` | Minimum delay between requests. A larger `robots.txt` crawl delay wins. |
| `maxUrls` | Maximum URLs to crawl/write. |
| `maxDepth` | Maximum link depth from start URLs. |
| `respectRobotsTxt` | Check `robots.txt` before fetching pages. |
| `respectMetaRobots` | Respect `noindex` and `nofollow` meta tags. |
| `respectXRobotsTag` | Respect `X-Robots-Tag` response headers. |
| `respectCanonical` | Use in-domain canonical URLs as sitemap entries. |
| `includeCanonicalOutsideDomain` | Allow external canonical URLs in the sitemap. |
| `includePatterns` | Regex strings that URLs must match when provided. |
| `excludePatterns` | Regex strings that URLs must not match. |
| `stripQueryParameters` | Query parameters to remove when `includeQueryParameters` is true. |
| `includeQueryParameters` | Keep query parameters after stripping configured parameters. |
| `allowedContentTypes` | Response media types eligible for parsing and sitemap inclusion. |
| `requestHeaders` | Extra headers, useful for auth or previews. |
| `verboseLogging` | Print per-URL verbose messages, such as config-filtered skipped URLs. Defaults to `true`. |
| `timeoutMs` | Request timeout in milliseconds. |
| `retries` | Retry count for transient fetch failures. |
| `lastmod` | Configure `lastmod` from `http-header`, `today`, or `disabled`. |
| `defaults` | Optional `changefreq` and `priority` values for entries. |

## Development

```bash
npm install
npm run build
npm test
```

The CLI entry point is `src/cli.ts`. The queue-based crawler lives in `src/crawler.ts`, HTML parsing in `src/parser.ts`, robots handling in `src/robots.ts`, URL normalization in `src/normalise-url.ts`, and XML writing in `src/sitemap-writer.ts`.
