import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { afterEach, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const logic = require("../docs/bundle-delivery/game-logic.js");
const script = readFileSync(new URL("../docs/bundle-delivery/bundle-delivery.js", import.meta.url), "utf8");
const markup = readFileSync(new URL("../docs/bundle-delivery/index.html", import.meta.url), "utf8");

class GameElement {
  children = [];
  isConnected = true;
  disabled = false;
  className = "";
  textContent = "";
  style = { setProperty() {} };
  classList = {
    contains: name => this.className.split(" ").includes(name),
    add: name => this.classList.toggle(name, true),
    remove: name => this.classList.toggle(name, false),
    toggle: (name, enabled) => {
      const classes = this.className.split(" ").filter(value => value && value !== name);
      if (enabled) classes.push(name);
      this.className = classes.join(" ");
    }
  };

  get firstElementChild() { return this.children[0]; }
  setAttribute() {}
  addEventListener(event, handler) { if (event === "click") this.onClick = handler; }
  click() { if (!this.disabled) return this.onClick?.(); }
  append(...children) { this.children.push(...children); }
  replaceChildren() {
    this.children.forEach(child => { child.isConnected = false; });
    this.children = [];
  }
  remove() { this.isConnected = false; }
}

function loadGame(mode, order, { delayedVoices = false } = {}) {
  vi.useFakeTimers();
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new GameElement());
    return elements.get(id);
  };
  get("demoOverlay").classList.add("hidden");
  get("demoTitle").textContent = markup.match(/id="demoTitle">([^<]+)/)[1];
  get("gamePanel").classList.add("hidden");
  get("bundleScene").querySelectorAll = selector => {
    const items = [...get("packedBundles").children, ...get("packedSticks").children];
    return items.filter(item => item.classList.contains(selector.slice(1)));
  };

  const spoken = [];
  const utterances = [];
  const availableVoices = [{ name: "Rishi", lang: "en-IN" }, { name: "Veena", lang: "en-IN" }];
  let voices = delayedVoices ? [] : availableVoices;
  const speechSynthesis = Object.assign(new EventTarget(), {
    getVoices: () => voices,
    speak(utterance) {
      spoken.push(utterance.text);
      utterances.push(utterance);
      setTimeout(() => utterance.onend?.(), 1);
    },
    cancel() {}
  });
  runInNewContext(script, {
    window: {
      BundleDeliveryLogic: {
        ...logic,
        makeOrder: () => order,
        initialPacking: (selectedMode, total) => logic.initialPacking(selectedMode, total, () => 0)
      },
      speechSynthesis,
      matchMedia: () => ({ matches: true })
    },
    document: {
      querySelector: selector => selector.startsWith("#") ? get(selector.slice(1)) : { value: mode },
      createElement: () => new GameElement()
    },
    SpeechSynthesisUtterance: class {
      constructor(text) { this.text = text; }
    },
    setTimeout,
    clearTimeout
  });

  return {
    get,
    spoken,
    utterances,
    loadVoices() {
      voices = availableVoices;
      speechSynthesis.dispatchEvent(new Event("voiceschanged"));
    },
    start: () => get("startButton").click(),
    pack: async kind => {
      const packing = get(kind + "Supply").firstElementChild.click();
      await vi.runAllTimersAsync();
      await packing;
    },
    deliver: async () => {
      get("deliverButton").click();
      await vi.runAllTimersAsync();
    }
  };
}

afterEach(() => vi.useRealTimers());

it("waits for the browser's voices on the first Difficult order after refresh", async () => {
  const game = loadGame("difficult", 62, { delayedVoices: true });
  game.start();
  expect(game.spoken).toEqual([]);
  game.loadVoices();
  await vi.runAllTimersAsync();
  expect(game.utterances.find(utterance => utterance.text.startsWith("Hello Lucy")).voice.name).toBe("Rishi");
  expect(game.utterances.at(-1).voice.name).toBe("Veena");
});

it("plays the lesson before Lucy's opening order and uses the short line on the next order", async () => {
  const game = loadGame("simple", 21);
  game.start();
  expect(game.spoken).toEqual(["Ten single pencils make one pencil bundle."]);
  game.get("closeDemoButton").click();
  expect(game.spoken.at(-2)).toBe("Hello Lucy, how can I help you today?");
  expect(game.spoken.at(-1)).toContain("my son's birthday");
  await game.pack("bundle");
  await game.pack("bundle");
  await game.pack("stick");
  await game.deliver();
  game.get("deliverButton").click();
  expect(game.spoken.at(-1)).toBe("I want to buy twenty-one colour pencils.");
  expect(game.get("roundNumber").textContent).toBe(2);
  expect(game.get("packedValue").textContent).toBe(0);
});

it("counts an incorrect order, allows a correction, and advances only after a correct delivery", async () => {
  const game = loadGame("moderate", 21);
  game.start();
  await game.pack("bundle");
  await game.pack("bundle");
  await game.pack("stick");
  await game.pack("stick");
  await game.deliver();
  expect(game.spoken.slice(-6, -1)).toEqual([
    "Here you go. Please count if they are correct.", "ten", "twenty", "twenty-one", "twenty-two"
  ]);
  expect(game.spoken.at(-1)).toContain("Take out one loose pencil.");
  expect(game.get("deliverButton").textContent).toBe("Deliver");

  game.get("packedSticks").firstElementChild.click();
  await game.deliver();
  expect(game.spoken.at(-1)).toBe("They are correct. Thank you Mr. Jones!");
  expect(game.get("deliverButton").textContent).toBe("Next Order →");
});

it("reports the starting quantity in Difficult mode and regroups without losing pencils", async () => {
  const game = loadGame("difficult", 62);
  game.start();
  expect(game.spoken.at(-1)).toContain("I could find only fifty-nine");
  await game.pack("stick");
  expect(game.get("packedValue").textContent).toBe(60);
  expect(game.get("tensCount").textContent).toBe(6);
  expect(game.get("onesCount").textContent).toBe(0);
  game.get("speakerButton").click();
  expect(game.spoken.at(-1)).toContain("I could find only fifty-nine");
});

it("discards a pending delivery when the player resets", async () => {
  const game = loadGame("moderate", 21);
  game.start();
  game.get("deliverButton").click();
  expect(game.get("deliverButton").disabled).toBe(true);
  game.get("resetButton").click();
  await vi.runAllTimersAsync();
  expect(game.get("deliverButton").disabled).toBe(false);
  expect(game.get("deliverButton").textContent).toBe("Deliver");
  expect(game.spoken).not.toContain("Zero pencils.");
});
