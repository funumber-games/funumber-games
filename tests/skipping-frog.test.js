import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gameDir = resolve(projectRoot, "docs/skipping-frog");
const logic = require(resolve(gameDir, "game-logic.js"));
const html = readFileSync(resolve(gameDir, "index.html"), "utf8");

describe("Skipping Frog rules", () => {
  it("defines the intended progression for every mode", () => {
    expect(logic.MODES.simple).toMatchObject({ jumps: 12, skips: [2, 3, 4] });
    expect(logic.MODES.moderate).toMatchObject({ jumps: 15, skips: [2, 3, 4, 5, 10] });
    expect(logic.MODES.difficult).toMatchObject({ jumps: 20, skips: [2, 3, 4, 5, 7, 9, 10, 11] });
  });

  it("rejects unknown modes instead of silently using invalid rules", () => {
    expect(() => logic.getMode("expert")).toThrow(RangeError);
  });

  it("accepts only the next skip-counting stone", () => {
    expect(logic.expectedStone(18, 3)).toBe(21);
    expect(logic.isCorrectStone(18, 3, 21)).toBe(true);
    expect(logic.isCorrectStone(18, 3, 20)).toBe(false);
  });

  it("finishes at the mode jump target or before exceeding the final stone", () => {
    expect(logic.isRoundComplete("simple", 12, 24)).toBe(true);
    expect(logic.isRoundComplete("simple", 11, 24)).toBe(false);
    expect(logic.isRoundComplete("difficult", 5, 221)).toBe(true);
  });

  it("never reports a negative number of remaining mistakes", () => {
    expect(logic.mistakesRemaining(0)).toBe(3);
    expect(logic.mistakesRemaining(2)).toBe(1);
    expect(logic.mistakesRemaining(4)).toBe(0);
  });
});

describe("Skipping Frog page integration", () => {
  it("loads game logic and artwork from local project files", () => {
    expect(html).toContain('<script src="game-logic.js"></script>');
    expect(html).toContain('loadImage("river-hop-scene.png")');
    expect(html).toContain('loadImage("river-hop-water.png")');
    expect(html).toContain('loadImage("river-hop-frog.png")');
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("keeps the mobile wheel above the river instead of over the stones", () => {
    expect(html).toMatch(/@media\(max-width:760px\)[^{]*\{[\s\S]*?\.river-wrap\{[^}]*margin-top:132px[^}]*overflow:visible/);
    expect(html).toMatch(/\.river-wheel\{[^}]*bottom:calc\(100% \+ 8px\)[^}]*left:50%/);
  });

  it("exposes touch-friendly canvas interaction and accessible controls", () => {
    expect(html).toContain("touch-action:manipulation");
    expect(html).toContain('aria-label="A river path with stepping stones numbered from 0 to 220"');
    expect(html).toContain('type="button">SPIN</button>');
  });
});
