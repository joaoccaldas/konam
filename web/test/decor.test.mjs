import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);

test('every decor manifest validates: refs exist, ids unique, rights recorded', () => {
  const out = execFileSync('node', [new URL('tools/decor.mjs', root).pathname, 'validate'], { encoding: 'utf8' });
  assert.match(out, /all items valid/);
});

test('decor engine instances merged geometry and loads lite bikes on phones', () => {
  const src = fs.readFileSync(new URL('web/src/engine/decor.js', root), 'utf8');
  assert.match(src, /new THREE\.InstancedMesh\(mergeGeometries\(list\), mat, placements\.length\)/);
  assert.match(src, /bike-lite/);
  assert.match(src, /lite && item\.lite === 'skip'/);
});

test('skills for repeatable rooms, dressing and bikes exist and point at the real tools', () => {
  for (const s of ['konam-room-studio', 'konam-room-dressing', 'konam-bike-forge']) {
    const t = fs.readFileSync(new URL(`skills/${s}/SKILL.md`, root), 'utf8');
    assert.match(t, new RegExp(`^---\\nname: ${s}\\n`), s);
  }
  const forge = fs.readFileSync(new URL('skills/konam-bike-forge/SKILL.md', root), 'utf8');
  for (const tool of ['blender/atlas_build.py', 'tools/pack-glb.mjs', 'tools/validate-bikes.mjs', 'engine/decor.js']) assert.ok(forge.includes(tool), tool);
  for (const f of ['tools/decor.mjs', 'tools/room-evidence.mjs', 'tools/pack-glb.mjs']) assert.ok(fs.existsSync(new URL(f, root)), f);
});
