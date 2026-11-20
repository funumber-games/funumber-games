import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../docs/memory-box/index.html", import.meta.url), "utf8");
const rulesScript = html.match(/<script id="memory-box-rules">([\s\S]*?)<\/script>/)?.[1];
if (!rulesScript) throw new Error("Could not find the inline Memory Box rules module.");
const browserContext = { window: {} };
runInNewContext(rulesScript, browserContext);
const rules = browserContext.window.MemoryBoxRules;

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("Memory Box setup", () => {
  it.each([["easy", 4], ["moderate", 6], ["difficult", 9]])(
    "%s mode creates %i unique pairs",
    (mode, count) => {
      const pairs = rules.createRound(mode, seededRandom(91));
      expect(pairs).toHaveLength(count);
      expect(new Set(pairs.map(pair => pair.id)).size).toBe(count);
      expect(new Set(pairs.map(pair => pair.number)).size).toBe(count);
      expect(new Set(pairs.map(pair => pair.originalIndex))).toEqual(new Set(Array.from({ length: count }, (_, index) => index)));
      pairs.forEach(pair => {
        expect(pair.number).toBeGreaterThanOrEqual(1);
        expect(pair.number).toBeLessThanOrEqual(9);
        expect(rules.EMOJIS).toContain(pair.emoji);
      });
    }
  );

  it("rejects an unknown mode", () => {
    expect(rules.createRound("impossible")).toBeNull();
  });

  it("spins only to a pair that has not been removed", () => {
    const pairs = rules.createRound("easy", seededRandom(4));
    const removed = new Set([pairs[0].id, pairs[1].id, pairs[2].id]);
    expect(rules.chooseTarget(pairs, removed, () => 0)?.id).toBe(pairs[3].id);
    expect(rules.chooseTarget(pairs, new Set(pairs.map(pair => pair.id)))).toBeNull();
  });

  it("places each wheel label at its section center and rotates that section to the top pointer", () => {
    const first = rules.getSegmentGeometry(0, 6);
    const fourth = rules.getSegmentGeometry(3, 6);
    expect(first.angle).toBe(30);
    expect(first.x).toBeCloseTo(0.5);
    expect(first.y).toBeCloseTo(-Math.sqrt(3) / 2);
    expect((first.angle + first.rotation) % 360).toBe(0);
    expect((fourth.angle + fourth.rotation) % 360).toBe(0);
    expect(rules.getSegmentGeometry(-1, 6)).toBeNull();
  });

  it("uses the same section color palette as the other game wheels", () => {
    expect(rules.PALETTE).toEqual([
      "#ed2d2d", "#eab127", "#838007", "#0ec50e", "#36abf6",
      "#7344ea", "#ec61e3", "#56eaa9", "#f1ab57"
    ]);
  });
});

describe("Memory Box matching and endings", () => {
  const pairs = rules.createRound("easy", seededRandom(12));

  it("accepts the original square and returns its wheel pair for removal", () => {
    const target = pairs[1];
    expect(rules.checkGuess(pairs, target.id, target.originalIndex, 2)).toEqual({
      correct: true,
      misses: 2,
      lost: false,
      reminderIndex: target.originalIndex,
      removedId: target.id
    });
  });

  it("counts a wrong square and identifies the hidden square as a reminder", () => {
    const target = pairs[0];
    const wrongIndex = (target.originalIndex + 1) % pairs.length;
    expect(rules.checkGuess(pairs, target.id, wrongIndex, 1)).toEqual({
      correct: false,
      misses: 2,
      lost: false,
      reminderIndex: target.originalIndex
    });
  });

  it("loses after as many wrong picks as the original wheel has pairs", () => {
    const target = pairs[0];
    const wrongIndex = (target.originalIndex + 1) % pairs.length;
    const result = rules.checkGuess(pairs, target.id, wrongIndex, pairs.length - 1);
    expect(result.lost).toBe(true);
    expect(rules.getOutcome(2, result.misses, pairs.length)).toBe("loss");
  });

  it("wins when only one pair remains on the wheel", () => {
    expect(rules.getOutcome(1, 0, 4)).toBe("win");
    expect(rules.getOutcome(2, 0, 4)).toBe("continue");
  });
});
