import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../src/landing.js'), 'utf8');
const tpl = fs.readFileSync(path.join(here, '../world-shell.template.html'), 'utf8');
const hallWeb = fs.readFileSync(path.join(here, '../styles/hall-web.css'), 'utf8');

test('museum uses tighter responsive framing', () => {
  assert.match(src, /if \(a < \.78\) return 59/);
  assert.match(src, /return 48;\s+\/\/ desktop/);
  assert.match(src, /PerspectiveCamera\(museumFov\(\), 1, \.12, 700\)/);   // near .12: z-fighting fix (PR #4)
});

test('museum movement is deliberately faster and more responsive', () => {
  assert.match(src, /5\.8 : 3\.35/);
  assert.match(src, /Math\.min\(4\.8, d \* 3\.0 \+ 1\.0\)/);
  assert.match(src, /Math\.exp\(-dt \* 15\)/);
  assert.match(src, /coarse \? \.0068 : \.0044/);
});

test('flow mode lets chrome recede during movement', () => {
  assert.match(src, /classList\.toggle\('flowing', flowing\)/);
  assert.match(hallWeb, /body\.flowing:not\(\.card-open\) header/);
  assert.match(hallWeb, /body\.flowing:not\(\.card-open\) #rail/);
});


test('mobile render scale drops only while moving and restores when stationary', async () => {
  const { renderSettings } = await import('../src/engine/profile.js');     // "Auto" keeps the original device rule
  for (const dpr of [1, 2, 3]) for (const l of [true, false]) {
    const r = renderSettings('auto', { lite: l, dpr });
    assert.equal(r.dpr, Math.min(dpr, l ? 1.45 : 2)); assert.equal(r.flowDpr, Math.min(dpr, l ? 1.12 : 1.65)); assert.equal(r.lite, l);
  }
  assert.match(src, /let qualityDpr = RS\.dpr/); assert.match(src, /let flowDpr = RS\.flowDpr/);
  assert.match(src, /const targetDpr = flowing \? flowDpr : qualityDpr/);
  assert.match(src, /renderer\.setPixelRatio\(activeDpr\)/);
});


test('nearby bike affordance makes world interaction immediate', () => {
  assert.match(src, /let nearbyPiece = null/);
  assert.match(src, /nearbyName/);
  assert.match(src, /showNearby = !!nearest && moving < \.82/);
  assert.match(tpl, /id="nearby"/);
  assert.match(tpl, /id="nearbyName"/);
});
