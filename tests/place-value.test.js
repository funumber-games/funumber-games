import { createRequire } from "node:module";
import { expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { towerValue, towerSpeech, towerCounts, matchesNumber, makeSwapChallenge, createSpeechQueue } = require("../docs/place-value/game-logic.js");

it("builds the Difficult-mode towers and checks the typed number, including zeros", () => {
  expect(towerCounts(406)).toEqual({ hundreds: 4, tens: 0, ones: 6 });
  expect(matchesNumber("406", 406)).toBe(true);
  expect(matchesNumber("460", 406)).toBe(false);
  expect(matchesNumber("46", 406)).toBe(false);
  expect(matchesNumber("0406", 406)).toBe(false);
  expect(matchesNumber("4e2", 400)).toBe(false);
});

it("waits for each announcement before speaking the next or advancing", async () => {
  const synthesis = { speak: vi.fn(), cancel: vi.fn() };
  const narration = createSpeechQueue(synthesis, text => ({ text }));
  const advance = vi.fn();
  const first = narration.say("Tower value");
  const ending = narration.say("Round complete").then(advance);
  await Promise.resolve();
  expect(synthesis.speak).toHaveBeenCalledTimes(1);
  synthesis.speak.mock.calls[0][0].onend();
  await first;
  expect(synthesis.speak).toHaveBeenCalledTimes(2);
  expect(advance).not.toHaveBeenCalled();
  synthesis.speak.mock.calls[1][0].onend();
  await ending;
  expect(advance).toHaveBeenCalledOnce();
  expect(synthesis.cancel).not.toHaveBeenCalled();
});

it("drops pending announcements on reset", async () => {
  const synthesis = { speak: vi.fn(), cancel: vi.fn() };
  const narration = createSpeechQueue(synthesis, text => ({ text }));
  const active = narration.say("Old round");
  const queued = narration.say("Old ending");
  await Promise.resolve();
  narration.stop();
  await Promise.all([active, queued]);
  expect(synthesis.speak).toHaveBeenCalledTimes(1);
  expect(synthesis.cancel).toHaveBeenCalledOnce();
});

it("reads a multiplication sentence for each place", () => {
  expect(towerSpeech("hundreds", 3)).toBe("3 times 100 is 300.");
  expect(towerSpeech("tens", 5)).toBe("5 times 10 is 50.");
  expect(towerSpeech("ones", 4)).toBe("4 times 1 is 4.");
});

it("multiplies a chosen cube count by the tower's place value", () => {
  expect(towerValue("hundreds", 2)).toBe(200);
  expect(towerValue("tens", 2)).toBe(20);
  expect(towerValue("ones", 2)).toBe(2);
  expect(towerValue("tens", 0)).toBe(0);
});

it("reports the moved digit's original and new values", () => {
  expect(makeSwapChallenge(213)).toEqual({ answer: 123, left: 0, right: 1, digit: 2, from: 200, to: 20 });
});

it("skips equal digits and avoids leading zero", () => {
  expect(makeSwapChallenge(203)).toEqual({ answer: 230, left: 1, right: 2, digit: 0, from: 0, to: 0 });
  expect(makeSwapChallenge(221).answer).toBe(212);
  expect(makeSwapChallenge(222)).toBeNull();
  expect(makeSwapChallenge(200)).toBeNull();
});
