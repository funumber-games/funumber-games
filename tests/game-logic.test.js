import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rules = require("../docs/game-logic.js");

describe("wheel selection", () => {
  it("maps the pointer to a number and wraps full turns", () => {
    expect(rules.getWheelNumber(0, 6)).toBe(1);
    expect(rules.getWheelNumber(-60, 6)).toBe(2);
    expect(rules.getWheelNumber(360 * 5, 9)).toBe(1);
  });
});

describe("number placement and matches", () => {
  it("allows only blank cells next to the same number in their block", () => {
    const board = [
      [2, null, null, 2, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null]
    ];
    expect(rules.canPlaceNumber(board, 0, 1, 2)).toBe(true);
    expect(rules.canPlaceNumber(board, 0, 2, 2)).toBe(false);
    expect(rules.canPlaceNumber(board, 0, 0, 2)).toBe(false);
    expect(rules.canPlaceNumber(board, 1, 1, 2)).toBe(false); // diagonal only
    expect(rules.canPlaceNumber(board, 1, 0, 2)).toBe(true); // vertical neighbor
    expect(rules.canPlaceNumber(board, 0, 3, 2)).toBe(false);
  });

  it("finds orthogonal matches only within one 3 by 3 block", () => {
    const board = [[3, 3, 3, 3], [null, 3, null, null], [null, null, null, null]];
    expect(rules.findConnectedGroup(board, 0, 1, 3).sort((a, b) => a.row - b.row || a.column - b.column)).toEqual([
      { row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }, { row: 1, column: 1 }
    ]);
  });

  it("auto-fills enough connected blank cells to complete a match", () => {
    const board = [[4, 4, null], [null, null, null], [null, null, null]];
    const autoFilled = rules.getAutoFillCells(board, 0, 1, 4);
    expect(autoFilled).toHaveLength(2);
    autoFilled.forEach(({ row, column }) => { board[row][column] = 4; });
    expect(rules.shouldClearGroup(rules.findConnectedGroup(board, 0, 1, 4).length, 4)).toBe(true);
  });

  it("does not partially auto-fill when there is not enough connected space", () => {
    const board = [[4, 4, null], [1, 2, 3], [5, 6, 1]];
    expect(rules.getAutoFillCells(board, 0, 1, 4)).toBeNull();
    // The helper never changes the board; the player's clicked cell remains the only new value.
    expect(board).toEqual([[4, 4, null], [1, 2, 3], [5, 6, 1]]);
  });

  it("returns no extra cells when the connected group already meets its size", () => {
    const board = [[2, 2, null], [null, null, null], [null, null, null]];
    expect(rules.getAutoFillCells(board, 0, 1, 2)).toEqual([]);
  });

  it.each([[4, 3, false], [4, 4, true], [5, 4, false], [5, 5, true]])(
    "clears number %i only when the group is large enough",
    (number, size, expected) => expect(rules.shouldClearGroup(size, number)).toBe(expected)
  );
});

describe("spin streak", () => {
  it("ends after all permitted spins have been used", () => {
    expect(rules.hasReachedSpinLimit(5, 6)).toBe(false);
    expect(rules.hasReachedSpinLimit(6, 6)).toBe(true);
    expect(rules.hasReachedSpinLimit(10, 10)).toBe(true);
  });

  it("resets the no-clear streak only after a match clears", () => {
    expect(rules.getNextSpinStreak(4, 0)).toBe(4);
    expect(rules.getNextSpinStreak(4, 3)).toBe(0);
  });
});

