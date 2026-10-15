#!/usr/bin/env node
// Required matrix jobs must report even when no visual source changed.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SHA=/^[a-f0-9]{40}$/;
const localTools=new Set(['tools/3d-knowledge.mjs','tools/check-before-create.mjs']);
const documents=new Set(['README.md','AGENTS.md','CONTRIBUTING.md','docs/architecture/3D_KNOWLEDGE_MAP.json']);
export function requiresVisualEvidence(files){
  if(!Array.isArray(files)||!files.length)return true;
  return files.some(file=>{
    if(typeof file!=='string'||!file||file.startsWith('/')||file.includes('\\')||file.split('/').includes('..'))return true;
    return !(documents.has(file)||localTools.has(file)||/^docs\/.+\.md$/.test(file)||/^web\/test\/.+\.test\.mjs$/.test(file));
  });
}
export function visualScope(eventName,event,listChangedPaths){
  if(!['pull_request','push'].includes(eventName))return {run_visual:true,reason:'Manual or unknown event: run the full matrix.'};
  const base=eventName==='pull_request'?event?.pull_request?.base?.sha:event?.before;
  const head=eventName==='pull_request'?event?.pull_request?.head?.sha:event?.after;
  if(!SHA.test(base||'')||!SHA.test(head||'')||/^0+$/.test(base)||/^0+$/.test(head))return {run_visual:true,reason:'Comparison refs unavailable: run the full matrix.'};
  try{
    const required=requiresVisualEvidence(listChangedPaths(base,head));
    return {run_visual:required,reason:required?'Visual, unknown or empty change scope: run the full matrix.':'Only documented nonvisual paths changed; report the required matrix without browser capture.'};
  }catch{return {run_visual:true,reason:'Comparison failed: run the full matrix.'};}
}
export function main(){
  let scope;
  try{
    const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
    scope=visualScope(process.env.GITHUB_EVENT_NAME,event,(base,head)=>execFileSync('git',['diff','--name-only','-z',base,head],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0').filter(Boolean));
  }catch{scope={run_visual:true,reason:'Event input unavailable: run the full matrix.'};}
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`run_visual=${scope.run_visual}\n`);
  console.log(JSON.stringify(scope));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
