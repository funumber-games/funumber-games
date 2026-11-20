import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rules = require("../docs/word-wheels/game-logic.js");

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("Word Wheels modes", () => {
  it.each([
    ["simple", 6, 60, true],
    ["moderate", 8, 60, false],
    ["difficult", 9, 30, false]
  ])("sets %s to the expected board, timer, and hint rules", (mode, size, seconds, hint) => {
    expect(rules.DIFFICULTIES[mode]).toMatchObject({ size, seconds, hint });
  });
});

describe("Word Wheels puzzle generation", () => {
  it.each([[6, 17], [8, 29], [9, 53]])(
    "creates a board of size %i with exactly four complete word paths",
    (size, seed) => {
      const word = "CAT";
      const puzzle = rules.createPuzzle(word, size, seededRandom(seed));

      expect(puzzle).not.toBeNull();
      expect(puzzle.letters).toHaveLength(size * size);
      expect(puzzle.matches).toHaveLength(4);
      expect(rules.findMatches(puzzle.letters, word, size)).toHaveLength(4);
      puzzle.matches.forEach(path => {
        expect(path.map(index => puzzle.letters[index]).join("")).toBe(word);
      });
    }
  );

  it("rejects words or board sizes that cannot form a three-letter puzzle", () => {
    expect(rules.createPuzzle("TOOLONG", 6)).toBeNull();
    expect(rules.createPuzzle("CAT", 2)).toBeNull();
  });

  it("accepts horizontal, vertical, and diagonal selections, but rejects a bent path", () => {
    expect(rules.isStraightLinePath([0, 1, 2], 6)).toBe(true);
    expect(rules.isStraightLinePath([0, 6, 12], 6)).toBe(true);
    expect(rules.isStraightLinePath([0, 7, 14], 6)).toBe(true);
    expect(rules.isStraightLinePath([0, 1, 8], 6)).toBe(false);
  });

  it("uses the drag direction to help select the matching three-letter word", () => {
    const cells = Array(25).fill("").map(letter => ({ letter }));
    cells[10].letter = "C";
    cells[11].letter = "A";
    cells[12].letter = "T";

    expect(rules.findWordAlongDrag(cells, "CAT", 11, 50, 2, 5)).toEqual([10, 11, 12]);
    expect(rules.findWordAlongDrag(cells, "CAT", 11, -50, 1, 5)).toEqual([10, 11, 12]);
    expect(rules.findWordAlongDrag(cells, "CAT", 11, 0, 50, 5)).toBeNull();
  });

  it("recognizes a diagonal word even when the player starts on its middle letter", () => {
    const cells = Array(36).fill("").map(letter => ({ letter }));
    cells[14].letter = "C";
    cells[21].letter = "A";
    cells[28].letter = "T";

    expect(rules.findWordAlongDrag(cells, "CAT", 21, 40, 40, 6)).toEqual([14, 21, 28]);
  });
});

describe("Word Wheels scoring and timer", () => {
  it("reduces hidden tile values by one every three seconds to zero", () => {
    expect(rules.getCountdownValue(0)).toBe(10);
    expect(rules.getCountdownValue(2)).toBe(10);
    expect(rules.getCountdownValue(3)).toBe(9);
    expect(rules.getCountdownValue(29)).toBe(1);
    expect(rules.getCountdownValue(30)).toBe(0);
    expect(rules.getCountdownValue(60)).toBe(0);
  });

  it("adds the revealed tile values to the round total", () => {
    const cells = [{ value: 8 }, { value: 7 }, { value: 6 }, { value: 10 }];
    expect(rules.scorePath(cells, [0, 1, 2])).toBe(21);
    expect(rules.scorePath(cells, [3, 1, 0])).toBe(25);
  });
});

describe("Word Wheels round progression", () => {
  it("requires at least two words before a round can continue", () => {
    expect(rules.shouldContinueAfterTimeout(0)).toBe(false);
    expect(rules.shouldContinueAfterTimeout(1)).toBe(false);
    expect(rules.shouldContinueAfterTimeout(2)).toBe(true);
    expect(rules.shouldContinueAfterTimeout(4)).toBe(true);
  });

  it("continues before round ten, wins after round ten, and loses below the minimum", () => {
    expect(rules.getRoundCompletion(4, 2)).toBe("continue");
    expect(rules.getRoundCompletion(10, 2)).toBe("win");
    expect(rules.getRoundCompletion(10, 1)).toBe("loss");
  });

  it("uses a five-second success delay", () => {
    expect(rules.WIN_BANNER_DELAY_MS).toBe(5000);
  });
});
