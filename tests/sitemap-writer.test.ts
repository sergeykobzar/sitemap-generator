import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SITEMAP_URL_LIMIT, escapeXml, writeSitemaps } from "../src/sitemap-writer.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("writeSitemaps", () => {
  it("writes one sitemap for small URL sets", async () => {
    dir = await mkdtemp(join(tmpdir(), "sitemap-"));
    const result = await writeSitemaps([{ loc: "https://example.com/?a=1&b=2" }], dir, "https://example.com");
    const xml = await readFile(join(dir, "sitemap.xml"), "utf8");

    expect(result.urlsWritten).toBe(1);
    expect(xml).toContain("https://example.com/?a=1&amp;b=2");
  });

  it("splits large URL sets and writes an index", async () => {
    dir = await mkdtemp(join(tmpdir(), "sitemap-"));
    const entries = Array.from({ length: SITEMAP_URL_LIMIT + 1 }, (_, index) => ({
      loc: `https://example.com/page-${index}`
    }));

    const result = await writeSitemaps(entries, dir, "https://example.com/sitemaps");

    expect(result.files).toHaveLength(2);
    expect(result.indexFile).toBe(join(dir, "sitemap-index.xml"));
  });
});

describe("escapeXml", () => {
  it("escapes XML entities", () => {
    expect(escapeXml(`https://example.com/?a=1&b="<x>"`)).toBe(
      "https://example.com/?a=1&amp;b=&quot;&lt;x&gt;&quot;"
    );
  });
});
