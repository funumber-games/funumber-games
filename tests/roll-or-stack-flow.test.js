import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rules from "../docs/roll-or-stack/game-logic.js";

const gameDirectory = new URL("../docs/roll-or-stack/", import.meta.url);
const script = readFileSync(new URL("roll-or-stack.js", gameDirectory), "utf8");

function element() {
  const node = {
    className: "",
    style: { setProperty: vi.fn(), removeProperty: vi.fn() },
    addEventListener: (event, callback) => { node[event] = callback; },
    getBoundingClientRect: () => ({ left: 460, bottom: 280, width: 80, height: 60 }),
  };
  node.classList = {
    contains: name => node.className.split(" ").includes(name),
    toggle(name, enabled) {
      const names = new Set(node.className.split(" ").filter(Boolean));
      if (enabled) names.add(name);
      else names.delete(name);
      node.className = [...names].join(" ");
    },
    add: name => node.classList.toggle(name, true),
    remove: name => node.classList.toggle(name, false),
  };
  return node;
}

function loadGame(toy, { reducedMotion = false, mode = "moderate" } = {}) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  get("orientationText").parentElement = element();
  const stage = get("circusStage");
  stage.getBoundingClientRect = () => ({ left: 0, top: 0 });
  Object.assign(stage, { clientLeft: 0, clientTop: 0, clientWidth: 1000, clientHeight: 500 });
  const flying = get("flyingToy");
  let finish;
  let cancel;
  const animation = {
    cancel: vi.fn(() => cancel()),
  };
  flying.animate = vi.fn(() => {
    animation.finished = new Promise((resolve, reject) => {
      finish = resolve;
      cancel = reject;
    });
    return animation;
  });
  flying.getAnimations = () => animation.finished ? [animation] : [];

  runInNewContext(script, {
    document: {
      getElementById: get,
      querySelector: () => ({ value: mode }),
      addEventListener: vi.fn(),
    },
    RollOrStackRules: { ...rules, createDeck: () => [toy] },
    matchMedia: () => ({ matches: reducedMotion }),
    window: {},
    setTimeout,
  });
  get("startButton").click();
  return { get, flying, animation, finish: () => finish() };
}

describe("Roll or Stack toy artwork", () => {
  const poses = rules.OBJECTS.flatMap(toy => toy.orientations.map(orientation =>
    toy.orientations.length > 1 ? `${toy.id}-${orientation.id}` : toy.id,
  ));

  it.each(poses)("ships a readable PNG for %s", pose => {
    const png = readFileSync(new URL(`toys/${pose}.png`, gameDirectory));
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBeGreaterThan(0);
    expect(png.readUInt32BE(20)).toBeGreaterThan(0);
  });
});

describe("Roll or Stack animation flow", () => {
  const toy = id => rules.OBJECTS.find(object => object.id === id);

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("updates both soup can images on Turn and tests the new orientation", async () => {
    const can = toy("soup-can");
    const { get, flying, finish } = loadGame(can);
    const turning = get("turnButton").click();
    expect(get("rollButton").disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(640);
    await turning;
    const source = `toys/soup-can-${can.orientations[1].id}.png`;
    expect(get("toyEmoji").src).toBe(source);
    expect(get("flyingEmoji").src).toBe(source);

    get("rollButton").click();
    await vi.advanceTimersByTimeAsync(680);
    const [frames] = flying.animate.mock.calls[0];
    expect(frames[0]).toMatchObject({ left: "50%", top: "calc(56% - 30px)" });
    expect(frames[2]).toMatchObject({ left: "25.7%", top: "calc(42.2% - 30px)" });
    expect(frames.at(-1).left).toBe("40.2%");
    expect(get("nextButton").disabled).toBe(true);
    finish();
    await vi.advanceTimersByTimeAsync(1410);
    expect(get("feedbackText").textContent).toBe(rules.getOutcome(can, 1, "roll").message);
    expect(flying.classList.contains("hidden")).toBe(true);
    expect(get("nextButton").disabled).toBe(false);
  });

  it("lands the cube directly on the stacking block with reduced motion", async () => {
    const { get, flying } = loadGame(toy("wooden-cube"), { reducedMotion: true });
    get("stackButton").click();
    await vi.advanceTimersByTimeAsync(40);
    expect(flying.animate).not.toHaveBeenCalled();
    expect(flying.style).toMatchObject({
      left: "74.5%", top: "calc(49.7% - 30px)", transform: "rotate(0deg)",
    });
    await vi.advanceTimersByTimeAsync(80);
    expect(get("nextButton").disabled).toBe(false);
  });

  it("cancels an in-flight test on reset and keeps the fresh round active", async () => {
    const { get, flying, animation } = loadGame(toy("beach-ball"));
    get("rollButton").click();
    await vi.advanceTimersByTimeAsync(680);
    expect(flying.animate).toHaveBeenCalledOnce();
    get("resetButton").click();
    await vi.runAllTimersAsync();
    expect(animation.cancel).toHaveBeenCalledOnce();
    expect(flying.classList.contains("hidden")).toBe(true);
    expect(get("resultBurst").classList.contains("hidden")).toBe(true);
    expect(get("testsTried").textContent).toBe("0");
    expect(get("rollButton").disabled).toBe(false);
    expect(get("nextButton").disabled).toBe(true);
  });
});
