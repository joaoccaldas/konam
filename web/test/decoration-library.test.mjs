import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const catalog = JSON.parse(read('museum/world/decorations.json'));
const lib = read('web/src/engine/decoration-props.js');

test('every catalogued prop has a builder in the shared library, with provenance for the instanced ones', () => {
  for (const p of catalog.props) {
    if (p.instanced) {
      assert.match(lib, new RegExp(`'${p.builder}':\\(`), `${p.id}: instanced builder`);
      assert.ok(p.provenance?.rights && p.provenance?.origin, `${p.id}: provenance`);
    } else assert.match(lib, new RegExp(`(^|[{,])'?${p.builder}'?:`, 'm'), `${p.id}: builder`);
  }
  for (const id of ['promenade-chair', 'promenade-lamp']) assert.ok(catalog.props.some(p => p.id === id && p.instanced), id);
  assert.ok(catalog.materials.some(m => m.id === 'voile-sheer'));
});

test('instanced props add no lights and draw one mesh per part for every placement', () => {
  const block = lib.slice(lib.indexOf('const INSTANCED'), lib.indexOf('export function voileMaterial'));
  assert.doesNotMatch(block, /PointLight|SpotLight|RectAreaLight/);
  assert.match(block, /new THREE\.InstancedMesh\(part\.geometry/);
});
