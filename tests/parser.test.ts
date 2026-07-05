import { describe, expect, it } from "vitest";
import { parseHtml, parseRobotsDirectives } from "../src/parser.js";

describe("parseHtml", () => {
  it("extracts links, canonical URLs, and robots directives", () => {
    const result = parseHtml(`
      <html>
        <head>
          <meta name="robots" content="noindex, nofollow">
          <link rel="canonical" href="/canonical">
        </head>
        <body><a href="/next">Next</a></body>
      </html>
    `);

    expect(result.links).toEqual(["/next"]);
    expect(result.canonicalUrl).toBe("/canonical");
    expect(result.metaNoindex).toBe(true);
    expect(result.metaNofollow).toBe(true);
  });
});

describe("parseRobotsDirectives", () => {
  it("normalizes comma and space separated directives", () => {
    expect(parseRobotsDirectives("NOINDEX, nofollow")).toEqual(new Set(["noindex", "nofollow"]));
  });
});
