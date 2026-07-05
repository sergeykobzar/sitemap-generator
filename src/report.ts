import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CrawlReport } from "./types.js";

export function createReport(): CrawlReport {
  return {
    startedAt: new Date().toISOString(),
    pagesCrawled: 0,
    pagesSkipped: 0,
    pagesExcludedNoindex: 0,
    pagesNotFollowedNofollow: 0,
    brokenLinks: [],
    redirects: [],
    skippedUrls: [],
    urlsWritten: 0,
    skippedReasons: {}
  };
}

export function countSkip(report: CrawlReport, reason: string): void {
  report.pagesSkipped += 1;
  report.skippedReasons[reason] = (report.skippedReasons[reason] ?? 0) + 1;
}

export async function writeReport(outputDir: string, report: CrawlReport): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const filePath = join(outputDir, "crawl-report.json");
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return filePath;
}
