(function attachSkippingFrogLogic(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkippingFrogLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSkippingFrogLogic() {
  "use strict";

  const MAX_STONE = 220;
  const MAX_ERRORS = 3;
  const MODES = Object.freeze({
    simple: Object.freeze({ name: "Simple", jumps: 12, skips: Object.freeze([2, 3, 4]) }),
    moderate: Object.freeze({ name: "Moderate", jumps: 15, skips: Object.freeze([2, 3, 4, 5, 10]) }),
    difficult: Object.freeze({ name: "Difficult", jumps: 20, skips: Object.freeze([2, 3, 4, 5, 7, 9, 10, 11]) })
  });

  function getMode(mode) {
    const config = MODES[mode];
    if (!config) throw new RangeError(`Unknown game mode: ${mode}`);
    return config;
  }

  function expectedStone(currentStone, skip) {
    return currentStone + skip;
  }

  function isCorrectStone(currentStone, skip, selectedStone) {
    return selectedStone === expectedStone(currentStone, skip);
  }

  function isRoundComplete(mode, jumps, nextStone) {
    return jumps >= getMode(mode).jumps || nextStone > MAX_STONE;
  }

  function mistakesRemaining(errors) {
    return Math.max(0, MAX_ERRORS - errors);
  }

  return Object.freeze({
    MAX_STONE,
    MAX_ERRORS,
    MODES,
    getMode,
    expectedStone,
    isCorrectStone,
    isRoundComplete,
    mistakesRemaining
  });
});
