import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const rules = require("../docs/find-the-kitten/game-logic.js");

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("Find the Kitten scene content", () => {
  it("contains all eight requested themes with a zero location and digits 1–9", () => {
    expect(Object.keys(rules.SCENES)).toHaveLength(8);
    Object.values(rules.SCENES).forEach(scene => {
      expect(scene.locations).toHaveLength(10);
      expect(scene.image).toMatch(/^scenes\/.+\.png$/);
      expect(scene.locations[0].clue.toLowerCase()).toContain("empty");
    });
  });

  it("keeps every tap target inside the responsive scene and uses a spatial word", () => {
    rules.validateScenes().forEach(result => expect(result.valid, result.id).toBe(true));
  });

  it("places every spatial answer on the side described by its clue", () => {
    Object.entries(rules.SCENES).forEach(([sceneId, scene]) => {
      scene.locations.forEach((location, digit) => {
        expect(
          rules.validateSpatialRelation(location),
          `${sceneId} digit ${digit}: ${location.clue}`
        ).toBe(true);
      });
    });
  });

  it("keeps known problem clues beside or below the referenced object", () => {
    const greenMaraca = rules.SCENES.music.locations[3];
    const redRug = rules.SCENES.music.locations[8];
    const rightRock = rules.SCENES.zoo.locations[7];

    expect(greenMaraca.x).toBeGreaterThan(greenMaraca.anchorX);
    expect(redRug.y).toBeGreaterThan(redRug.anchorY);
    expect(rightRock.x).toBeGreaterThan(rightRock.anchorX);
  });
});

describe("progressive kitten reveal", () => {
  it("finds a kitten position that does not overlap any number in every scene", () => {
    Object.values(rules.SCENES).forEach(scene => {
      const name = rules.findSafeKittenPlacement(scene);
      const placement = rules.KITTEN_PLACEMENTS.find(candidate => candidate.name === name);
      expect(placement).toBeDefined();
      scene.locations.forEach(location => expect(rules.overlapsLocation(placement, location)).toBe(false));
    });
  });

  it("reveals the exact percentage of the kitten as numbers are found", () => {
    const html = readFileSync(new URL("../docs/find-the-kitten/index.html", import.meta.url), "utf8");
    expect(html).toContain("Math.round(state.found.size / state.round.length * 100)");
    expect(html).toContain('kittenPeek.style.setProperty("--kitten-progress", `${progress}%`)');
    expect(html).toContain('kittenPeek.classList.toggle("complete", progress === 100)');
    expect(html).toContain("clip-path:inset(calc(100% - var(--kitten-progress)) 0 0)");
  });
});

describe("voice commentary sequencing", () => {
  it("waits for both the commentary and the visual delay before announcing the next clue", () => {
    const html = readFileSync(new URL("../docs/find-the-kitten/index.html", import.meta.url), "utf8");
    expect(html).toContain("let speechFinished = false");
    expect(html).toContain("let minimumDelayFinished = false");
    expect(html).toContain("if (advanced || !speechFinished || !minimumDelayFinished) return");
    expect(html).toContain("speak(state.turn.announcement, () =>");
    expect(html).toContain("state && !state.locked && speak");
  });
});

