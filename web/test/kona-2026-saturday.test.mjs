import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const room = read('web/src/kona-2026-saturday.js');
const F = JSON.parse(read('pitch/kona-2026/kona-2026-results-v1.json'));

test('SATURDAY // ALIʻI is a gated review room in the host world with a valid package', () => {
  assert.match(read('web/src/landing.js'), /KONA26_REVIEW \? buildKona2026Saturday\(reviewCtx\)/);
  assert.match(read('web/src/entry.js'), /=== 'kona-2026-saturday'\) openMuseum\('beast'\)/);
  const out = execFileSync('node', [new URL('tools/validate-room-package.mjs', root).pathname, 'kona-2026-saturday'], { encoding: 'utf8' });
  assert.match(out, /"ok": true/); assert.match(out, /"publicWiring": false/);
  assert.doesNotMatch(room, /new THREE\.WebGLRenderer|new THREE\.PerspectiveCamera|localStorage/);
});

test('every displayed result is sourced and labelled unofficial until the official results exist', () => {
  assert.equal(F.status, 'unofficial');
  for (const side of ['women', 'men']) {
    assert.equal(F.results[side].length, 5);
    for (const r of F.results[side]) assert.match(r.time, /^\d:\d\d:\d\d$/, r.name);
  }
  assert.deepEqual([F.results.women[0].name, F.results.women[0].time], ['Taylor Knibb', '8:36:29']);
  assert.deepEqual([F.results.men[0].name, F.results.men[0].time], ['Vincent Luis', '7:47:27']);
  for (const m of F.moments) for (const s of m.sources) assert.ok(F.sources[s], `${m.id}: source ${s}`);
  assert.match(room, /UNOFFICIAL/);
  assert.match(room, /Not affiliated with, endorsed by or sponsored by IRONMAN/);
  assert.equal(F.rights.likeness_used, false);
});

test('no bike claim, shared props and engine primitives, no new renderer', () => {
  assert.match(room, /ownBikes: true/);
  assert.match(room, /setBike\(\) \{/);
  assert.doesNotMatch(room, /speedmax|Canyon/i, 'the room does not say what the winners rode');
  assert.match(room, /instancedProps\('promenade-chair'/);
  assert.match(room, /instancedProps\('promenade-lamp'/);
  assert.match(room, /decorateRoom\(\[\{ prop: 'kona-palm'/);
  assert.match(room, /import \{ mergeStatic \} from '\.\/engine\/decor\.js'/);
  assert.match(room, /import \{ localEnvCapture \} from '\.\/engine\/env-capture\.js'/);
  const m = JSON.parse(read('world/konam/candidates/kona-2026-saturday-asset-manifest-v1.json'));
  assert.ok(m.assets.filter(a => a.decision === 'CREATE').every(a => a.kind === 'facts'), 'only the new facts are created; every visual asset is reused or procedural');
});
