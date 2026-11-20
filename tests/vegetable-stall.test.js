import { describe, expect, it } from "vitest";
import rules from "../docs/vegetable-stall/game-logic.js";

const fixedRng = value => () => value;

describe("Vegetable Stall game logic", () => {
  it("creates Simple orders with one kind and a quantity from 1 to 5", () => {
    const order = rules.makeOrder("simple", fixedRng(0.99));
    expect(order.parts).toHaveLength(1);
    expect(order.parts[0].quantity).toBeGreaterThanOrEqual(1);
    expect(order.parts[0].quantity).toBeLessThanOrEqual(5);
    expect(order.stockKinds).toEqual([order.parts[0].vegetableId]);
  });

  it("creates Moderate orders up to 9 with two or three visible kinds", () => {
    const order = rules.makeOrder("moderate", fixedRng(0.7));
    expect(order.parts).toHaveLength(1);
    expect(order.total).toBeLessThanOrEqual(9);
    expect(order.stockKinds).toHaveLength(3);
    expect(order.stockKinds).toContain(order.parts[0].vegetableId);
  });

  it("creates Difficult two-part orders with distinct vegetables and a total up to 9", () => {
    const order = rules.makeOrder("difficult", fixedRng(0.45));
    expect(order.parts).toHaveLength(2);
    expect(order.parts[0].vegetableId).not.toBe(order.parts[1].vegetableId);
    expect(order.total).toBeLessThanOrEqual(9);
    expect(order.total).toBeGreaterThanOrEqual(2);
  });

  it("accepts only the requested kind and never permits overfilling", () => {
    const order = {
      parts: [{ vegetableId: "carrot", quantity: 2 }],
      total: 2,
      stockKinds: ["carrot", "tomato"]
    };
    const packed = {};
    expect(rules.canAccept(order, packed, "tomato")).toBe(false);
    expect(rules.canAccept(order, packed, "carrot")).toBe(true);
    packed.carrot = 1;
    expect(rules.canAccept(order, packed, "carrot")).toBe(true);
    packed.carrot = 2;
    expect(rules.canAccept(order, packed, "carrot")).toBe(false);
    expect(rules.isComplete(order, packed)).toBe(true);
  });

  it("guides Difficult orders through the first group before the second", () => {
    const order = {
      parts: [
        { vegetableId: "carrot", quantity: 2 },
        { vegetableId: "tomato", quantity: 3 }
      ],
      total: 5,
      stockKinds: ["carrot", "tomato"]
    };
    const packed = { carrot: 1, tomato: 0 };
    expect(rules.activePart(order, packed).vegetableId).toBe("carrot");
    expect(rules.canAccept(order, packed, "tomato")).toBe(false);
    packed.carrot = 2;
    expect(rules.activePart(order, packed).vegetableId).toBe("tomato");
    expect(rules.canAccept(order, packed, "tomato")).toBe(true);
  });

  it("always supplies three unique numeral choices containing the answer", () => {
    for (let total = 1; total <= 9; total += 1) {
      const choices = rules.answerChoices(total, fixedRng(0.3));
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
      expect(choices).toContain(total);
    }
  });

  it("keeps a few extra requested vegetables in stock", () => {
    const order = {
      parts: [{ vegetableId: "pepper", quantity: 5 }],
      total: 5,
      stockKinds: ["pepper"]
    };
    expect(rules.stockCount(order, "pepper")).toBe(7);
  });
});
