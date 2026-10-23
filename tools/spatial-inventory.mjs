#!/usr/bin/env node
// Read-only evidence inventory. Fail closed on dirty worktrees and unsafe paths.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const EXT=new Set(['.glb','.gltf','.blend','.fbx','.obj','.usdz','.usd','.usda','.usdc','.ktx2','.webp','.png','.jpg','.jpeg','.exr','.hdr']);
const MAX=250*1024*1024;
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'buffer',maxBuffer:64*1024*1024});
export function safeTrackedPath(base,relative){
 if(!relative||path.isAbsolute(relative)||relative.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('unsafe tracked path');
 let current=base;
 const parts=relative.split('/');
 for(const part of parts){
  current=path.join(current,part);
  const stat=fs.lstatSync(current); // never follow intermediate symlinks
  if(stat.isSymbolicLink())throw Error('symlink in tracked path');
 }
 const real=fs.realpathSync(current);
 if(!real.startsWith(base+path.sep))throw Error('tracked path escapes repository');
 if(!fs.lstatSync(current).isFile())throw Error('not a regular file');
 return real;
}
export function inventoryRepo(root){
 const base=fs.realpathSync(root),name=path.basename(base);
 if(!fs.statSync(base).isDirectory())throw Error('repository path is not a directory');
 const top=git(base,'rev-parse','--show-toplevel').toString('utf8').trim();
 if(fs.realpathSync(top)!==base)throw Error('explicit path must be Git repository root');
 const commit=git(base,'rev-parse','HEAD').toString('utf8').trim();
 // Index, staged and tracked working-tree changes invalidate HEAD/content correspondence.
 const dirty=git(base,'status','--porcelain=v1','-z','--untracked-files=no');
 if(dirty.length)throw Error('dirty tracked worktree; use a clean pinned clone');
 const tracked=git(base,'ls-files','-z','--cached').toString('utf8').split('\0').filter(Boolean);
 const assets=[];
 for(const relative of tracked){
  const extension=path.extname(relative).toLowerCase();
  if(!EXT.has(extension))continue;
  let full;
  try{full=safeTrackedPath(base,relative)}
  catch(e){throw Error('unsafe or missing tracked asset '+JSON.stringify(relative)+': '+e.message)}
  const stat=fs.statSync(full);
  if(stat.size>MAX)assets.push({path:relative,extension,bytes:stat.size,sha256:null,state:'hash-skipped-size-limit'});
  else assets.push({path:relative,extension,bytes:stat.size,sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'),state:'clean-pinned-working-tree'});
 }
 assets.sort((a,b)=>a.path.localeCompare(b.path));
 return {repository:name,commit,clean_tracked_worktree:true,asset_count:assets.length,assets};
}
export function inventory(roots){
 if(!roots.length)throw Error('Supply explicitly authorized local repository paths');
 const repositories=roots.map(inventoryRepo),groups=new Map();
 for(const repo of repositories)for(const asset of repo.assets){
  if(!asset.sha256)continue;
  const list=groups.get(asset.sha256)||[];list.push({repository:repo.repository,path:asset.path});groups.set(asset.sha256,list);
 }
 const duplicates=[...groups.entries()].filter(([,a])=>a.length>1).map(([sha256,occurrences])=>({sha256,occurrences}));
 return {schema_version:1,method:'read-only-clean-tracked-worktree',rights_assessment:'not-performed',release_approval:false,repositories,duplicates};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{process.stdout.write(JSON.stringify(inventory(process.argv.slice(2)),null,2)+'\n')}
 catch(e){console.error('spatial-inventory:',e.message);process.exitCode=1}
}
