import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const homePath = resolve(projectRoot, "docs/index.html");
const homeMarkup = readFileSync(homePath, "utf8");
const homeStyles = readFileSync(resolve(projectRoot, "docs/site.css"), "utf8");

describe("home page game navigation", () => {
  it("includes a concise search description and learning-skills summary", () => {
    expect(homeMarkup).toContain("Free Maths Games for Kids | FuNumber Games");
    expect(homeMarkup).toContain("Big smiles.<br><span>Bigger learning.</span>");
    expect(homeMarkup).toContain('id="skills-title"');
    expect(homeMarkup).toContain("Counting &amp; number recognition");
    expect(homeMarkup).toContain("Addition, subtraction &amp; mental maths");
    expect(homeMarkup.indexOf("New games are on the way!")).toBeLessThan(homeMarkup.indexOf('id="skills-title"'));
  });

  it("visually separates the closing skills section from the new-games banner", () => {
    expect(homeStyles).toContain(".home-page .skills-section::before");
    expect(homeStyles).toContain("margin:38px auto 18px");
  });

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

  it("makes every game tile one link to a playable page", () => {
    const tiles = [...homeMarkup.matchAll(/<a class="game-list-card[^"]*" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    expect(tiles).toHaveLength(15);
    expect(homeMarkup).not.toContain("game-launch");
    tiles.forEach(([, href, content]) => {
      expect(content).toContain("<h3>");
      expect(content).not.toMatch(/<a\b|<button\b|Let’s Go!/);
      expect(existsSync(resolve(projectRoot, "docs", href))).toBe(true);
    });
  });
});
