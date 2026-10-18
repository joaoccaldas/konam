import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const room = read('web/src/breitling-kona.js');
const C = JSON.parse(read('pitch/breitling-kona/collection-v1.json'));

test('BREITLING × KONA is a gated review room in the host world with a valid package', () => {
  assert.match(read('web/src/landing.js'), /BREITLING_REVIEW \? buildBreitlingKona\(reviewCtx\)/);
  assert.match(read('web/src/entry.js'), /=== 'breitling-kona'\) openMuseum\('beast'\)/);
  const out = execFileSync('node', [new URL('tools/validate-room-package.mjs', root).pathname, 'breitling-kona'], { encoding: 'utf8' });
  assert.match(out, /"ok": true/); assert.match(out, /"publicWiring": false/);
  assert.doesNotMatch(room, /new THREE\.WebGLRenderer|new THREE\.PerspectiveCamera|localStorage/);
});

test('every edition is sourced from breitling.com and marks stay gated until approval is recorded', () => {
  assert.ok(C.editions.length >= 6);
  for (const e of C.editions) {
    assert.match(e.source, /^https:\/\/www\.breitling\.com\//, e.ref);
    assert.match(e.ref, /^[A-Z]\d{6}[A-Z0-9]{6}$/, e.ref);
    assert.ok(Number.isInteger(e.limited) && e.price && Array.isArray(e.verify));
  }
  assert.equal(C.commission.marks_allowed, false);
  assert.equal(C.commission.approval_ref, null);
  assert.doesNotMatch(room, /logo\.(svg|png)|ironman-logo|product-photo/i);
  assert.match(room, /no logo, IRONMAN® mark or product photograph is used until written approval is recorded/);
});

test('the watch is a part-tagged Blender study, exploded through machine inspection, cheap on phones', () => {
  const meta = JSON.parse(read('assets/watches/endurance-pro-study/build-meta.json'));
  assert.equal(meta.representation, 'geometry-study'); assert.equal(meta.generator, 'blender');
  for (const p of ['case', 'bezel', 'crystal', 'dial', 'hands', 'movement', 'strap']) assert.ok(meta.lods['watch.glb'].semantic_parts.includes(p), p);
  assert.ok(meta.lods['watch-lite.glb'].tris < 8000);
  assert.match(room, /import \{ indexMachine, applyExplosion \} from '\.\/engine\/machine-inspection\.js'/);
  assert.match(room, /instance\(baked, at,/);
});
