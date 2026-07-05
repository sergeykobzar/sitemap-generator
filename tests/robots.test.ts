import { describe, expect, it } from "vitest";
import { RobotsTxt } from "../src/robots.js";

describe("RobotsTxt", () => {
  it("blocks disallowed paths", () => {
    const robots = new RobotsTxt(`
      User-agent: *
      Disallow: /private
    `);

    expect(robots.isAllowed("https://example.com/private/page", "bot")).toBe(false);
    expect(robots.isAllowed("https://example.com/public", "bot")).toBe(true);
  });

  it("uses the longest matching allow rule", () => {
    const robots = new RobotsTxt(`
      User-agent: *
      Disallow: /docs
      Allow: /docs/public
    `);

    expect(robots.isAllowed("https://example.com/docs/private", "bot")).toBe(false);
    expect(robots.isAllowed("https://example.com/docs/public/intro", "bot")).toBe(true);
  });
});