describe("Find the Kitten modes", () => {
  it.each([
    ["simple", 6, [1, 2, 3, 4, 5]],
    ["moderate", 10, [1, 2, 3, 4, 5, 6, 7, 8, 9]],
    ["difficult", 10, [1, 2, 3, 4, 5, 6, 7, 8, 9]]
  ])("builds %s mode with the welcome zero round", (mode, length, digits) => {
    const round = rules.createRound("circus", mode, seededRandom(22));
    expect(round).toHaveLength(length);
    expect(round[0]).toBe(0);
    expect(new Set(round.slice(1))).toEqual(new Set(digits));
  });

  it("shows all ten subtle number locations in Simple mode", () => {
    const turn = rules.createTurn("music", "simple", 3);
    expect(rules.MODES.simple.visible).toBe(true);
    expect(turn.digit).toBe(3);
    expect(turn.expected).toEqual([3]);
    expect(turn.clues[0]).toContain("Find 3");
  });

  it("uses smaller borderless digits 0–5 only for Simple mode in every scene", () => {
    const html = readFileSync(new URL("../docs/find-the-kitten/index.html", import.meta.url), "utf8");
    expect(html).toContain('hotspotLayer.classList.toggle("easy-visible-digits", state.mode === "simple")');
    expect(html).toContain('if (state.mode === "simple" && index <= 5) marker.classList.add("easy-visible")');
    expect(html).toMatch(/easy-visible-digits \.scene-digit\.easy-visible \{[^}]*width:auto;[^}]*border:0;[^}]*background:transparent;/);
  });

  it("clearly highlights a visible Simple-mode number after it is found", () => {
    const html = readFileSync(new URL("../docs/find-the-kitten/index.html", import.meta.url), "utf8");
    expect(html).toContain(".scene-digit.easy-visible.found");
    expect(html).toContain("scale(1.32)");
    expect(html).toContain("0 0 5px #16b88a");
  });

  it("uses one location-only clue in Moderate mode", () => {
    const turn = rules.createTurn("kitchen", "moderate", 1);
    expect(turn.expected).toEqual([1]);
    expect(turn.clues).toHaveLength(1);
    expect(turn.clues[0]).toMatch(/blue bowl/i);
  });

  it("uses the visible empty container for the zero welcome clue", () => {
    const circusZero = rules.createTurn("circus", "simple", 0);
    const kitchenZero = rules.createTurn("kitchen", "simple", 0);
    expect(circusZero.clues[0]).toMatch(/empty chest/i);
    expect(kitchenZero.clues[0]).toMatch(/empty basket/i);
    expect(circusZero.announcement).toBe("0");
  });

  it("requires both Difficult taps in order", () => {
    const turn = rules.createTurn("zoo", "difficult", 4);
    expect(turn.expected).toHaveLength(2);
    const wrongOrder = rules.checkTap(turn, 0, turn.targetIndex);
    expect(wrongOrder.correct).toBe(false);
    expect(wrongOrder.nextStep).toBe(0);
    const first = rules.checkTap(turn, 0, turn.expected[0]);
    expect(first).toEqual({ correct: true, complete: false, nextStep: 1 });
    const second = rules.checkTap(turn, 1, turn.expected[1]);
    expect(second).toEqual({ correct: true, complete: true, nextStep: 2 });
  });

  it("always gives Difficult mode two different locations and two different clues", () => {
    Object.keys(rules.SCENES).forEach(theme => {
      rules.MODES.difficult.digits.forEach(digit => {
        const turn = rules.createTurn(theme, "difficult", digit);
        expect(new Set(turn.expected).size, `${theme} digit ${digit}`).toBe(2);
        expect(turn.clues[0], `${theme} digit ${digit}`).not.toBe(turn.clues[1]);
      });
    });
  });

  it("provides the remaining locations for the Reveal override", () => {
    const turn = rules.createTurn("zoo", "difficult", 7);
    expect(rules.getRevealSequence(turn, 0)).toEqual(turn.expected);
    expect(rules.getRevealSequence(turn, 1)).toEqual([turn.targetIndex]);
  });
});

describe("all theme and mode combinations", () => {
  it.each(Object.keys(rules.SCENES).flatMap(theme => Object.keys(rules.MODES).map(mode => [theme, mode]))) (
    "%s works in %s mode",
    (theme, mode) => {
      const round = rules.createRound(theme, mode, seededRandom(7));
      expect(round).not.toBeNull();
      round.forEach(digit => {
        const turn = rules.createTurn(theme, mode, digit);
        expect(turn).not.toBeNull();
        expect(turn.targetIndex).toBe(digit);
        expect(turn.expected.at(-1)).toBe(digit);
        expect(rules.checkTap(turn, turn.expected.length - 1, digit).complete).toBe(true);
      });
    }
  );
});
