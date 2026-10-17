import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const json = p => JSON.parse(read(p));

test('Norseman training room is a host review room, not a parallel runtime', () => {
  const landing = read('web/src/landing.js'), mod = read('web/src/norseman-training.js');
  assert.match(landing, /get\('reviewRoom'\) === 'norseman-training'/);
  assert.match(landing, /NORSEMAN_REVIEW \? buildNorsemanTraining\(reviewCtx\)/);
  assert.match(landing, /'room:konam:norseman-training'/);
  assert.match(read('web/src/entry.js'), /get\('reviewRoom'\) === 'norseman-training'\) openMuseum\('beast'\)/);
  assert.doesNotMatch(mod, /new\s+THREE\.(WebGLRenderer|PerspectiveCamera)\s*\(/);
  assert.doesNotMatch(mod, /localStorage/);
});

test('every fact shown is sourced, and profile anchors point at facts', () => {
  const f = json('pitch/norseman-training/course-facts-v1.json');
  for (const [id, fact] of Object.entries(f.facts)) {
    assert.ok(fact.line && fact.sources.length, id);
    for (const s of fact.sources) assert.ok(f.sources[s], `${id} → ${s}`);
  }
  for (const a of f.profile.anchors) assert.ok(f.facts[a.fact], a.label);
  assert.equal(f.facts.summit.value_m, 1880);
});

test('room assets reuse existing files and carry rights references', () => {
  const decor = json('world/konam/rooms/norseman-training.decor.json');
  for (const item of decor.items) {
    const file = item.kind === 'bike' ? `assets/atlas/${item.ref}/bike.glb` : item.ref;
    assert.ok(fs.existsSync(new URL(file, root)), file);
    assert.ok(item.rights_ref, item.id);
  }
  const manifest = json('world/konam/candidates/norseman-training-asset-manifest-v1.json');
  assert.equal(manifest.new_glb_files, 0);
  assert.equal(manifest.constraints.official_logo, false);
});
