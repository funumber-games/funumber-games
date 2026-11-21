import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");

describe("spoken game guidance",()=>{
  it.each([
    ["Number Match","docs/program/index.html","docs/game.js"],
    ["Maths Spin","docs/equation/index.html","docs/equation/equation-game.js"]
  ])("adds captions and replayable local speech to %s",(_name,htmlPath,scriptPath)=>{
    const html=read(htmlPath),script=read(scriptPath);
    expect(html).toContain('id="voiceInstruction"');
    expect(html).toContain('id="replayVoiceButton"');
    expect(html).toContain('class="action-row"');
    expect(html).toContain('class="voice-replay-button"');
    expect(html).toContain('class="visually-hidden"');
    expect(html).not.toContain('class="voice-guide');
    expect(script).toContain("SpeechSynthesisUtterance");
    expect(script).toContain("speakInstruction");
    expect(script).toContain("remainingSpins");
    expect(script).toContain("remainingMessage");
    expect(script).toContain("already disappeared");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("explains double-digit answers in Maths Spin",()=>{
    const script=read("docs/equation/equation-game.js");
    expect(script).toContain("If the answer is double digits");
    expect(script).toContain("reductionWorking");
    expect(script).toContain("getDigitReductionSteps");
  });

  it("limits repeated solve guidance and schedules an inactivity reminder",()=>{
    const script=read("docs/equation/equation-game.js");
    expect(script).toContain("guidancePromptsShown<2");
    expect(script).toContain("scheduleAnswerReminder");
    expect(script).toContain("},5000)");
    expect(script).toContain("clearAnswerReminder");
  });
});
