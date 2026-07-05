import { describe, expect, it } from "vitest";
import { normaliseUrl } from "../src/normalise-url.js";

const options = {
  includeQueryParameters: true,
  stripQueryParameters: ["utm_source", "fbclid"]
};

describe("normaliseUrl", () => {
  it("resolves relative URLs and removes fragments", () => {
    expect(normaliseUrl("/about#team", "https://Example.com/path/", options)).toBe(
      "https://example.com/about"
    );
  });

  it("collapses duplicate and trailing path slashes", () => {
    expect(normaliseUrl("https://example.com//docs///", undefined, options)).toBe(
      "https://example.com/docs"
    );
  });

  it("strips configured query parameters and sorts remaining parameters", () => {
    expect(
      normaliseUrl("https://example.com/?z=1&utm_source=x&a=2&fbclid=abc", undefined, options)
    ).toBe("https://example.com/?a=2&z=1");
  });

  it("removes all query parameters when disabled", () => {
    expect(
      normaliseUrl("https://example.com/?a=1", undefined, {
        includeQueryParameters: false,
        stripQueryParameters: []
      })
    ).toBe("https://example.com/");
  });
});
