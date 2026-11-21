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
  it('accepts matching shapes only in the correct orientation', () => {
    const target=logic.partsFor(1)[0];
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
    expect(existsSync(resolve(gameDir, 'build-a-number-background.png'))).toBe(true);
    expect(existsSync(resolve(gameDir, 'number-reference-0-9.png'))).toBe(true);
  });

  it('uses the shared site navigation and separate mode chooser', () => {
    const html = readFileSync(resolve(gameDir, 'index.html'), 'utf8');
    expect(html).toContain('class="global-header"');
    expect(html).toContain('id="modeOverlay"');
    expect(html).toContain('id="changeModeBtn"');
    expect(html).not.toContain('id="modeSelect"');
  });
});
