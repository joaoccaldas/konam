import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));

test('NOR // 3 uses the existing installation registry and is not a new room runtime',()=>{
  const decorations=json('museum/world/decorations.json');
  const install=decorations.installations.find(x=>x.id==='norwegian-engine');
  assert.ok(install,'norwegian-engine installation must be indexed');
  assert.equal(install.builder,'norwegian');
  assert.equal(install.source,'web/src/engine/room-installations.js');

  const src=read('web/src/engine/room-installations.js');
  assert.match(src,/function norwegian\(ctx\)/);
  assert.match(src,/INSTALLATION_BUILDERS=Object\.freeze\(\{bio,horror,alien,zombie,norwegian\}\)/);
  assert.doesNotMatch(src,/new THREE\.WebGLRenderer|new THREE\.PerspectiveCamera|OrbitControls|RoomEnvironment/);
});

test('NOR // 3 remains unwired from the canonical museum until visual approval',()=>{
  const rooms=json('museum/world/rooms.json');
  const names=rooms.areas.map(x=>[x.id,x.name,x.short,x.sub].filter(Boolean).join(' ')).join('\n');
  assert.doesNotMatch(names,/norwegian engine|nor \/\/ 3|blummenfelt|iden|stornes/i);

  const landing=read('web/src/landing.js');
  assert.doesNotMatch(landing,/norwegian-engine|NOR \/\/ 3|buildNorwegian/i);
});

test('NOR // 3 reuses canonical room lifecycle primitives',()=>{
  const src=read('web/src/engine/room-installations.js');
  const start=src.indexOf('function norwegian(ctx)');
  const end=src.indexOf('function PAPER_MAT',start);
  const body=src.slice(start,end);
  assert.match(body,/const \{r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds\}=ctx/);
  assert.match(body,/motes\(/);
  assert.match(body,/L\.motes\.push/);
  assert.match(body,/specimenSlots/);
  assert.match(body,/lite\?/);
});

test('obsolete standalone Norwegian renderer and review page are absent',()=>{
  for(const p of [
    'web/src/rooms/norwegian-engine.js',
    'web/src/rooms/norwegian-engine-preview.js',
    'review/norwegian-engine/index.html',
    'tools/build_norwegian_engine_review.mjs',
    'blender/norwegian_engine_assets.py'
  ]) assert.equal(fs.existsSync(path.join(ROOT,p)),false,p+' must not exist');
});
