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
  const meta = JSON.parse(read('assets/atlas/studio-nor3-disc-tri/build-meta.json'));
  assert.equal(meta.generator, 'blender'); assert.match(meta.notes, /Unbranded/);
  for (const p of ['frame', 'rim', 'tyre', 'saddle', 'chain', 'cassette', 'brake']) assert.ok(meta.semantic_parts.includes(p), p);
  assert.match(room, /Not affiliated with, endorsed by or sponsored by the athletes/);
  assert.match(room, /A KONA\.M READING · NOT THE ATHLETE’S WORDS/);
  assert.match(room, /not the athletes’ bikes/);
  // the Instagram painting never states more than the numbers: headline follows the data, flagged until verified
  assert.match(room, /ahead \? 'BLUMMENFELT OVERTAKES' : 'BLUMMENFELT CLOSING IN'/);
  assert.match(room, /A KONA\.M JOKE, NOT NEWS/);
  assert.ok(['unverified-snapshot', 'verified'].includes(facts.social.status));
  for (const a of ['kristian', 'frodeno']) assert.ok(Number.isFinite(facts.social[a].followers) && facts.social[a].sources.length);
  for (const a of facts.athletes) if (a.equipment) assert.ok(a.equipment.sources.every(u => /^https:\/\//.test(u)));
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
  assert.match(read('web/src/engine/decor.js'), /new THREE\.InstancedMesh\(mergeGeometries\(list\), mat, placements\.length\)/);
  const dec = JSON.parse(read('world/konam/rooms/nor3-winter.decor.json'));
  assert.equal(dec.items.find(d => d.id === 'lane-bikes').ref, 'studio-nor3-disc-tri');
  assert.match(room, /loadDecor\(decor/);
  assert.match(room, /mergeGeometries\(list\)/);
  assert.equal((room.match(/key\.castShadow = true/g) || []).length, 1, 'one shadow-casting light for the whole trio');
  assert.doesNotMatch(room, /s\.castShadow = !lite/, 'lane spots do not cast shadows');
  assert.match(room, /gl_PointSize/);
  assert.match(landing, /const sealed = !!beast && reg === 'beast'/);
});
