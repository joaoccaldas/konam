import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../src/landing.js'), 'utf8');

test('walkable floor overlays are depth-separated on mobile', () => {
  assert.ok(src.includes('polygonOffsetFactor: -2'));
  assert.ok(src.includes('setPosition(0, .014, z)'));
  assert.ok(src.includes('e.position.set(x, .014, -16.5)'));
  assert.ok(src.includes('cs.position.y = .024'));              // WYLD float: shadow above the 20 mm obsidian pad
  assert.ok(src.includes("'#f7e3b8', .16), RCX, .014, RCZ"));
});

test('decorative floor overlays do not write depth', () => {
  const line = src.match(/line: new THREE\.MeshBasicMaterial\(\{[^\n]+/u)?.[0] || '';
  const edge = src.match(/edge: new THREE\.MeshBasicMaterial\(\{[^\n]+/u)?.[0] || '';
  assert.match(line, /depthWrite: false/);
  assert.match(edge, /depthWrite: false/);
});

test('no coplanar floors or walls: the shaking fix stays fixed', () => {
  assert.match(src, /PerspectiveCamera\(museumFov\(\), 1, \.12, 700\)/);           // depth precision
  assert.ok(src.includes('rfloor.position.set(RCX, -.098, RCZ)'));                   // champions floor proud of the hall slab
  assert.ok(src.includes('wfloor.position.set(CX - 1.2, -.098, CZ2)'));              // WYLD floor proud of the hall slab
  assert.ok(src.includes('if (WROOM.h > HALL.h + .01) wall('));                      // no negative-height wall on the hall's west face
  const pool = src.match(/function lightPool[\s\S]+?\n\}/u)?.[0] || '';
  assert.match(pool, /polygonOffset: true/);
});

test('hall and champions room never use the WYLD palette', () => {
  const hall = src.slice(src.indexOf('// ------------------------------------------------------------------ Kona Champions room'), src.indexOf('// ------------------------------------------------------------------ WYLD room'));
  assert.doesNotMatch(hall, /WYLD\.(pink|aqua|blush|mint|lilac)|dyeTex\((?![^)]*KAPA)[^)]*\)/u);
  assert.ok(!/WYLD-dyed disc wheel turning slowly above the aisle/.test(src));
});
