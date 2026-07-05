import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
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

describe("crawler integration", () => {
  it("crawls a small site while respecting robots, noindex, and nofollow", async () => {
    const origin = await listen((request, response) => {
      const path = request.url ?? "/";
      if (path === "/robots.txt") return text(response, "User-agent: *\nDisallow: /blocked");
      if (path === "/") {
        return html(
          response,
          '<a href="/page">Page</a><a href="/noindex">Noindex</a><a href="/nofollow">Nofollow</a><a href="/blocked">Blocked</a><a href="/missing">Missing</a>'
        );
      }
      if (path === "/page") return html(response, '<a href="/deep">Deep</a>');
      if (path === "/deep") return html(response, "<p>Deep</p>");
      if (path === "/noindex") return html(response, '<meta name="robots" content="noindex">');
      if (path === "/nofollow") {
        return html(response, '<meta name="robots" content="nofollow"><a href="/unseen">Unseen</a>');
      }
      if (path === "/blocked") return html(response, "<p>Blocked</p>");
      response.writeHead(404, { "content-type": "text/html" });
      response.end("missing");
    });

    const config = mergeConfig({
      siteUrl: origin,
      startUrls: [origin],
      allowedDomains: [new URL(origin).hostname],
      maxDepth: 5
    });

    const result = await new Crawler(config).crawl();
    const urls = result.entries.map((entry) => entry.loc).sort();

    expect(urls).toEqual([`${origin}/`, `${origin}/deep`, `${origin}/nofollow`, `${origin}/page`].sort());
    expect(result.report.pagesExcludedNoindex).toBe(1);
    expect(result.report.pagesNotFollowedNofollow).toBe(1);
    expect(result.report.brokenLinks).toHaveLength(1);
    expect(urls).not.toContain(`${origin}/blocked`);
    expect(urls).not.toContain(`${origin}/unseen`);
  });
});

function listen(handler: (request: IncomingMessage, response: ServerResponse) => void): Promise<string> {
  server = createServer(handler);
  return new Promise((resolve) => {
    server?.listen(0, "127.0.0.1", () => {
      const address = server?.address() as AddressInfo;
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function html(response: ServerResponse, body: string): void {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(body);
}

function text(response: ServerResponse, body: string): void {
  response.writeHead(200, { "content-type": "text/plain" });
  response.end(body);
}
