#!/usr/bin/env node
// Curated lookup over existing authorities. Never executes recipes or promotes assets.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeForScan, SECRET_PATTERNS, PERSONAL_PATTERNS} from './lib/privacy-patterns.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const MAP_PATH='docs/architecture/3D_KNOWLEDGE_MAP.json';
export const GUIDE_PATH='docs/architecture/3D_KNOWLEDGE_MAP.md';
const KINDS=new Set(['project','workflow','lesson','capability','benchmark','recipe','decision','gap']);
const STATES=new Set(['active-pointer','candidate','unresolved','historical','superseded']);
const EVIDENCE=new Set(['source-inspected','reported-in-source','historical-observation','proposed']);
const SHA=/^[a-f0-9]{40}$/;
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const safePath=x=>nonempty(x)&&!path.posix.isAbsolute(x)&&!x.includes('\\')&&!x.split('/').some(p=>['','..','.'].includes(p));
const normalize=x=>String(x).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function loadKnowledge(root=ROOT){return JSON.parse(fs.readFileSync(path.join(root,MAP_PATH),'utf8'));}

export function validateKnowledge(data,{root=ROOT,checkLocalSources=true}={}){
  const errors=[];
  const fail=m=>errors.push(m);
  if(data?.schema_version!==1)fail('schema_version must be 1');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data?.updated_at||''))fail('updated_at must be a dated snapshot');
  if(!nonempty(data?.purpose))fail('purpose required');
  const sources=Array.isArray(data?.sources)?data.sources:[];
  const records=Array.isArray(data?.records)?data.records:[];
  const occurrences=Array.isArray(data?.model_occurrences)?data.model_occurrences:[];
  if(!sources.length)fail('sources required');if(!records.length)fail('records required');
  const sourceIds=new Set(),recordIds=new Set();
  const repos=new Set(data?.scope?.covered_public_repositories||[]);
  if(!repos.size)fail('covered public repositories required');
  if(!SHA.test(data?.scope?.konam_baseline_ref||''))fail('pinned konam baseline ref required');
  for(const s of sources){
    if(!s||typeof s!=='object'||Array.isArray(s)){fail('source must be an object');continue;}
    if(!nonempty(s.id)||sourceIds.has(s.id))fail('missing or duplicate source id: '+s.id);
    sourceIds.add(s.id);
    if(!nonempty(s.role))fail(s.id+': source role required');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s.observed_at||''))fail(s.id+': observation date required');
    let url;
    try{url=new URL(s.url);if(url.protocol!=='https:'||url.username||url.password)throw Error();
      if([...url.searchParams.keys()].some(k=>/token|secret|signature|credential|api.?key/i.test(k)))throw Error();
    }catch{fail(s.id+': source must have a public HTTPS URL without credentials');}
    if(s.kind==='repository-file'){
      if(!/^[-\w.]+\/[-\w.]+$/.test(s.repository||'')||!repos.has(s.repository?.split('/')[1]))fail(s.id+': repository outside declared public scope');
      if(!SHA.test(s.ref||''))fail(s.id+': source ref must be a full pinned commit');
      if(!safePath(s.path))fail(s.id+': unsafe or empty source path');
      if(s.url!==`https://github.com/${s.repository}/blob/${s.ref}/${s.path}`)fail(s.id+': source URL does not match pinned locator');
      if(checkLocalSources&&s.repository?.endsWith('/konam')&&s.ref===data?.scope?.konam_baseline_ref&&safePath(s.path)&&!fs.existsSync(path.join(root,s.path)))fail(s.id+': local baseline source missing: '+s.path);
    }else if(s.kind!=='public-reference')fail(s.id+': invalid source kind');
  }
  for(const r of records){
    if(!r||typeof r!=='object'||Array.isArray(r)){fail('record must be an object');continue;}
    if(!nonempty(r.id)||recordIds.has(r.id))fail('missing or duplicate record id: '+r.id);recordIds.add(r.id);
    if(!KINDS.has(r.kind))fail(r.id+': invalid record kind');
    if(!STATES.has(r.status))fail(r.id+': invalid lifecycle status');
    if(!EVIDENCE.has(r.evidence))fail(r.id+': invalid evidence classification');
    for(const k of ['title','summary','use_when','adoption_gate'])if(!nonempty(r[k]))fail(r.id+': missing '+k);
    if(!Array.isArray(r.tags)||!r.tags.length||r.tags.some(t=>!nonempty(t)))fail(r.id+': nonempty tags required');
    if(!Array.isArray(r.source_ids)||!r.source_ids.length)fail(r.id+': source citations required');
    for(const id of Array.isArray(r.source_ids)?r.source_ids:[])if(!sourceIds.has(id))fail(r.id+': unknown source '+id);
    if(!Array.isArray(r.related_ids))fail(r.id+': related_ids must be an array');
    if(r.kind==='recipe'&&(!nonempty(r.source_entry)||r.status!=='candidate'))fail(r.id+': recipe pointers must remain candidates with a source entry');
    if(r.kind==='gap'&&r.status!=='unresolved')fail(r.id+': gaps must remain unresolved until replaced by a sourced decision');
    if(r.status==='superseded'&&!nonempty(r.superseded_by))fail(r.id+': superseded record needs replacement');
  }
  for(const r of records){
    if(!r||typeof r!=='object'||Array.isArray(r))continue;
    for(const id of Array.isArray(r.related_ids)?r.related_ids:[])if(!recordIds.has(id))fail(r.id+': unknown related record '+id);
    if(r.superseded_by&&!recordIds.has(r.superseded_by))fail(r.id+': unknown replacement '+r.superseded_by);
  }
  const locations=new Set(),blobSizes=new Map();
  for(const o of occurrences){
    if(!o||typeof o!=='object'||Array.isArray(o)){fail('model occurrence must be an object');continue;}
    const key=`${o.repository}@${o.ref}:${o.path}`;
    if(locations.has(key))fail('duplicate model occurrence: '+key);locations.add(key);
    if(!repos.has(o.repository?.split('/')[1])||!/^[-\w.]+\/[-\w.]+$/.test(o.repository||''))fail('model repository outside public scope');
    if(!SHA.test(o.ref||'')||!SHA.test(o.git_blob_id||''))fail('model occurrence needs pinned source and blob hashes');
    if(!safePath(o.path))fail('unsafe model occurrence path');
    if(!Number.isSafeInteger(o.bytes)||o.bytes<0)fail('invalid model byte count');
    if(blobSizes.has(o.git_blob_id)&&blobSizes.get(o.git_blob_id)!==o.bytes)fail('same model blob has inconsistent byte counts');
    blobSizes.set(o.git_blob_id,o.bytes);
    if(o.rights_review!=='not-performed'||o.acceptance!=='not-established')fail('locator metadata must not claim rights or acceptance');
  }
  const text=decodeForScan(JSON.stringify(data));
  for(const [kind,re] of [...SECRET_PATTERNS,...PERSONAL_PATTERNS])if(re.test(text))fail('public map contains prohibited private data: '+kind);
  return errors;
}

