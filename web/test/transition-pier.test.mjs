import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const room = read('web/src/transition-pier.js');
const F = JSON.parse(read('pitch/transition/transition-facts-v1.json'));
const D = JSON.parse(read('world/konam/rooms/transition-pier.decor.json'));

test('TRANSITION // THE PIER is a gated review room for room-010 with a valid package', () => {
  assert.match(read('web/src/landing.js'), /TRANSITION_REVIEW \? buildTransitionPier\(reviewCtx\)/);
  assert.match(read('web/src/entry.js'), /=== 'transition-pier'\) openMuseum\('beast'\)/);
  const out = execFileSync('node', [new URL('tools/validate-room-package.mjs', root).pathname, 'transition-pier'], { encoding: 'utf8' });
  assert.match(out, /"ok": true/); assert.match(out, /"publicWiring": false/); assert.match(out, /"parentRoom": "room-010"/);
  assert.doesNotMatch(room, /new THREE\.WebGLRenderer|new THREE\.PerspectiveCamera|localStorage/);
});

test('place facts are sourced; race craft is labelled general, not a race rule', () => {
  for (const f of F.facts) { assert.ok(f.sources.length, f.id); for (const s of f.sources) assert.ok(F.sources[s], `${f.id}: ${s}`); }
  assert.ok(F.race_craft.every(r => !r.sources), 'race-craft notes make no sourced claim');
  assert.match(room, /RACE CRAFT · GENERAL/);
  assert.match(room, /not the rules of any race/);
});

test('racked bikes are anonymous atlas studies from the decor manifest, light enough for phones', () => {
  const bikes = D.items.filter(i => i.kind === 'bike');
  assert.ok(bikes.length >= 3);
  for (const b of bikes) {
    assert.match(b.ref, /^(studio|type)-/, `${b.ref}: anonymous study, no maker`);
    assert.equal(b.lite, 'full');
    assert.ok(fs.existsSync(new URL(`assets/atlas/${b.ref}/bike.glb`, root)), b.ref);
  }
  const count = bikes.reduce((n, b) => n + b.at.length, 0);
  assert.equal(count, 19, 'twenty slots, one left empty');
  assert.match(room, /await loadDecor\(decor,/);
  assert.match(read('web/src/engine/decor.js'), /item\.lite !== 'full'/);
});
