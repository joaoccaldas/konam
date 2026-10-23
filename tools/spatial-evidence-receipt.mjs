import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
// Pure receipt builder. The caller explicitly supplies files; no discovery, rights decisions, or writes.
export function buildEvidenceReceipt({assetId,sourceCommit,root,artifacts}){
 if(typeof assetId!=='string'||! /^[a-z0-9][a-z0-9:_-]{1,95}$/.test(assetId))throw Error('invalid asset id');
 if(typeof sourceCommit!=='string'||! /^[a-f0-9]{40}$/.test(sourceCommit))throw Error('expected pinned commit');
 if(!Array.isArray(artifacts)||!artifacts.length||artifacts.length>50)throw Error('explicit artifacts required (max 50)');
 const base=fs.realpathSync(root);
 if(!fs.statSync(base).isDirectory())throw Error('invalid root');
 const seen=new Set();
 const entries=artifacts.map(rel=>{
  if(typeof rel!=='string'||path.isAbsolute(rel)||rel.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(rel))throw Error('invalid/duplicate path');
  seen.add(rel);
  let current=base;
  for(const part of rel.split('/')){
   current=path.join(current,part);
   if(fs.lstatSync(current).isSymbolicLink())throw Error('symlink artifact forbidden');
  }
  const resolved=fs.realpathSync(current);
  if(!resolved.startsWith(base+path.sep)||!fs.statSync(resolved).isFile())throw Error('unsafe artifact');
  const bytes=fs.readFileSync(resolved);
  if(bytes.length>250*1024*1024)throw Error('artifact exceeds hashing limit');
  return {path:rel,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 }).sort((a,b)=>a.path.localeCompare(b.path));
 return {schema_version:1,asset_id:assetId,source_commit:sourceCommit,evidence_type:'unverified-file-integrity',rights_assessment:'not-performed',approval:false,artifacts:entries};
}