describe("two-wheel math game rules", () => {
  it("uses four operators in Simple and Moderate, and adds multiply and divide in Difficult", () => {
    expect(rules.getMathSpinOperations("simple")).toEqual(["+", "-", "<", ">"]);
    expect(rules.getMathSpinOperations("moderate")).toEqual(["+", "-", "<", ">"]);
    expect(rules.getMathSpinOperations("difficult")).toEqual(["+", "-", "<", ">", "*", "/"]);
    expect(rules.getMathSpinAnswerLimit("simple")).toBe(6);
    expect(rules.getMathSpinAnswerLimit("moderate")).toBe(6);
    expect(rules.getMathSpinAnswerLimit("difficult")).toBe(9);
  });

  it.each([
    ["+", 8, 9, 8],
    ["-", 3, 8, 5],
    ["<", 8, 3, 3],
    [">", 8, 3, 8],
    ["*", 9, 9, 9],
    ["/", 8, 2, 4]
  ])("calculates %s and reduces the answer to one digit", (operator, a, b, expected) => {
    expect(rules.calculateOperationResult(operator, a, b)).toBe(expected);
  });

  it("keeps zero as a digit and rejects a non-integer division", () => {
    expect(rules.calculateOperationResult("-", 4, 4)).toBe(0);
    expect(rules.calculateOperationResult("/", 7, 2)).toBeNull();
  });

  it("treats zero as an unplaceable result until a matching zero neighbor exists", () => {
    const board = [[1, null, null], [null, 2, null], [null, null, 3]];
    expect(rules.canPlaceNumber(board, 1, 0, 0)).toBe(false);
  });

  it("maps the two arrows to opposite divisions on the 10-section wheel", () => {
    const [first, second] = rules.getOppositeSectorIndices(0);
    expect(first).toBe(0);
    expect(second).toBe(5);
    expect(rules.getOppositeSectorIndices(36)).toEqual([9, 4]);
  });

  it("creates a division spin whose first arrow value divides evenly by the second", () => {
    for (let seed = 0; seed < 100; seed++) {
      let state = seed + 1;
      const random = () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
      };
      const { values, selectedIndices } = rules.createNumberWheelValues(seed * 13, "/", 9, random);
      expect(values).toHaveLength(10);
      expect(values[selectedIndices[0]] % values[selectedIndices[1]]).toBe(0);
    }
  });

  it.each(["+", "-", "<", ">", "*", "/"])(
    "keeps every %s answer within the selected mode range",
    (operator) => {
      for (const maxAnswer of [6, 9]) {
        for (let seed = 0; seed < 40; seed++) {
          let state = seed + maxAnswer * 101;
          const random = () => {
            state = (state * 16807) % 2147483647;
            return (state - 1) / 2147483646;
          };
          const { values, selectedIndices } = rules.createNumberWheelValues(seed * 17, operator, maxAnswer, random);
          const actualAnswer = rules.calculateOperationResult(operator, values[selectedIndices[0]], values[selectedIndices[1]]);
          expect(actualAnswer).toBeGreaterThanOrEqual(1);
          expect(actualAnswer).toBeLessThanOrEqual(maxAnswer);
        }
      }
    }
  );

  it("allows repeated legal table placements from one pair until a match clears", () => {
    const board = [[4, null, null], [null, null, null], [null, null, null]];
    const pairReady = true;
    for (const [row, column] of [[0, 1], [0, 2]]) {
      expect(rules.canPlaceFromCurrentSpin(pairReady, false, false, false)).toBe(true);
      expect(rules.canPlaceNumber(board, row, column, 4)).toBe(true);
      board[row][column] = 4;
      const group = rules.findConnectedGroup(board, row, column, 4);
      expect(rules.shouldClearGroup(group.length, 4)).toBe(false);
    }
    expect(rules.canPlaceFromCurrentSpin(pairReady, false, false, false)).toBe(true);
    expect(rules.canPlaceNumber(board, 1, 2, 4)).toBe(true);
    board[1][2] = 4;
    expect(rules.shouldClearGroup(rules.findConnectedGroup(board, 1, 2, 4).length, 4)).toBe(true);
  });

  it("starts the number wheel only after the sign wheel stops", () => {
    expect(rules.canSpinMathNumberWheel(true, true, true, false, false, false, false)).toBe(false);
    expect(rules.canSpinMathNumberWheel(true, true, false, false, false, false, false)).toBe(true);
    expect(rules.canSpinMathNumberWheel(false, true, false, false, false, false, false)).toBe(false);
    expect(rules.canSpinMathNumberWheel(true, true, false, false, true, false, false)).toBe(false);
  });
});
