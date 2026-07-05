#!/usr/bin/env node
import { resolve } from "node:path";
import { Crawler } from "./crawler.js";
import { loadConfig } from "./config.js";
import { writeReport } from "./report.js";
import { writeSitemaps } from "./sitemap-writer.js";

async function main(): Promise<void> {
  const configPath = resolve(parseConfigPath(process.argv.slice(2)));
  const config = await loadConfig(configPath);

  console.log(`Using config: ${configPath}`);
  console.log(`Starting crawl with ${config.startUrls.length} start URL(s)`);

  const crawler = new Crawler(config);
  const { entries, report } = await crawler.crawl();
  const sitemapResult = await writeSitemaps(entries, config.outputDir, config.sitemapBaseUrl);
  report.urlsWritten = sitemapResult.urlsWritten;
  const reportPath = await writeReport(config.outputDir, report);

  console.log(`Pages crawled: ${report.pagesCrawled}`);
  console.log(`Pages skipped: ${report.pagesSkipped}`);
  console.log(`Noindex pages excluded: ${report.pagesExcludedNoindex}`);
  console.log(`Nofollow pages not followed: ${report.pagesNotFollowedNofollow}`);
  console.log(`Broken links: ${report.brokenLinks.length}`);
  console.log(`Redirects: ${report.redirects.length}`);
  console.log(`Total URLs written: ${report.urlsWritten}`);
  console.log(`Sitemap files: ${sitemapResult.files.join(", ")}`);
  if (sitemapResult.indexFile) console.log(`Sitemap index: ${sitemapResult.indexFile}`);
  console.log(`Crawl report: ${reportPath}`);
}

function parseConfigPath(args: string[]): string {
  const configFlagIndex = args.findIndex((arg) => arg === "--config" || arg === "-c");
  if (configFlagIndex === -1) return "sitemap.config.js";
  const configPath = args[configFlagIndex + 1];
  if (!configPath) throw new Error("--config requires a file path");
  return configPath;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sitemap generation failed: ${message}`);
  process.exitCode = 1;
});
