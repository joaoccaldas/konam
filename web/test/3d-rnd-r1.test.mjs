import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const benchmark=fs.readFileSync(new URL('../3d-benchmark-r1.mjs',import.meta.url),'utf8');
const roomscene=fs.readFileSync(new URL('../src/engine/roomscene.js',import.meta.url),'utf8');
const brands=JSON.parse(fs.readFileSync(new URL('../../museum/world/brand_rooms.json',import.meta.url),'utf8'));

test('unified 3D benchmark reuses existing runtime authorities',()=>{
  assert.doesNotMatch(benchmark,/new\s+THREE\.WebGLRenderer/);
  assert.match(benchmark,/mode === 'nor'/);
  assert.match(benchmark,/mode === 'beast'/);
  assert.match(benchmark,/mode === 'museum'/);
  assert.match(benchmark,/mode === 'breitling'/);
  for(const metric of ['frame_ms_p50','frame_ms_p95','frame_ms_p99','draw_calls','triangles','unique_materials']){
    assert.match(benchmark,new RegExp(metric));
  }
});

test('brand room station.top controls display surface height',()=>{
  assert.match(roomscene,/const stationTop = Number\.isFinite\(st\.top\)/);
  assert.match(roomscene,/new THREE\.CylinderGeometry\(\.5, \.56, stationTop, 48\)/);
  assert.match(roomscene,/stationTop \+ \.01 - b2\.min\.y/);
  const breitling=brands.rooms.find(r=>r.id==='breitling');
  assert.ok(breitling);
  assert.ok(breitling.products?.[0]?.station?.top>=1);
});
