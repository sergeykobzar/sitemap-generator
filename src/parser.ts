import * as cheerio from "cheerio";
import type { ParsedPage } from "./types.js";

export function parseHtml(html: string): ParsedPage {
  const $ = cheerio.load(html);
  const links = $("a[href]")
    .map((_, element) => $(element).attr("href"))
    .get()
    .filter((href): href is string => Boolean(href));

  const canonicalUrl = $("link[rel]")
    .filter((_, element) => {
      const rel = ($(element).attr("rel") ?? "").toLowerCase().split(/\s+/);
      return rel.includes("canonical");
    })
    .first()
    .attr("href");

  const robotsContents = $('meta[name="robots" i], meta[name="googlebot" i]')
    .map((_, element) => $(element).attr("content") ?? "")
    .get()
    .join(",");

  const directives = parseRobotsDirectives(robotsContents);

  return {
    links,
    canonicalUrl,
    metaNoindex: directives.has("noindex") || directives.has("none"),
    metaNofollow: directives.has("nofollow") || directives.has("none")
  };
}

export function parseRobotsDirectives(value: string | null | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .toLowerCase()
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

export function parseXRobotsTag(headers: Headers): { noindex: boolean; nofollow: boolean } {
  const directives = parseRobotsDirectives(headers.get("x-robots-tag"));
  return {
    noindex: directives.has("noindex") || directives.has("none"),
    nofollow: directives.has("nofollow") || directives.has("none")
  };
}