export function summarizeKnowledge(data){
  const byKind={};for(const r of data.records)byKind[r.kind]=(byKind[r.kind]||0)+1;
  const blobs=new Map();for(const o of data.model_occurrences){if(!blobs.has(o.git_blob_id))blobs.set(o.git_blob_id,[]);blobs.get(o.git_blob_id).push(o);}
  return {updated_at:data.updated_at,sources:data.sources.length,records:data.records.length,by_kind:byKind,
    model_occurrences:data.model_occurrences.length,distinct_model_blobs:blobs.size,
    duplicate_model_groups:[...blobs.values()].filter(x=>x.length>1).length,
    duplicate_occurrence_bytes:[...blobs.values()].reduce((n,x)=>n+x[0].bytes*(x.length-1),0),
    evidence_limit:'Curated pointers and dated observations, not executed acceptance, rights clearance or a complete backup.'};
}

export function searchKnowledge(data,query,{limit=10,kind}={}){
  const terms=normalize(query).split(/\s+/).filter(Boolean);if(!terms.length)return[];
  const matches=[];
  for(const r of data.records){
    if(kind&&r.kind!==kind)continue;
    const title=normalize([r.id,r.title,...r.tags].join(' '));
    const body=normalize([r.summary,r.use_when,r.adoption_gate].join(' '));
    if(!terms.every(t=>title.includes(t)||body.includes(t)))continue;
    const score=terms.reduce((n,t)=>n+(title.includes(t)?5:0)+(body.includes(t)?1:0),0);
    matches.push({...r,score,sources:r.source_ids.map(id=>data.sources.find(x=>x.id===id))});
  }
  return matches.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,limit);
}

