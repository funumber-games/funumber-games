import { describe, expect, it } from "vitest";
import rules from "../docs/vegetable-stall/game-logic.js";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

const fixedRng = value => () => value;

describe("Vegetable Stall game logic", () => {
  it("creates Simple orders with one kind and a quantity from 1 to 5", () => {
    const order = rules.makeOrder("simple", fixedRng(0.99));
    expect(order.parts).toHaveLength(1);
    expect(order.parts[0].quantity).toBeGreaterThanOrEqual(1);
    expect(order.parts[0].quantity).toBeLessThanOrEqual(5);
    expect(order.stockKinds).toHaveLength(9);
  });

  it("uses every vegetable once before beginning a new order cycle", () => {
    let deck = [];
    const selected = [];
    for (let index = 0; index < rules.VEGETABLES.length; index += 1) {
      const draw = rules.drawVegetables(deck, 1, fixedRng(0.37));
      selected.push(draw.selected[0]);
      deck = draw.remaining;
    }
    expect(new Set(selected).size).toBe(rules.VEGETABLES.length);
    const nextCycle = rules.drawVegetables(deck, 1, fixedRng(0.37));
    expect(selected).toContain(nextCycle.selected[0]);
  });

  it("keeps two-part orders distinct when a new cycle begins", () => {
    const draw = rules.drawVegetables(["carrot"], 2, fixedRng(0.2));
    expect(draw.selected).toHaveLength(2);
    expect(new Set(draw.selected).size).toBe(2);
  });

  it("announces the completed calculation in Difficult mode", () => {
    const order = {
      mode:"difficult",
      parts:[{ vegetableId:"carrot", quantity:7 },{ vegetableId:"onion", quantity:2 }],
      total:9
    };
    expect(rules.completionText(order)).toBe("7 plus 2 equals 9. Great job done!");
    expect(rules.completionText({ mode:"simple", parts:[order.parts[0]], total:7 })).toBe("Great job done!");
  });

  it("creates Moderate orders up to 9 with two or three visible kinds", () => {
    const order = rules.makeOrder("moderate", fixedRng(0.7));
    expect(order.parts).toHaveLength(1);
    expect(order.total).toBeLessThanOrEqual(9);
    expect(order.stockKinds).toHaveLength(9);
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

  it("keeps every basket populated after packing the requested vegetables", () => {
    const order = {
      parts: [{ vegetableId: "pepper", quantity: 5 }],
      total: 5,
      stockKinds: ["pepper"]
    };
    expect(rules.stockCount(order, "pepper")).toBe(9);
    expect(rules.stockCount(order, "tomato")).toBe(5);
  });

  it("maps the interactive market artwork to nine vegetable baskets", () => {
    expect(rules.VEGETABLES.map(item=>item.id)).toEqual([
      "carrot","tomato","pepper","cabbage","cauliflower","eggplant","potato","onion","corn"
    ]);
  });

  it("moves exactly one vegetable from source stock to the receiving basket count", () => {
    const result=rules.transferOne({carrot:5},{carrot:2},"carrot");
    expect(result.stock.carrot).toBe(4);
    expect(result.packedCounts.carrot).toBe(3);
  });

  it("highlights the requested basket only in Simple and Moderate modes", () => {
    expect(rules.shouldHighlightBasket("simple","carrot","carrot")).toBe(true);
    expect(rules.shouldHighlightBasket("moderate","carrot","carrot")).toBe(true);
    expect(rules.shouldHighlightBasket("moderate","carrot","tomato")).toBe(false);
    expect(rules.shouldHighlightBasket("difficult","carrot","carrot")).toBe(false);
  });

  it("uses percentage basket coordinates that stay aligned on phone screens", () => {
    const css=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.css",import.meta.url),"utf8");
    rules.VEGETABLES.forEach(({id})=>expect(css).toContain(`[data-vegetable-id="${id}"]`));
    expect(css).toContain("@media(max-width:760px)");
    expect(css).toContain(".basket-layer { top:52%; left:58%; width:39%; height:15%; }");
  });

  it("uses fixed source hotspots and one local sprite atlas for moving and packed vegetables", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    const css=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.css",import.meta.url),"utf8");
    expect(existsSync(new URL("../docs/vegetable-stall/vegetable-sprites.png",import.meta.url))).toBe(true);
    expect(existsSync(new URL("../docs/vegetable-stall/vegetable-stall-stocked.png",import.meta.url))).toBe(true);
    expect(script).toContain("vegetable-sprite sprite-${id}");
    expect(script).toContain("targetSlot.column / 14");
    expect(script).toContain("const sourceRect = button.getBoundingClientRect()");
    expect(script).not.toContain('querySelectorAll(".source-vegetable")');
    rules.VEGETABLES.forEach(({id})=>expect(css).toContain(`.sprite-${id}`));
  });

  it("removes basket badges and the redundant written instruction", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    const css=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.css",import.meta.url),"utf8");
    expect(css).toContain(".feedback-bubble { display:none; }");
    expect(script).not.toContain('count.className="source-count"');
    expect(css).toContain(".vegetable-button.requested { outline:0; background:radial-gradient");
  });

  it("keeps the spoken order hidden and shows only a compact Hear again control", () => {
    const html=readFileSync(new URL("../docs/vegetable-stall/index.html",import.meta.url),"utf8");
    const css=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.css",import.meta.url),"utf8");
    expect(html).toContain('class="visually-hidden" id="orderCaption"');
    expect(html).toContain('id="speakerButton"');
    expect(css).toContain(".order-card { top:22%; left:51%; width:auto; min-height:0;");
  });

  it("places basket fronts above landed vegetables while flying pieces stay above both", () => {
    const html=readFileSync(new URL("../docs/vegetable-stall/index.html",import.meta.url),"utf8");
    const css=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.css",import.meta.url),"utf8");
    expect(html).toContain('class="basket-front-overlay"');
    expect(html).toContain('id="basketFrontClip"');
    expect(html.match(/<rect /g)).toHaveLength(10);
    expect(css).toContain(".basket-front-overlay { position:absolute; z-index:7;");
    expect(css).toContain(".hop-layer { z-index:9; }");
  });

  it("uses source-scale vegetables in separate back and front receiving-basket rows", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    const css=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.css",import.meta.url),"utf8");
    expect(script).toContain("item.dataset.basketRow = layout[index].row");
    expect(script).toContain("item.dataset.vegetableId = id");
    expect(script).toContain("rows[1] = items.map");
    expect(css).toContain('.packed-vegetable[data-basket-row="1"] { z-index:1; transform:translateY(12%)');
    expect(css).toContain('.packed-vegetable[data-basket-row="2"] { z-index:2; transform:translateY(var(--packed-shift))');
    expect(css).toContain(".packed-vegetable { position:relative; width:130%; height:90%;");
    expect(css).toContain('width:150%; height:106%;');
    expect(css).toContain(".packed-vegetable::after");
    expect(css).toContain("grid-template-columns:repeat(14,minmax(0,1fr))");
  });

  it("celebrates each completed order before inviting the next order", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    const css=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.css",import.meta.url),"utf8");
    expect(script.indexOf("await Promise.all([speak(completionMessage), wait(1400)])")).toBeLessThan(script.indexOf('speak("Next order!")'));
    expect(script).not.toContain("Next order, please.");
    expect(rules.orderText(rules.makeOrder("simple", fixedRng(0.5)))).toMatch(/please!$/);
    expect(script).toContain("for (let index = 0; index < 56; index += 1)");
    expect(script).toContain('confetti.className = "stall-confetti"');
    expect(css).toContain("@keyframes confetti-blast");
  });

  it("finishes the Mr. Ramesh story introduction before starting the first order", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    const story=script.indexOf('await speak("Mr. Ramesh has gone to buy vegetables at the vegetable stall. Please help him pack the vegetables.", { voiceRole:"male", pitch:1.18 })');
    const greeting=script.indexOf('await speak("Hello, Mr. Ramesh. How can I help you today?", { voiceRole:"female", pitch:1.05 })');
    const firstOrder=script.indexOf("startOrder();", greeting);
    expect(story).toBeGreaterThan(-1);
    expect(greeting).toBeGreaterThan(story);
    expect(firstOrder).toBeGreaterThan(greeting);
  });

  it("uses distinct installed voice profiles for the narrator and shopkeeper", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    expect(script).toContain('if (role === "male")');
    expect(script).toContain('if (role === "female")');
    expect(script).toContain("utterance.pitch = pitch");
  });

  it("clears the receiving basket immediately when changing or starting a mode", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    expect(script).toContain("function clearReceivingBasket()");
    expect(script).toContain("basketLayer.replaceChildren()");
    const startGame=script.slice(script.indexOf("async function startGame()"),script.indexOf("function resetGame()"));
    const changeMode=script.slice(script.indexOf("function changeMode()"),script.indexOf('$("#startButton")'));
    expect(startGame).toContain("clearReceivingBasket()");
    expect(changeMode).toContain("clearReceivingBasket()");
  });

  it("draws each order from the session vegetable deck", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    expect(script).toContain("logic.drawVegetables(state.vegetableDeck, vegetableCount)");
    expect(script).toContain("state.vegetableDeck = draw.remaining");
    expect(script).toContain("logic.makeOrder(state.mode, Math.random, draw.selected)");
  });

  it("always releases the game lock after a failed wrong-answer recount", async () => {
    const state = { busy:false };
    await expect(rules.withBusyLock(state, async () => {
      throw new Error("speech failed");
    })).rejects.toThrow("speech failed");
    expect(state.busy).toBe(false);
  });

  it("returns to the same number question after recounting a wrong answer", () => {
    const script=readFileSync(new URL("../docs/vegetable-stall/vegetable-stall.js",import.meta.url),"utf8");
    expect(script).toContain("await logic.withBusyLock(state, async () =>");
    expect(script).toContain("await recount({ alreadyLocked:true })");
    expect(script).toContain("answerQuestion.textContent = originalQuestion");
    expect(script).toContain('button.focus({ preventScroll:true })');
  });
});
