import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig, mergeConfig } from "../src/config.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("mergeConfig", () => {
  it("fills defaults from siteUrl", () => {
    const config = mergeConfig({ siteUrl: "https://Example.com" });

    expect(config.startUrls).toEqual(["https://Example.com"]);
    expect(config.allowedDomains).toEqual(["example.com"]);
    expect(config.outputDir).toBe("./dist/sitemaps");
    expect(config.verboseLogging).toBe(true);
  });
});

describe("loadConfig", () => {
  it("loads JSON config files", async () => {
    dir = await mkdtemp(join(tmpdir(), "sitemap-config-"));
    const configPath = join(dir, "sitemap.config.json");
    await writeFile(configPath, JSON.stringify({ siteUrl: "https://example.com" }), "utf8");

    const config = await loadConfig(configPath);

    expect(config.siteUrl).toBe("https://example.com");
  });
});
