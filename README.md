# Sitemap Generator

A configurable Node.js CLI that crawls public websites and writes XML sitemap files.

This is a vibe-coded app. I built it because I could not find a suitable free sitemap generator that handled the crawling rules I needed while still being easy to run locally and configure per website.

It is intended to be practical, inspectable, and easy to adapt. It is not a hosted SEO platform, and it does not run JavaScript in a browser. It crawls the HTML returned by normal HTTP requests.

## What It Does

- Starts from one or more configured URLs
- Stays inside configured allowed domains
- Discovers links from HTML pages
- Normalizes URLs to avoid duplicates
- Supports query parameter handling for pagination and tracking parameters
- Respects `robots.txt`
- Respects meta robots and Googlebot robots tags
- Respects `X-Robots-Tag` headers
- Handles canonical URLs
- Excludes `noindex` pages
- Does not follow links from `nofollow` pages
- Includes successful HTML pages by default
- Supports concurrency, crawl delay, max URL count, and max depth
- Supports include and exclude URL patterns
- Supports custom request headers and custom user agent
- Splits sitemap files at 50,000 URLs
- Writes a sitemap index when multiple sitemap files are created
- Writes a JSON crawl report

## Installation

```bash
npm install
npm run build
```

## Usage

Run with the example config:

```bash
node dist/cli.js --config sitemap.config.js
```

Or with npm:

```bash
npm run build
npm run start -- --config sitemap.config.js
```

If published/linked as a package, the CLI name is:

```bash
npx sitemap-generator --config sitemap.config.js
```

JSON config files are also supported:

```bash
node dist/cli.js --config sitemap.config.json
```

## Example Config

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

## Output

Files are written to `outputDir`.

- `sitemap.xml` when there are 50,000 URLs or fewer
- `sitemap-index.xml` plus `sitemap-1.xml`, `sitemap-2.xml`, etc. when there are more than 50,000 URLs
- `crawl-report.json` with crawl stats, broken links, redirects, skipped URL reasons, and written URL count

Sitemap URLs are XML-escaped and duplicate sitemap entries are removed.

## Query Parameters And Pagination

Many sites use query parameters for listing pages:

```text
/products?page=2
/destination/united-states/operators?page=85
```

For those sites, use:

```js
includeQueryParameters: true
```

Then strip only tracking or referral parameters:

```js
stripQueryParameters: [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "fbclid",
  "gclid",
  "rfpage"
]
```

If `includeQueryParameters` is `false`, a URL like `/products?page=2` is normalized to `/products`, so pagination pages will be treated as duplicates and skipped.

## Logging

The CLI always prints a summary:

- Pages crawled
- Pages skipped
- Noindex pages excluded
- Nofollow pages not followed
- Broken links
- Redirects
- Total URLs written
- Sitemap/report paths

Set this to see per-URL skip messages:

```js
verboseLogging: true
```

Set this to keep the console quiet while still saving details in `crawl-report.json`:

```js
verboseLogging: false
```

Config-filtered skips are recorded with clearer reasons:

- `outside-domain`
- `not-included-by-pattern`
- `excluded-by-pattern`

## Configuration Reference

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
| `respectCanonical` | Use canonical URLs as sitemap entries when allowed. |
| `includeCanonicalOutsideDomain` | Allow external canonical URLs in the sitemap. |
| `includePatterns` | Regex strings that URLs must match when provided. |
| `excludePatterns` | Regex strings that URLs must not match. |
| `stripQueryParameters` | Query parameters to remove when query parameters are included. |
| `includeQueryParameters` | Keep query parameters after stripping configured parameters. |
| `allowedContentTypes` | Response media types eligible for parsing and sitemap inclusion. |
| `requestHeaders` | Extra headers, useful for auth, staging, or previews. |
| `verboseLogging` | Print per-URL verbose messages. Defaults to `true`. |
| `timeoutMs` | Request timeout in milliseconds. |
| `retries` | Retry count for transient fetch failures. |
| `lastmod` | Configure `lastmod` from `http-header`, `today`, or `disabled`. |
| `defaults` | Optional `changefreq` and `priority` values for entries. |

## Important Notes

- The crawler does not execute client-side JavaScript. Links must be present in the fetched HTML.
- It treats URL paths as case-sensitive. Protocol and hostnames are normalized to lowercase.
- It follows redirects manually and does not include redirect responses in the sitemap.
- It only includes configured HTML content types by default.
- Be polite with public websites. Use sensible `concurrency` and `crawlDelayMs` values.
- Always inspect `crawl-report.json` after a large crawl.

## Development

```bash
npm install
npm run build
npm test
```

Project structure:

```text
src/
  cli.ts
  config.ts
  crawler.ts
  normalise-url.ts
  parser.ts
  report.ts
  robots.ts
  sitemap-writer.ts
  types.ts
tests/
```

The code is intentionally small and typed so it can be changed for site-specific crawling needs without turning into a black box.