export function findModelOccurrences(data,query,{limit=8}={}){
  const terms=normalize(query).split(/\s+/).filter(Boolean);if(!terms.length)return[];
  return data.model_occurrences.filter(o=>terms.every(t=>normalize(o.repository+' '+o.path).includes(t))).slice(0,limit);
}

const esc=x=>String(x).replaceAll('|','\\|').replaceAll('\n',' ');
export function renderKnowledgeGuide(data){
  const s=summarizeKnowledge(data),lines=[
    '# 3D technical knowledge map','',
    '<!-- Generated by node tools/3d-knowledge.mjs render. Edit the JSON source, not this projection. -->','',
    'This is a curated lookup over existing public project sources. It does not replace product/asset/room contracts, private knowledge stores, or acceptance evidence. It does not contain confidential strategy or cloud/workstation originals.','',
    '## Use it before work','',
    '```sh','node tools/3d-knowledge.mjs search gaudi','node tools/3d-knowledge.mjs search sofa --kind recipe','node tools/3d-knowledge.mjs show lesson:metrology-boundary','node tools/3d-knowledge.mjs gaps','node tools/3d-knowledge.mjs duplicates','node tools/check-before-create.mjs asset sofa','```','',
    'The existing pre-create command includes relevant knowledge and source-location hits. Search is local and does not execute recipes or call providers. Open the pinned source and resolve the adoption gate before reuse.','',
    '## Snapshot and limits','',
    `Observed ${data.updated_at}: ${s.records} curated records across ${s.sources} sources; ${s.by_kind.recipe||0} procedural recipe pointers; ${s.model_occurrences} model-path occurrences / ${s.distinct_model_blobs} distinct Git blobs across five repository snapshots. These are different units. Recipe definitions and identical bytes do not establish accepted output, ownership or safe deletion.`,
    '',...data.scope.limitations.map(x=>'- '+x),'',
    '## Source and lifecycle policy','',
    '- `source-inspected` describes a cited source inspection, not an independent rebuild or physical-device test.',
    '- `reported-in-source` preserves an existing observation or recommendation without promoting it to measured fact.',
    '- `historical-observation` remains bound to the cited revision/run; it does not describe current main by default.',
    '- `candidate` requires its adoption gate. `active-pointer` makes a lookup useful without promoting the referenced implementation.',
    '- Add a scoped source, action and gate for every useful lesson. Preserve superseded records with replacement pointers; keep raw unfiltered reports outside default lookup.',
    '- Render this guide after JSON edits; validation and the existing unit-test suite check drift, missing citations, unpinned sources and prohibited private data.','',
    '## Project and workflow map','',
    '| ID | Role / useful source | Use and gate |','| --- | --- | --- |'];
  for(const r of data.records.filter(x=>['project','workflow'].includes(x.kind))){const source=data.sources.find(x=>x.id===r.source_ids[0]);lines.push(`| \`${esc(r.id)}\` | [${esc(r.title)}](${source.url}) - ${esc(r.summary)} | ${esc(r.use_when)} **Gate:** ${esc(r.adoption_gate)} |`);}
  lines.push('','## Reusable lessons','','| ID | Lesson and evidence scope | Apply / verify |','| --- | --- | --- |');
  for(const r of data.records.filter(x=>x.kind==='lesson')){const source=data.sources.find(x=>x.id===r.source_ids[0]);lines.push(`| \`${esc(r.id)}\` | [${esc(r.title)}](${source.url}) (${esc(r.evidence)}). ${esc(r.summary)} | ${esc(r.use_when)} **Gate:** ${esc(r.adoption_gate)} |`);}
  lines.push('','## Existing capability and benchmark work','','The R1 records remain research pointers to their original registries. This map does not copy their budgets or promote an unmerged implementation.');
  for(const id of ['r1-program','r1-capabilities','r1-benchmarks','r1-experiences','r1-recovery']){const src=data.sources.find(x=>x.id===id);lines.push(`- [${id}](${src.url})`);}
  lines.push('','## Procedural recipe index','','Authoritative parameters and builders remain in the [existing shared registry]('+data.sources.find(x=>x.id==='shared-assets').url+'). Outputs require their destination-specific intake.','',data.records.filter(x=>x.kind==='recipe').map(x=>'`'+x.source_entry+'`').join(', '),'','## Unresolved gates','');
  for(const r of data.records.filter(x=>x.kind==='gap'))lines.push(`- **${r.title}:** ${r.summary}`);
  lines.push('','## Operating decisions','');for(const r of data.records.filter(x=>x.kind==='decision'))lines.push(`- **${r.title}:** ${r.summary}`);
  lines.push('','## Update and validation','','```sh','node tools/3d-knowledge.mjs validate','node tools/3d-knowledge.mjs render','node tools/3d-knowledge.mjs check','node --test web/test/3d-knowledge.test.mjs','```','',
    'Do not import confidential source files, provider download URLs, personal inventories or private filesystem paths. Preserve those through their existing private authority and keep only an authorized technical projection here.','');
  return lines.join('\n');
}

