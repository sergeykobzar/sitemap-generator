import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { Crawler } from "../src/crawler.js";
import { mergeConfig } from "../src/config.js";

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  }
});

describe("canonical handling", () => {
  it("uses an in-domain canonical URL instead of the crawled URL", async () => {
    const origin = await listen((_request, response) => {
      response.writeHead(200, { "content-type": "text/html" });
      response.end('<link rel="canonical" href="/preferred"><p>Hello</p>');
    });
    const config = mergeConfig({
      siteUrl: origin,
      startUrls: [`${origin}/page`],
      allowedDomains: [new URL(origin).hostname],
      respectRobotsTxt: false
    });

    const result = await new Crawler(config).crawl();

    expect(result.entries.map((entry) => entry.loc)).toEqual([`${origin}/preferred`]);
  });

  it("drops external canonicals by default", async () => {
    const origin = await listen((_request, response) => {
      response.writeHead(200, { "content-type": "text/html" });
      response.end('<link rel="canonical" href="https://external.example/page">');
    });
    const config = mergeConfig({
      siteUrl: origin,
      startUrls: [origin],
      allowedDomains: [new URL(origin).hostname],
      respectRobotsTxt: false
    });

    const result = await new Crawler(config).crawl();

    expect(result.entries).toHaveLength(0);
  });
});

function listen(handler: Parameters<typeof createServer>[0]): Promise<string> {
  server = createServer(handler);
  return new Promise((resolve) => {
    server?.listen(0, "127.0.0.1", () => {
      const address = server?.address() as AddressInfo;
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}
