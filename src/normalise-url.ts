import type { NormaliseOptions } from "./types.js";

export function normaliseUrl(
  input: string,
  baseUrl: string | undefined,
  options: NormaliseOptions
): string | undefined {
  let url: URL;
  try {
    url = baseUrl ? new URL(input, baseUrl) : new URL(input);
  } catch {
    return undefined;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return undefined;
  }

  url.hash = "";
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  if (!options.includeQueryParameters) {
    url.search = "";
  } else {
    for (const parameter of options.stripQueryParameters) {
      url.searchParams.delete(parameter);
    }
    url.searchParams.sort();
  }

  url.pathname = collapseDuplicateSlashes(url.pathname);
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    return allowedDomains.includes(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function collapseDuplicateSlashes(pathname: string): string {
  return pathname.replace(/\/{2,}/g, "/");
}
