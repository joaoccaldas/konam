import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const lock = JSON.parse(read('world/final-room-recovery-lock-20261004.json'));
const landing = read('web/src/landing.js');

test('final room recovery is pinned to the approved source commit', () => {
  assert.equal(lock.source_commit, 'cc80c48ada08a634c642561a64ef928f06c626be');
  for (const room of Object.values(lock.rooms)) {
    for (const [path, blob] of Object.entries(room.files)) {
      const abs = new URL(path, root);
      assert.ok(fs.existsSync(abs), path);
      const got = execFileSync('git', ['hash-object', abs.pathname], { encoding: 'utf8' }).trim();
      assert.equal(got, blob, path);
    }
  }
});

test('current-main host selects all three recovered final room variants', () => {
  assert.match(landing, /get\('reviewRoom'\) === 'beast-cave'/);
  assert.match(landing, /get\('reviewRoom'\) === 'nor3-winter'/);
  assert.match(landing, /get\('reviewRoom'\) === 'breitling-kona'/);
  assert.match(landing, /NOR3_REVIEW \? buildNor3Winter\(reviewCtx\)/);
  assert.match(landing, /BREITLING_REVIEW \? buildBreitlingKona\(reviewCtx\)/);
  assert.match(landing, /EAST_DOORS = new Set\(\['beast'\]\)/);
});

test('recovered host preserves the final room fidelity and Beast interaction boundaries', () => {
  assert.match(landing, /const hemiBase = hemi\.intensity/);
  assert.match(landing, /const sunBase = sun\.intensity/);
  assert.match(landing, /galleries\.update\(t, P, reduce, scene, renderer, reg, moodRoom\)/);
  assert.match(landing, /roomSound\.drive\?\.\('beast'/);
  assert.match(landing, /function startRide\(\)/);
  assert.match(landing, /function endRide\(finished\)/);
  assert.match(read('web/styles/hall-web.css'), /\.ride-hud/);
  assert.match(read('web/src/roomSound.js'), /bed\('nor3'\)/);
  assert.match(read('web/src/roomSound.js'), /bed\('breitling'\)/);
});

test('room data files parse and point at their exact runtime assets', () => {
  JSON.parse(read('pitch/lionel-sanders/career-facts-v1.json'));
  JSON.parse(read('pitch/norwegian-trio/trio-facts-v1.json'));
  JSON.parse(read('pitch/breitling-kona/collection-v1.json'));
  const decor = JSON.parse(read('world/konam/rooms/nor3-winter.decor.json'));
  assert.equal(decor.variant, 'nor3-winter');
  assert.match(read('web/src/beast-cave.js'), /hf-trainer\.glb/);
  assert.match(read('web/src/nor3-winter.js'), /kona-winter-plate-2048\.webp/);
  assert.match(read('web/src/breitling-kona.js'), /watch\.glb/);
});
