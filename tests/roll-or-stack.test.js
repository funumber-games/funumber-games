import { describe, expect, it } from "vitest";
import rules from "../docs/roll-or-stack/game-logic.js";

describe("Roll or Stack game logic", () => {
  it("provides the correct cumulative toy count for every mode", () => {
    expect(rules.getObjects("simple")).toHaveLength(6);
    expect(rules.getObjects("moderate")).toHaveLength(13);
    expect(rules.getObjects("difficult")).toHaveLength(20);
  });

  it("defines a deterministic result for every station and orientation", () => {
    expect(rules.validateObjects()).toBe(true);
    const ids = rules.OBJECTS.map(object => object.id);
    expect(new Set(ids).size).toBe(ids.length);
    rules.OBJECTS.forEach(object => object.orientations.forEach((_, index) => {
      ["roll", "stack"].forEach(station => {
        const first = rules.getOutcome(object, index, station);
        const second = rules.getOutcome(object, index, station);
        expect(first).toEqual(second);
        expect(first.message.length).toBeGreaterThan(5);
      });
    }));
  });

  it("starts Simple mode with the two demonstration toys", () => {
    const deck = rules.createDeck("simple", () => 0.5);
    expect(deck.map(toy => toy.id).slice(0, 2)).toEqual(["beach-ball", "wooden-cube"]);
    expect(new Set(deck.map(toy => toy.id)).size).toBe(6);
  });

  it("offers Turn only for supported modes and objects", () => {
    const can = rules.OBJECTS.find(object => object.id === "soup-can");
    const ball = rules.OBJECTS.find(object => object.id === "beach-ball");
    expect(rules.supportsTurn("simple", can)).toBe(false);
    expect(rules.supportsTurn("moderate", can)).toBe(true);
    expect(rules.supportsTurn("difficult", can)).toBe(true);
    expect(rules.supportsTurn("difficult", ball)).toBe(false);
    expect(rules.nextOrientation("moderate", can, 0)).toBe(1);
    expect(rules.nextOrientation("moderate", can, 1)).toBe(0);
  });

  it("maps every result to one of the prediction choices", () => {
    rules.OBJECTS.forEach(object => object.orientations.forEach((_, index) => {
      ["roll", "stack"].forEach(station => {
        const outcome = rules.getOutcome(object, index, station);
        expect(rules.predictionOptions(station)).toContain(rules.predictionFor(outcome, station));
      });
    }));
  });
});
