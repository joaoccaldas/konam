import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {inventory,safeTrackedPath} from '../../tools/spatial-inventory.mjs';
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{stdio:'pipe'});
function fixture(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spatial-evidence-'));
 try{return fn(dir)}finally{fs.rmSync(dir,{recursive:true,force:true})}
}
function init(dir){
 fs.mkdirSync(dir);git(dir,'init','-q');git(dir,'config','user.email','test@example.test');git(dir,'config','user.name','Test');
}
test('clean tracked assets only, exact duplicate detection, no rights promotion',()=>fixture(dir=>{
 const a=path.join(dir,'a'),b=path.join(dir,'b');
 for(const r of [a,b]){init(r);fs.writeFileSync(path.join(r,'model.glb'),'same-binary');fs.writeFileSync(path.join(r,'untracked.glb'),'not-tracked');git(r,'add','model.glb');git(r,'commit','-qm','fixture')}
 const result=inventory([a,b]);
 assert.equal(result.repositories.length,2);
 assert.equal(result.repositories[0].asset_count,1);
 assert.equal(result.duplicates.length,1);
 assert.equal(result.repositories[0].clean_tracked_worktree,true);
 assert.equal(result.release_approval,false);
 assert.equal(result.rights_assessment,'not-performed');
}));
test('tracked working-tree mutation fails closed rather than mislabeling HEAD',()=>fixture(dir=>{
 const r=path.join(dir,'repo');init(r);fs.writeFileSync(path.join(r,'model.glb'),'original');
 git(r,'add','.');git(r,'commit','-qm','fixture');fs.writeFileSync(path.join(r,'model.glb'),'changed');
 assert.throws(()=>inventory([r]),/dirty tracked worktree/);
}));
test('staged mutations also fail closed',()=>fixture(dir=>{
 const r=path.join(dir,'repo');init(r);fs.writeFileSync(path.join(r,'model.glb'),'original');
 git(r,'add','.');git(r,'commit','-qm','fixture');fs.writeFileSync(path.join(r,'model.glb'),'changed');git(r,'add','.');
 assert.throws(()=>inventory([r]),/dirty tracked worktree/);
}));
test('symlinked parent cannot escape repository',()=>fixture(dir=>{
 const repo=path.join(dir,'repo'),outside=path.join(dir,'outside');fs.mkdirSync(repo);fs.mkdirSync(outside);
 fs.writeFileSync(path.join(outside,'model.glb'),'outside');fs.symlinkSync(outside,path.join(repo,'assets'));
 assert.throws(()=>safeTrackedPath(repo,'assets/model.glb'),/symlink/);
}));
test('empty input fails closed',()=>assert.throws(()=>inventory([]),/explicitly authorized/));
