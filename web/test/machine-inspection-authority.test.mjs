import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const consumers=['web/src/landing.js','web/src/main.js','web/src/heritage.js','web/src/exp/engine.js'];

test('all active machine viewers consume the global inspection kernel',()=>{
  for(const p of consumers){
    const s=read(p);
    assert.match(s,/machine-inspection\.js/,p+' must import global machine inspection');
    assert.doesNotMatch(s,/userData\.explode|ud\.explode/,p+' must not parse explode metadata locally');
    assert.doesNotMatch(s,/new THREE\.Vector3\(v\[0\],\s*v\[2\],\s*-v\[1\]\)/,p+' must not own Blender-to-Three conversion');
  }
});

test('only the global kernel owns explode metadata parsing',()=>{
  const engine=read('web/src/engine/machine-inspection.js');
  assert.match(engine,/explodeKey/);
  assert.match(engine,/blenderVectorToThree/);
  for(const p of consumers)assert.doesNotMatch(read(p),/const\s+explodables\s*=\s*\[\][\s\S]{0,1200}ud\.explode/);
});

test('bike schema extends rather than forks the global machine contract',()=>{
  const schema=JSON.parse(read('museum/bike.schema.json'));
  assert.ok(schema.properties.assembly_manifest);
  assert.ok(schema.properties.mechanical_detail_level);
  assert.ok(schema.properties.inspection_capabilities);
  const machine=JSON.parse(read('museum/schemas/machine-assembly.schema.json'));
  assert.equal(machine.$id,'urn:konam:machine-assembly:v1');
});
