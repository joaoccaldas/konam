import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildEvidenceReceipt} from '../../tools/spatial-evidence-receipt.mjs';
const common=root=>({root,assetId:'sample-model',sourceCommit:'a'.repeat(40),artifacts:['renders/front.png']});
test('stable receipt hashes explicit evidence without approving it',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'receipt-'));
 try{
  fs.mkdirSync(path.join(dir,'renders'));fs.writeFileSync(path.join(dir,'renders/front.png'),'synthetic');
  const r=buildEvidenceReceipt(common(dir));
  assert.equal(r.artifacts.length,1);assert.equal(r.artifacts[0].sha256.length,64);
  assert.equal(r.approval,false);assert.equal(r.rights_assessment,'not-performed');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('path escape and symlink ancestors fail closed',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'receipt-'));
 try{
  fs.mkdirSync(path.join(dir,'renders'));fs.writeFileSync(path.join(dir,'renders/front.png'),'synthetic');
  assert.throws(()=>buildEvidenceReceipt({...common(dir),artifacts:['../outside.png']}),/invalid/);
  fs.symlinkSync(path.join(dir,'renders'),path.join(dir,'alias'));
  assert.throws(()=>buildEvidenceReceipt({...common(dir),artifacts:['alias/front.png']}),/symlink/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('duplicate paths and invalid identity fail closed',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'receipt-'));
 try{
  fs.writeFileSync(path.join(dir,'asset.glb'),'fake fixture');
  assert.throws(()=>buildEvidenceReceipt({root:dir,assetId:'../bad',sourceCommit:'a'.repeat(40),artifacts:['asset.glb']}),/asset id/);
  assert.throws(()=>buildEvidenceReceipt({root:dir,assetId:'test',sourceCommit:'a'.repeat(40),artifacts:['asset.glb','asset.glb']}),/duplicate/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
