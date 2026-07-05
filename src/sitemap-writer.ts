import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { SitemapEntry } from "./types.js";

export const SITEMAP_URL_LIMIT = 50000;

export interface SitemapWriteResult {
  files: string[];
  indexFile?: string;
  urlsWritten: number;
}

export async function writeSitemaps(
  entries: SitemapEntry[],
  outputDir: string,
  sitemapBaseUrl: string
): Promise<SitemapWriteResult> {
  await mkdir(outputDir, { recursive: true });
  const chunks = chunk(entries, SITEMAP_URL_LIMIT);
  const files: string[] = [];

  if (chunks.length <= 1) {
    const filePath = join(outputDir, "sitemap.xml");
    await writeSitemapFile(filePath, chunks[0] ?? []);
    return { files: [filePath], urlsWritten: entries.length };
  }

  for (const [index, sitemapEntries] of chunks.entries()) {
    const filePath = join(outputDir, `sitemap-${index + 1}.xml`);
    await writeSitemapFile(filePath, sitemapEntries);
    files.push(filePath);
  }

  const indexFile = join(outputDir, "sitemap-index.xml");
  await writeSitemapIndex(indexFile, files, sitemapBaseUrl);
  return { files, indexFile, urlsWritten: entries.length };
}

function writeSitemapFile(filePath: string, entries: SitemapEntry[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(filePath, { encoding: "utf8" });
    stream.on("error", reject);
    stream.on("finish", resolve);
    stream.write('<?xml version="1.0" encoding="UTF-8"?>\n');
    stream.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n');
    for (const entry of entries) {
      stream.write("  <url>\n");
      stream.write(`    <loc>${escapeXml(entry.loc)}</loc>\n`);
      if (entry.lastmod) stream.write(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`);
      if (entry.changefreq) stream.write(`    <changefreq>${entry.changefreq}</changefreq>\n`);
      if (entry.priority !== undefined) stream.write(`    <priority>${entry.priority.toFixed(1)}</priority>\n`);
      stream.write("  </url>\n");
    }
    stream.end("</urlset>\n");
  });
}

function writeSitemapIndex(filePath: string, files: string[], sitemapBaseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const base = sitemapBaseUrl.replace(/\/$/, "");
    const stream = createWriteStream(filePath, { encoding: "utf8" });
    stream.on("error", reject);
    stream.on("finish", resolve);
    stream.write('<?xml version="1.0" encoding="UTF-8"?>\n');
    stream.write('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n');
    for (const file of files) {
      const filename = file.split(/[\\/]/).at(-1);
      stream.write("  <sitemap>\n");
      stream.write(`    <loc>${escapeXml(`${base}/${filename}`)}</loc>\n`);
      stream.write("  </sitemap>\n");
    }
    stream.end("</sitemapindex>\n");
  });
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
