import type { SitemapConfig } from "./types.js";

interface RuleGroup {
  agents: string[];
  rules: Array<{ type: "allow" | "disallow"; path: string }>;
  crawlDelayMs?: number;
}

export class RobotsTxt {
  private readonly groups: RuleGroup[];

  constructor(source: string) {
    this.groups = parseRobotsTxt(source);
  }

  isAllowed(url: string, userAgent: string): boolean {
    const pathname = new URL(url).pathname || "/";
    const rules = this.matchingGroups(userAgent).flatMap((group) => group.rules);
    let winner: { type: "allow" | "disallow"; length: number } | undefined;

    for (const rule of rules) {
      if (rule.path === "") continue;
      if (!pathname.startsWith(rule.path)) continue;
      if (!winner || rule.path.length > winner.length) {
        winner = { type: rule.type, length: rule.path.length };
      }
    }

    return winner?.type !== "disallow";
  }

  getCrawlDelayMs(userAgent: string): number | undefined {
    const delay = this.matchingGroups(userAgent).find((group) => group.crawlDelayMs !== undefined)
      ?.crawlDelayMs;
    return delay;
  }

  private matchingGroups(userAgent: string): RuleGroup[] {
    const agent = userAgent.toLowerCase();
    const exact = this.groups.filter((group) =>
      group.agents.some((candidate) => candidate !== "*" && agent.includes(candidate))
    );
    if (exact.length > 0) return exact;
    return this.groups.filter((group) => group.agents.includes("*"));
  }
}

export class RobotsManager {
  private readonly cache = new Map<string, Promise<RobotsTxt | undefined>>();

  constructor(private readonly config: SitemapConfig) {}

  async isAllowed(url: string): Promise<boolean> {
    if (!this.config.respectRobotsTxt) return true;
    const robots = await this.forUrl(url);
    return robots?.isAllowed(url, this.config.userAgent) ?? true;
  }

  async crawlDelayMs(url: string): Promise<number | undefined> {
    if (!this.config.respectRobotsTxt) return undefined;
    const robots = await this.forUrl(url);
    return robots?.getCrawlDelayMs(this.config.userAgent);
  }

  private forUrl(url: string): Promise<RobotsTxt | undefined> {
    const origin = new URL(url).origin;
    const existing = this.cache.get(origin);
    if (existing) return existing;

    const promise = fetch(`${origin}/robots.txt`, {
      headers: {
        "user-agent": this.config.userAgent,
        ...this.config.requestHeaders
      },
      signal: AbortSignal.timeout(this.config.timeoutMs)
    })
      .then(async (response) => {
        if (!response.ok) return undefined;
        return new RobotsTxt(await response.text());
      })
      .catch(() => undefined);

    this.cache.set(origin, promise);
    return promise;
  }
}

function parseRobotsTxt(source: string): RuleGroup[] {
  const groups: RuleGroup[] = [];
  let current: RuleGroup | undefined;
  let seenRule = false;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!current || seenRule) {
        current = { agents: [], rules: [] };
        groups.push(current);
        seenRule = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;
    if (field === "allow" || field === "disallow") {
      current.rules.push({ type: field, path: value });
      seenRule = true;
      continue;
    }

    if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) {
        current.crawlDelayMs = seconds * 1000;
      }
    }
  }

  return groups;
}
