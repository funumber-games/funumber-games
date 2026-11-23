import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const game=resolve(root,"docs/build-a-bridge");

describe("Build a Bridge rabbit crossing",()=>{
  it("keeps the eight-pose running sprite inside the game folder",()=>{
    expect(existsSync(resolve(game,"build-a-bridge-rabbit-running.png"))).toBe(true);
    const html=readFileSync(resolve(game,"index.html"),"utf8");
    const css=readFileSync(resolve(game,"build-a-bridge.css"),"utf8");
    expect(html).toContain('id="rabbitCanvas"');
    expect(css).toContain(".rabbit-canvas");
  });

  it("creates one synchronized landing point for every bridge block",()=>{
    const script=readFileSync(resolve(game,"build-a-bridge.js"),"utf8");
    expect(script).toContain("Array.from({ length: state.gap }");
    expect(script).toContain("const movementPoints = [24, ...blockFootfalls, 78]");
    expect(script).toContain("const stepDuration = 640");
    expect(script).toContain("const frame = elapsed >= totalDuration ? 6 : Math.floor(phase * 8)");
  });

  it("keeps a ground shadow fixed while the rabbit body rises and lands",()=>{
    const html=readFileSync(resolve(game,"index.html"),"utf8");
    const script=readFileSync(resolve(game,"build-a-bridge.js"),"utf8");
    expect(html).toContain('id="rabbitCanvas"');
    expect(script).toContain("Math.sin(phase * Math.PI * 2) ** 2 * rabbitHeight * .035");
    expect(script).toContain("context.ellipse");
  });

  it("uses the seated pose from the same sheet while the rabbit waits",()=>{
    const html=readFileSync(resolve(game,"index.html"),"utf8");
    const script=readFileSync(resolve(game,"build-a-bridge.js"),"utf8");
    expect(html).toContain('id="rabbitCanvas"');
    expect(script).toContain('side === "left" ? .17 : .78, .39');
  });

  it("keeps the measuring workbench visible throughout the crossing",()=>{
    const script=readFileSync(resolve(game,"build-a-bridge.js"),"utf8");
    const css=readFileSync(resolve(game,"build-a-bridge.css"),"utf8");
    expect(script).not.toContain('elements.workbench.classList.add("hidden")');
    expect(css).toContain(".scene.crossing { aspect-ratio: 16 / 9; }");
  });

  it("rests the completed bridge on both sandy shores",()=>{
    const css=readFileSync(resolve(game,"build-a-bridge.css"),"utf8");
    const script=readFileSync(resolve(game,"build-a-bridge.js"),"utf8");
    expect(css).toContain("top: 35.8%; left: 29.8%; width: 38.9% !important; height: 10.4%");
    expect(script).toContain("const gapLeft = 29.8");
    expect(script).toContain("const gapWidth = 38.9");
    expect(script).toContain('drawRabbit(frame, x / 100, .36');
  });

  it("does not enlarge the selected plank before it moves to the river",()=>{
    const script=readFileSync(resolve(game,"build-a-bridge.js"),"utf8");
    const crossingStart=script.indexOf("function runRabbitCrossing()");
    const finalUnitSize=script.indexOf('elements.bridgePlank.style.setProperty("--unit-size"');
    expect(finalUnitSize).toBeGreaterThan(crossingStart);
  });
});
