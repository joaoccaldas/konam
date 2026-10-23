import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {inventory} from '../../tools/spatial-inventory.mjs';
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{stdio:'pipe'});
test('tracked assets only; read-only; no rights promotion',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spatial-evidence-'));
 try{
  const a=path.join(dir,'a'),b=path.join(dir,'b');fs.mkdirSync(a);fs.mkdirSync(b);
  for(const r of [a,b]){
   git(r,'init','-q');git(r,'config','user.email','test@example.test');git(r,'config','user.name','Test');
   fs.writeFileSync(path.join(r,'model.glb'),'same-binary');fs.writeFileSync(path.join(r,'untracked.glb'),'not-tracked');
   git(r,'add','model.glb');git(r,'commit','-qm','fixture');
  }
  const result=inventory([a,b]);
  assert.equal(result.repositories.length,2);
  assert.equal(result.repositories[0].asset_count,1);
  assert.equal(result.duplicates.length,1);
  assert.equal(result.release_approval,false);
  assert.equal(result.rights_assessment,'not-performed');
  assert.deepEqual(result.repositories[0].assets.map(x=>x.path),['model.glb']);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('empty input fails closed',()=>assert.throws(()=>inventory([]),/explicitly authorized/));
