import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createContext, runInContext } from "node:vm";
import { afterEach, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const GameRules = require("../docs/game-logic.js");
const script = readFileSync(new URL("../docs/equation/equation-game.js", import.meta.url), "utf8");

function gameWithBoard(numbers) {
  vi.useFakeTimers();
  const elements = new Map();
  const effects = [];
  const spoken = [];
  function element() {
    const classes = new Set(["hidden"]);
    return {
      textContent: "",
      classList: {
        add: name => classes.add(name),
        contains: name => classes.has(name),
        remove: name => classes.delete(name),
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
      },
      style: { setProperty(name, value) { this[name] = value; } },
      addEventListener(name, listener) { this[name] = listener; },
      setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 40, height: 40 }),
      querySelectorAll: () => [],
      replaceChildren() {},
      remove() {}
    };
  }
  const get = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const rows = Array.from({ length: 3 }, (_, rowIndex) => ({
    rowIndex,
    cells: Array.from({ length: 3 }, (_, cellIndex) => ({
      ...element(), cellIndex, textContent: numbers[rowIndex * 3 + cellIndex] || ""
    }))
  }));
  rows.forEach(row => row.cells.forEach(cell => {
    cell.parentElement = row;
    cell.style.backgroundColor = "rgb(10, 20, 30)";
  }));
  get("grid").rows = rows;
  get("grid").querySelectorAll = () => rows.flatMap(row => row.cells);
  const speechSynthesis = { cancel() {}, speak(line) { spoken.push(line); } };
  const context = createContext({
    GameRules, setTimeout, clearTimeout,
    document: {
      getElementById: get, querySelector: () => null, createElement: element,
      body: { appendChild: effect => effects.push(effect) }
    },
    window: { speechSynthesis, setTimeout },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } }
  });
  const run = code => runInContext(code, context);
  run(script);
  run('currentMode = "simple"; answer = 1; pairComplete = true;');
  return {
    get, effects, spoken, run,
    match: column => get("grid").click({ target: { closest: () => rows[1].cells[column] } })
  };
}

afterEach(() => vi.useRealTimers());

it("gives the player five seconds to solve an equation before saying Spin Again", async () => {
  const game = gameWithBoard(["1", "2", "3", "4"]);
  game.run('scheduleAnswerReminder(() => missedSpinMessage(getBoard(), 4))');
  await vi.advanceTimersByTimeAsync(4999);
  expect(game.spoken).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(game.spoken.map(line => line.text)).toEqual(["Spin Again"]);
});

it("offers the solution after five seconds and skips the reminder after a table tap", async () => {
  const game = gameWithBoard(["1", "", "2"]);
  game.run("scheduleAnswerReminder()");
  await vi.advanceTimersByTimeAsync(4999);
  expect(game.spoken).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(game.spoken.map(line => line.text)).toEqual(["Check out the solution."]);
  game.run("scheduleAnswerReminder()");
  game.match(0);
  await vi.advanceTimersByTimeAsync(5000);
  expect(game.spoken.map(line => line.text)).toEqual(["Check out the solution."]);
});

it("keeps playing with one number left and celebrates the third match", async () => {
  const game = gameWithBoard(["1", "", "2"]);
  game.run("matchesSinceLastSpin = 2;");
  game.match(0);
  await vi.advanceTimersByTimeAsync(500);
  expect(game.spoken.map(line => line.text)).toEqual(["Nice Job!"]);
  expect(game.effects.filter(effect => effect.className === "block-confetti")).toHaveLength(0);
  expect(game.get("gameOver").classList.contains("hidden")).toBe(true);
  game.get("operatorSpin").click();
  expect(game.run("matchesSinceLastSpin")).toBe(0);
});

it("uses the cleared block colour and waits for its announcement before winning", async () => {
  const game = gameWithBoard(["1"]);
  game.run("matchesSinceLastSpin = 4;");
  game.match(0);
  await vi.advanceTimersByTimeAsync(500);
  expect(game.spoken[0].text).toBe("Nice Job! Good Spot!! Very Nice!!");
  const particles = game.effects.filter(effect => effect.className === "block-confetti");
  expect(particles).toHaveLength(28);
  expect(particles.every(effect => effect.style["--confetti-color"] === "rgb(10, 20, 30)")).toBe(true);
  await vi.advanceTimersByTimeAsync(GameRules.getCelebrationTimings().finalDelayMs);
  expect(game.get("gameOver").classList.contains("hidden")).toBe(true);
  game.spoken[0].onend();
  await vi.advanceTimersByTimeAsync(0);
  expect(game.get("gameOver").classList.contains("hidden")).toBe(false);
  expect(game.spoken.at(-1).text).toBe("Congratulations! You completed Maths Spin.");
});

it("announces late-game choices once and gives the two-spin warning", () => {
  const game = gameWithBoard(["1"]);
  expect(game.run('missedSpinMessage([["1","2","4"]], 4)')).toBe("You need one of these numbers: 1, 2 or 4. Spin again.");
  expect(game.run('missedSpinMessage([["1","2","4"]], 3)')).toBe("Spin Again");
  expect(game.run('missedSpinMessage([["1","2","4"]], 2)')).toBe("2 spins left. Good luck!");
});