export function main(args=process.argv.slice(2)){
  const [command,...rest]=args;const data=loadKnowledge();const errors=validateKnowledge(data);
  if(errors.length){console.error(errors.join('\n'));return 1;}
  const json=rest.includes('--json');
  if(command==='validate'){console.log(JSON.stringify({status:'PASS',...summarizeKnowledge(data)},null,2));return 0;}
  if(command==='summary'){console.log(JSON.stringify(summarizeKnowledge(data),null,2));return 0;}
  if(command==='render'){fs.writeFileSync(path.join(ROOT,GUIDE_PATH),renderKnowledgeGuide(data));console.log('Updated '+GUIDE_PATH);return 0;}
  if(command==='check'){if(!fs.existsSync(path.join(ROOT,GUIDE_PATH))||fs.readFileSync(path.join(ROOT,GUIDE_PATH),'utf8')!==renderKnowledgeGuide(data)){console.error('Knowledge guide is stale; run node tools/3d-knowledge.mjs render');return 1;}console.log('3D knowledge guide: PASS');return 0;}
  if(command==='gaps'){const rows=data.records.filter(x=>x.kind==='gap');console.log(json?JSON.stringify(rows,null,2):rows.map(x=>`${x.id}: ${x.summary}`).join('\n'));return 0;}
  if(command==='duplicates'){const groups=new Map();for(const x of data.model_occurrences){if(!groups.has(x.git_blob_id))groups.set(x.git_blob_id,[]);groups.get(x.git_blob_id).push(x);}const rows=[...groups].filter(([,x])=>x.length>1).map(([git_blob_id,occurrences])=>({git_blob_id,occurrences}));console.log(JSON.stringify({disposition:'Review-only. Preserve provenance, permissions and consumer paths; no delete action.',groups:rows},null,2));return 0;}
  if(command==='show'){const r=data.records.find(x=>x.id===rest[0]);if(!r){console.error('Unknown knowledge record');return 2;}console.log(JSON.stringify({...r,sources:r.source_ids.map(id=>data.sources.find(x=>x.id===id))},null,2));return 0;}
  if(command==='search'){
    const index=rest.indexOf('--kind');const kind=index>=0?rest[index+1]:undefined;
    if(index>=0&&!KINDS.has(kind)){console.error('Unknown record kind');return 2;}
    const terms=rest.filter((x,i)=>x!=='--json'&&i!==index&&(index<0||i!==index+1));const query=terms.join(' ').trim();
    if(!query){console.error('Search query required');return 2;}
    const records=searchKnowledge(data,query,{kind});const occurrences=kind?[]:findModelOccurrences(data,query);
    console.log(json?JSON.stringify({query,records,model_occurrences:occurrences},null,2):[
      ...records.map(r=>`${r.id} [${r.status}; ${r.evidence}]\n  ${r.title}\n  Use: ${r.use_when}\n  Gate: ${r.adoption_gate}\n  Source: ${r.sources[0].url}`),
      ...occurrences.map(o=>`source-location: ${o.repository}@${o.ref}:${o.path} [rights/acceptance not established]`),
      ...(!records.length&&!occurrences.length?['No curated match. Absence is a coverage gap, not permission to recreate.']:[])
    ].join('\n'));return 0;
  }
  console.error('usage: node tools/3d-knowledge.mjs <validate|summary|render|check|search QUERY [--kind KIND] [--json]|show ID|gaps|duplicates>');return 2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=main();
