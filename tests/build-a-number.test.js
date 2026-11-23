import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gameDir = resolve(projectRoot, 'docs/build-a-number');
const logic = require(resolve(gameDir, 'game-logic.js'));

describe('Build a Number game logic', () => {
  it('defines every digit from zero to nine', () => {
    expect(Object.keys(logic.digits)).toHaveLength(10);
    for (let n=0;n<=9;n++) expect(logic.partsFor(n).length).toBeGreaterThan(0);
  });
  it('keeps number templates independent between rounds', () => {
    const first=logic.partsFor(4); first[0].rotation=999;
    expect(logic.partsFor(4)[0].rotation).not.toBe(999);
  });
  it('requires every target part before completion', () => {
    const parts=logic.partsFor(8);
    expect(logic.isComplete(parts,[parts[0].id])).toBe(false);
    expect(logic.isComplete(parts,parts.map(p=>p.id))).toBe(true);
  });
  it('builds number one with a small slant and a standing line', () => {
    const parts=logic.partsFor(1);
    expect(parts.map(part=>part.id)).toEqual(['topSlant','stand']);
    expect(parts.map(part=>part.name)).toEqual(['small slanting line','standing line']);
  });
  it('accepts matching shapes only in the correct orientation', () => {
    const target=logic.partsFor(1).find(part=>part.id==='stand');
    expect(logic.accepts({...target},target)).toBe(true);
    expect(logic.accepts({...target,rotation:0},target)).toBe(false);
    expect(logic.accepts({...target,kind:'curve'},target)).toBe(false);
    expect(logic.accepts({...target,id:'another-line'},target)).toBe(false);
    expect(logic.accepts({...target,rotation:target.rotation+10},target)).toBe(false);
  });

  it('measures angles consistently around a half turn', () => {
    expect(logic.angleDistance(0,179)).toBe(1);
    expect(logic.angleDistance(125,135)).toBe(10);
  });

  it('gives every required tile its exact target artwork', () => {
    for (let number=0;number<=9;number++) {
      logic.partsFor(number).forEach(part => expect(part.path.length).toBeGreaterThan(10));
    }
  });
  it('introduces the easiest digits first in simple mode', () => {
    expect(logic.orderFor('simple').slice(0,4)).toEqual([0,1,4,7]);
  });

  it('shuffles all ten numbers without duplicates', () => {
    const values=[0.9,0.1,0.7,0.2,0.8,0.3,0.6,0.4,0.5];
    let index=0;
    const deck=logic.shuffledNumbers(()=>values[index++%values.length]);
    expect([...deck].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7,8,9]);
    expect(new Set(deck).size).toBe(10);
  });

  it('does not repeat the previous number at the start of a new deck', () => {
    const deck=logic.shuffledNumbers(()=>0.999,0);
    expect(deck[0]).not.toBe(0);
  });

  it('keeps all artwork and scripts inside the game folder', () => {
    const html = readFileSync(resolve(gameDir, 'index.html'), 'utf8');
    expect(html).not.toMatch(/https?:\/\//);
    expect(existsSync(resolve(gameDir, 'build-a-number-background-v6.png'))).toBe(true);
    expect(existsSync(resolve(gameDir, 'number-reference-0-9.png'))).toBe(true);
  });

  it('uses the shared site navigation and separate mode chooser', () => {
    const html = readFileSync(resolve(gameDir, 'index.html'), 'utf8');
    expect(html).toContain('class="global-header"');
    expect(html).toContain('id="modeOverlay"');
    expect(html).toContain('id="changeModeBtn"');
    expect(html).not.toContain('id="modeSelect"');
  });

  it('uses the simplified controls and delays the Fantastic celebration', () => {
    const html=readFileSync(resolve(gameDir,'index.html'),'utf8');
    const script=readFileSync(resolve(gameDir,'build-a-number.js'),'utf8');
    expect(html).not.toContain('class="mode-status"');
    expect(html).not.toContain('id="hintBtn"');
    expect(html).not.toContain('id="undoBtn"');
    expect(html).toContain('id="hearBtn"');
    expect(html).toContain('id="nextBtn"');
    expect(script).toContain('setTimeout(resolve,3000)');
    expect(script).toContain("launchConfetti()");
  });

  it('uses forgiving target boundaries for turned-piece taps and drops', () => {
    const script=readFileSync(resolve(gameDir,'build-a-number.js'),'utf8');
    const css=readFileSync(resolve(gameDir,'build-a-number.css'),'utf8');
    expect(script).toContain('targetNearPoint(e.clientX,e.clientY,piece.pieceId)');
    expect(script).toContain('Math.max(24,Math.min(board.clientWidth,board.clientHeight)*.07)');
    expect(css).toContain('stroke-width:30');
  });

  it('normalizes each shape type and gives each occupied tray slot a rotate control', () => {
    const html=readFileSync(resolve(gameDir,'index.html'),'utf8');
    const script=readFileSync(resolve(gameDir,'build-a-number.js'),'utf8');
    const css=readFileSync(resolve(gameDir,'build-a-number.css'),'utf8');
    expect(html).toContain('src="build-a-number-background-v6.png"');
    expect(html).not.toContain('id="turnBtn"');
    expect(script).toContain('btn.dataset.kind=piece.kind');
    expect(script).toContain("rotate.className='piece-turn'");
    expect(script).toContain('turnPiece(piece.pieceId)');
    expect(css).toContain('.piece[data-kind="curve"] svg');
    expect(css).toContain('.piece-turn { position:absolute');
    expect(css).toContain('left:25.5%; right:25.5%');
  });
});
