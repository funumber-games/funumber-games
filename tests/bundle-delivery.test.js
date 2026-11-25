import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const logic = require("../docs/bundle-delivery/game-logic.js");

describe("Bundle Delivery game logic", () => {
  it("counts the pieces actually packed, including ten loose pencils", () => {
    expect(logic.countPackedPencils(1, 3)).toEqual([10, 11, 12, 13]);
    expect(logic.countPackedPencils(0, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(logic.countPackedPencils(0, 0)).toEqual([]);
  });

  it.each([
    [2, 2, "They are correct. Thank you Mr. Jones!"],
    [2, 1, "Add one more loose pencil."],
    [2, 4, "Take out 2 loose pencils."],
    [1, 2, "Add one more bundle."],
    [3, 2, "Take out one bundle."]
  ])("gives Lucy the right reply for %i bundles and %i loose pencils", (bundles, loose, reply) => {
    expect(logic.deliveryReply(22, bundles, loose)).toContain(reply);
  });

  it.each([
    [21, 2, 1],
    [34, 3, 4],
    [40, 4, 0],
    [62, 6, 2],
    [99, 9, 9]
  ])("splits %i into %i tens and %i ones", (order, tens, ones) => {
    expect(logic.digitsFor(order)).toEqual({ tens, ones });
    expect(logic.validatePacking(order, tens, ones)).toBe(true);
  });

  it("requires both compartments to match, not only the total", () => {
    expect(logic.packedValue(2, 14)).toBe(34);
    expect(logic.validatePacking(34, 2, 14)).toBe(false);
    expect(logic.validatePacking(34, 3, 4)).toBe(true);
  });

  it("gives a specific add or remove hint", () => {
    expect(logic.packingHint(34, 2, 4)).toBe("Add one more bundle.");
    expect(logic.packingHint(34, 4, 4)).toBe("Take out one bundle.");
    expect(logic.packingHint(34, 3, 2)).toBe("Add 2 more loose pencils.");
    expect(logic.packingHint(34, 3, 5)).toBe("Take out one loose pencil.");
  });

  it("regroups exactly ten ones into one ten without changing value", () => {
    const before = logic.packedValue(5, 10);
    const result = logic.bundleTen(5, 10);
    expect(result).toEqual({ bundles: 6, loose: 0, changed: true });
    expect(logic.packedValue(result.bundles, result.loose)).toBe(before);
    expect(logic.bundleTen(5, 9).changed).toBe(false);
  });

  it("creates the customer counting sequence", () => {
    expect(logic.countSequence(34)).toEqual([10, 20, 30, 31, 32, 33, 34]);
    expect(logic.countSequence(40)).toEqual([10, 20, 30, 40]);
  });

  it("keeps generated orders inside each mode range", () => {
    expect(logic.makeOrder("simple", () => 0)).toBe(21);
    expect(logic.makeOrder("simple", () => 0.999999)).toBe(49);
    expect(logic.makeOrder("moderate", () => 0)).toBe(21);
    expect(logic.makeOrder("moderate", () => 0.999999)).toBe(99);
    expect(logic.makeOrder("difficult", () => 0.999999)).toBe(99);
  });

  it("can start difficult orders with a value-preserving regroup", () => {
    expect(logic.initialPacking("difficult", 62, () => 0)).toEqual({ bundles: 5, loose: 10, regroup: true });
  });
});
