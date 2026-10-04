import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const room = read('web/src/nor3-winter.js');
const landing = read('web/src/landing.js');
const facts = JSON.parse(read('pitch/norwegian-trio/trio-facts-v1.json'));
const manifest = JSON.parse(read('world/konam/candidates/nor3-winter-asset-manifest-v1.json'));

test('NOR // 3 Kona Winter is a review room in the host world, gated and not public', () => {
  assert.match(landing, /get\('reviewRoom'\) === 'nor3-winter'/);
  assert.match(landing, /NOR3_REVIEW \? buildNor3Winter\(reviewCtx\)/);
  assert.match(read('web/src/entry.js'), /=== 'nor3-winter'\) openMuseum\('beast'\)/);
  assert.doesNotMatch(room, /new THREE\.WebGLRenderer|localStorage/, 'reuses the host renderer and storage');
  const pkg = JSON.parse(read('world/konam/rooms/norwegian-engine.room.json'));
  assert.equal(pkg.classification.public, false);
});

test('every result on screen comes from the sourced trio facts file', () => {
  assert.equal(facts.status, 'verify-before-outreach');
  for (const a of facts.athletes) {
    assert.equal(a.panel.length, 3);
    for (const f of a.facts) { assert.ok(f.line.length > 10); assert.ok(f.sources.length && f.sources.every(u => /^https:\/\//.test(u)), `${a.name}: ${f.line}`); }
  }
  assert.ok(facts.kona_2022.sources.every(u => /^https:\/\//.test(u)));
  assert.match(room, /import trio from '..\/..\/pitch\/norwegian-trio\/trio-facts-v1\.json'/);
  assert.doesNotMatch(room, /\b\d:\d\d:\d\d\b/, 'no race times typed into the room code');
});

test('truth and rights boundaries: no brands, no likeness, no mocking copy, disclaimers present', () => {
  assert.doesNotMatch(room, /canyon|cervel|cadex|giant|zwift|dt swiss|shimano|sram/i);
  assert.doesNotMatch(read('pitch/norwegian-trio/trio-facts-v1.json'), /non-start|DNS|DNF/i);
  assert.match(room, /if \(\/decal\/\.test\(name\)\) return;/, 'bike decals are not drawn beside athletes’ names');
  assert.match(room, /Not affiliated with, endorsed by or sponsored by the athletes/);
  assert.match(room, /A KONA\.M READING · NOT THE ATHLETE’S WORDS/);
  assert.match(room, /not the athletes’ bikes/);
});

test('assets are recorded with provenance and match their hashes', () => {
  for (const a of manifest.assets) {
    const refs = [].concat(a.runtime_ref);
    for (const r of refs) assert.ok(fs.existsSync(new URL(r, root)), r);
    if (typeof a.sha256 === 'string') assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(refs[0], root))).digest('hex'), a.sha256, a.asset_id);
  }
  for (const v of Object.values(manifest.performance_measured_20261004)) if (v.room_meshes) {
    assert.ok(v.room_meshes <= (v.room_triangles < 200000 ? 95 : 180));
  }
  assert.equal(manifest.constraints.athlete_likeness, false);
});

test('efficiency: instanced trio, merged statics, one shadow pass, GPU particles', () => {
  assert.match(room, /new THREE\.InstancedMesh\(geos\[k\], m, LANES\.length\)/);
  assert.match(room, /mergeGeometries\(list\)/);
  assert.equal((room.match(/castShadow = true/g) || []).length, 2, 'one shadow-casting light (plus the fan instances casting)');
  assert.match(room, /gl_PointSize/);
  assert.match(landing, /const sealed = !!beast && reg === 'beast'/);
});
