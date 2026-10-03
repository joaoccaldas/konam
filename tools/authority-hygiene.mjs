#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=path.resolve(import.meta.dirname,'..');
const errors=[];
const mustExist=[
  'AGENTS.md',
  'CONTRIBUTING.md',
  'docs/architecture/AUTHORITY_MAP.md',
  'skills/konam-room-studio/SKILL.md',
  'web/src/engine/storage.js',
  'web/src/engine/identity.js',
  'web/src/engine/progression.js',
  'web/src/engine/machine-inspection.js',
  'world/konam/rooms-v1.json',
  'museum/bike.schema.json',
  'museum/schemas/room-manifest.schema.json',
  'museum/schemas/asset-manifest.schema.json'
];
for(const p of mustExist)if(!fs.existsSync(path.join(ROOT,p)))errors.push('missing canonical authority: '+p);

function walk(dir){
  if(!fs.existsSync(dir))return[];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    return e.isDirectory()?walk(p):[p];
  });
}
const src=walk(path.join(ROOT,'web/src')).filter(p=>/\.js$/.test(p));
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');

const rendererAllow=new Set([
  'web/src/ui/admin-asset-preview.js',
  'web/src/ui/collectible-stage.js',
  'web/src/hall.js',
  'web/src/ui/race-self-stage.js',
  'web/src/heritage.js',
  'web/src/exp/engine.js',
  'web/src/main.js',
  'web/src/landing.js',
  'web/src/studio/main.js',
  'web/src/product-intake-proof.js',
  'web/src/room-review-norwegian.js'
]);
const directStorageAllow=new Set([
  'web/src/finds.js',
  'web/src/exp/main.js',
  'web/src/main.js',
  'web/src/landing.js'
]);

for(const file of src){
  const r=rel(file),text=fs.readFileSync(file,'utf8');
  if(/new\s+THREE\.WebGLRenderer\s*\(/.test(text)&&!rendererAllow.has(r))
    errors.push(r+': new renderer authority; reuse an approved runtime or update authority map explicitly');
  if(/localStorage\.(?:getItem|setItem|removeItem)\s*\(/.test(text)&&!directStorageAllow.has(r))
    errors.push(r+': direct localStorage authority; use web/src/engine/storage.js');
}

const bikeSchemas=walk(ROOT).map(rel).filter(p=>/bike.*schema\.json$/i.test(p));
for(const p of bikeSchemas)if(p!=='museum/bike.schema.json')errors.push(p+': competing bike schema; extend museum/bike.schema.json');

const roomDir=path.join(ROOT,'world/konam/rooms');
for(const file of walk(roomDir).filter(p=>/\.room\.json$/.test(p))){
  const id=path.basename(file).replace(/\.room\.json$/,'');
  const run=spawnSync(process.execPath,['tools/validate-room-package.mjs',id],{cwd:ROOT,encoding:'utf8'});
  if(run.status!==0)errors.push('room package '+id+' failed canonical validator: '+(run.stderr||run.stdout).trim());
}

if(errors.length){
  console.error('authority hygiene guard failed');
  for(const e of errors)console.error(' - '+e);
  process.exit(1);
}
console.log('authority hygiene guard: PASS');
