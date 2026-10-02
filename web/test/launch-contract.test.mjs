import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {framingDistance} from '../src/engine/framing.js';
const root=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('portrait framing increases distance and reserves room around the object',()=>{
 const wide=framingDistance(1,38,1.8),phone=framingDistance(1,38,.5);
 assert.ok(phone>wide);
 for(const aspect of [.25,.5,1,1.8,3]){
  const distance=framingDistance(1,38,aspect);
  const limiting=Math.min(38*Math.PI/360,Math.atan(Math.tan(38*Math.PI/360)*aspect));
  assert.ok(Math.asin(1/distance)<limiting,'entire sphere must fit');
 }
});
test('entry and routes have one stylesheet owner and feature CSS is not preloaded',()=>{
 const system=read('web/styles/system.css'),shell=read('web/styles/shell-mobile.css'),tpl=read('web/landing.template.html'),entrySrc=read('web/src/entry.js'),konaShell=read('web/src/ui/kona-shell.js');
 assert.doesNotMatch(system,/#intro\.kona-entry|--kona-bg\s*:/);
 assert.doesNotMatch(shell,/\.home-|\.garage-/);
 assert.match(read('web/styles/home.css'),/\.home-race-self/);
 assert.match(read('web/styles/garage.css'),/\.garage-setup-hero/);
 assert.match(read('tools/harden_pages.mjs'),/entry\.css/);
 assert.doesNotMatch(system,/body:not\(\.museum-open\) > header/,'consumer chrome must not hide standalone headers');
 for(const rel of ['home.css','garage.css','race-self.css','companion.css','admin-assets.css']) assert.doesNotMatch(tpl,new RegExp(rel.replace('.','\\.')),rel+' must load only with its feature');
 assert.match(entrySrc,/featureStyle/);assert.match(konaShell,/featureStyle/);
});
test('staged deploy rejects missing or corrupt service-worker core CSS',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kona-stage-test-'));
 try{
  fs.mkdirSync(path.join(dir,'app'));fs.mkdirSync(path.join(dir,'web/styles'),{recursive:true});
  const css='body{color:red}',rel='web/styles/system.css';
  fs.writeFileSync(path.join(dir,'app/app-manifest.json'),JSON.stringify({core:[rel],files:{[rel]:crypto.createHash('sha256').update(css).digest('base64')}}));
  fs.writeFileSync(path.join(dir,'index.html'),'<link rel="stylesheet" href="'+rel+'">');
  const run=()=>spawnSync(process.execPath,[new URL('tools/validate-staged-site.mjs',root).pathname,dir],{encoding:'utf8'});
  assert.equal(run().status,1,'missing stylesheet must prevent publication');
  fs.writeFileSync(path.join(dir,rel),css);assert.equal(run().status,0);
  fs.writeFileSync(path.join(dir,rel),'stale CSS');assert.equal(run().status,1,'stale seal must prevent publication');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('local storage failure is observable instead of falsely reporting saved',async()=>{
 const {writeStorage}=await import('../src/engine/storage.js');
 const {createProfile}=await import('../src/engine/profile.js');
 assert.equal(writeStorage('profile','{}',{setItem(){throw new Error('quota')}}),false);
 const profile=createProfile({load:()=>null,save:()=>false});profile.set({name:'Test athlete'});
 assert.equal(profile.saved,false);assert.equal(profile.get().name,'Test athlete','session remains usable');
});
