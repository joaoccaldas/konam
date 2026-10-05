import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const room = read('web/src/laidlow-nice.js');
const F = JSON.parse(read('pitch/sam-laidlow/laidlow-facts-v1.json'));

test('LAIDLOW // NICE is a gated review room in the host world with a valid package', () => {
  assert.match(read('web/src/landing.js'), /LAIDLOW_REVIEW \? buildLaidlowNice\(reviewCtx\)/);
  assert.match(read('web/src/entry.js'), /=== 'laidlow-nice'\) openMuseum\('beast'\)/);
  const out = execFileSync('node', [new URL('tools/validate-room-package.mjs', root).pathname, 'laidlow-nice'], { encoding: 'utf8' });
  assert.match(out, /"ok": true/); assert.match(out, /"publicWiring": false/);
  assert.doesNotMatch(room, /new THREE\.WebGLRenderer|new THREE\.PerspectiveCamera|localStorage/);
});

test('every displayed result is sourced; the investigation is recorded for presenters only, never displayed or shipped', () => {
  for (const r of F.results) { assert.ok(r.sources.length >= 1, r.id); assert.match(r.time, /^\d:\d\d:\d\d$/, r.id); }
  const nice = F.results.find(r => r.id === 'nice-2023');
  assert.deepEqual([nice.time, nice.splits.swim, nice.splits.bike, nice.splits.run], ['8:06:22', '47:50', '4:31:28', '2:41:46']);
  assert.equal(F.results.find(r => r.id === 'kona-2022').bike, '4:04:36');
  const notes = JSON.parse(read('pitch/sam-laidlow/laidlow-presenter-notes-v1.json'));
  assert.ok(notes.known_context.note && notes.known_context.sources.length);
  assert.equal(F.known_context, undefined, 'presenter-only context lives outside the facts file the room bundles');
  assert.doesNotMatch(room, /known_context|investigation|doping|presenter-notes/i);
  assert.doesNotMatch(read('app/hall.js'), /known_context|Testing Agency|investigation/i, 'never shipped in the public bundle');
  assert.equal(F.rights.likeness_used, false);
  assert.match(room, /Not affiliated with, endorsed by or sponsored by Sam Laidlow/);
  assert.match(room, /A FICTIONAL FRONT PAGE/);
});

test('reuses the canonical Canyon bike, shared primitives and instancing; no new renderer', () => {
  assert.match(room, /import \{ mergeStatic \} from '\.\/engine\/decor\.js'/);
  assert.match(room, /import \{ localEnvCapture \} from '\.\/engine\/env-capture\.js'/);
  assert.match(room, /new THREE\.InstancedMesh\(chairGeo/);
  assert.match(room, /setBike\(bike, dress\)/);
  assert.doesNotMatch(room, /ownBikes: true/);                         // the host loads the museum CFR (lite on phones)
  const m = JSON.parse(read('world/konam/candidates/laidlow-nice-asset-manifest-v1.json'));
  assert.ok(m.assets.length >= 7 && m.assets.every(a => a.decision === 'REUSE'), 'every asset in this room is reused');
  assert.match(room, /decorateRoom\(\[\{ prop: 'kona-palm'/);
  assert.match(room, /framedPainting\(p, /);
  assert.match(read('web/src/engine/wing.js'), /const \{ g, fr, pic \} = framedPainting\(p, /);   // the wings hang art through the same function
});
