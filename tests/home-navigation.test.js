import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const homePath = resolve(projectRoot, "docs/index.html");
const homeMarkup = readFileSync(homePath, "utf8");

describe("home page game navigation", () => {
  it("links Word Wheels to its playable page", () => {
    expect(homeMarkup).toContain('href="./word-wheels/index.html"');
    expect(existsSync(resolve(projectRoot, "docs/word-wheels/index.html"))).toBe(true);
  });

  it("links Roll or Stack to its playable page", () => {
    expect(homeMarkup).toContain('href="roll-or-stack/index.html"');
    expect(existsSync(resolve(projectRoot, "docs/roll-or-stack/index.html"))).toBe(true);
  });

  it("links Vegetable Stall to its playable page", () => {
    expect(homeMarkup).toContain('href="vegetable-stall/index.html"');
    expect(existsSync(resolve(projectRoot, "docs/vegetable-stall/index.html"))).toBe(true);
  });

  it("links Bundle Delivery to its playable page", () => {
    expect(homeMarkup).toContain('href="bundle-delivery/index.html"');
    expect(existsSync(resolve(projectRoot, "docs/bundle-delivery/index.html"))).toBe(true);
  });

  it("keeps every local game launch destination available", () => {
    const hrefs = [...homeMarkup.matchAll(/class="[^"]*game-launch[^"]*"[^>]*href="([^"]+)"/g)]
      .map(match => match[1]);

    expect(hrefs.length).toBeGreaterThan(0);
    hrefs.forEach(href => {
      expect(existsSync(resolve(projectRoot, "docs", href))).toBe(true);
    });
  });
});
