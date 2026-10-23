#!/usr/bin/env node
// Read-only evidence inventory. No publishing, rights promotion or mutations.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const EXT=new Set(['.glb','.gltf','.blend','.fbx','.obj','.usdz','.usd','.usda','.usdc','.ktx2','.webp','.png','.jpg','.jpeg','.exr','.hdr']);
const MAX=250*1024*1024;
export function inventoryRepo(root){
 const base=fs.realpathSync(root),name=path.basename(base);
 const commit=execFileSync('git',['-C',base,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const tracked=execFileSync('git',['-C',base,'ls-files','-z','--cached'],{encoding:'buffer',maxBuffer:64*1024*1024}).toString('utf8').split('\0').filter(Boolean);
 const assets=[];
 for(const relative of tracked){
  const extension=path.extname(relative).toLowerCase();
  if(!EXT.has(extension))continue;
  const full=path.resolve(base,relative);
  if(!full.startsWith(base+path.sep))continue;
  let stat;
  try{stat=fs.lstatSync(full)}catch{assets.push({path:relative,state:'missing-working-tree'});continue}
  if(!stat.isFile()||stat.isSymbolicLink()){assets.push({path:relative,state:'not-regular-file'});continue}
  const item={path:relative,extension,bytes:stat.size,sha256:null,state:'tracked-working-tree'};
  if(stat.size<=MAX)item.sha256=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  else item.state='hash-skipped-size-limit';
  assets.push(item);
 }
 assets.sort((a,b)=>a.path.localeCompare(b.path));
 return {repository:name,commit,asset_count:assets.length,assets};
}
export function inventory(roots){
 if(!roots.length)throw Error('Supply explicitly authorized local repository paths');
 const repositories=roots.map(inventoryRepo),groups=new Map();
 for(const repo of repositories)for(const asset of repo.assets){
  if(!asset.sha256)continue;
  const list=groups.get(asset.sha256)||[];list.push({repository:repo.repository,path:asset.path});groups.set(asset.sha256,list);
 }
 const duplicates=[...groups.entries()].filter(([,a])=>a.length>1).map(([sha256,occurrences])=>({sha256,occurrences}));
 return {schema_version:1,method:'read-only-tracked-working-tree',rights_assessment:'not-performed',release_approval:false,repositories,duplicates};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{process.stdout.write(JSON.stringify(inventory(process.argv.slice(2)),null,2)+'\n')}
 catch(e){console.error('spatial-inventory:',e.message);process.exitCode=1}
}
