import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const file = path.join(root, 'web/src/artworld.js');
const asset = path.join(root, 'assets/artworld/artworld_assets.glb');
const packed = path.join(root, 'assets/artworld/artworld_assets.glb.gz.b64');
const src = fs.readFileSync(file, 'utf8');

test('art world bundles as part of the browser museum', async () => {
  const result = await build({ entryPoints:[file], bundle:true, format:'iife', write:false, platform:'browser', target:'es2020' });
  assert.ok(result.outputFiles[0].text.length > 1000);
});

test('Blender-authored GLB exists, is valid, and is referenced by the runtime', () => {
  assert.ok(fs.existsSync(packed));
  assert.ok(fs.statSync(packed).size > 10000);
  assert.ok(fs.existsSync(asset));
  const bytes = fs.readFileSync(asset);
  assert.equal(bytes.subarray(0,4).toString('ascii'), 'glTF');
  assert.ok(bytes.length > 10000);
  assert.ok(src.includes('assets/artworld/artworld_assets.glb'));
  assert.ok(src.includes('GLTFLoader'));
  assert.ok(!src.includes('OBJLoader'));
});

test('distance-reactive place studies and hidden collection stay wired', () => {
  for (const token of ['St. George','Las Vegas','Nice','Kona','horror-in','horror-out','regionOf','walkable','update','goto']) {
    assert.ok(src.includes(token), token);
  }
});

test('hidden collection scales down on mobile but remains visually large', () => {
  assert.ok(src.includes('const fullCount = mobile ? 4 : 6;'));
  assert.ok(src.includes('const total = mobile ? 8 : 18;'));
  assert.ok(src.includes('wireBike'));
  assert.ok(src.includes('repaintBike'));
  assert.ok(src.includes('cloneBikeForCollection'));
  assert.ok(src.includes("assetMeshes(asset, ['PORTAL_'])"));
  assert.ok(!src.includes('source.bike.clone(true)'));
  assert.ok(!src.includes('for (const src of asset.children)'));
});
