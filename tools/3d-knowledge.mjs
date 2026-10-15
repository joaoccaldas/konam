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

// A private map is an explicit local input. Never fetch it or copy it into this repo.
export function resolveKnowledgePaths(root=ROOT,mapPath=process.env.KONA_3D_KNOWLEDGE_MAP||MAP_PATH){
  if(typeof mapPath!=='string'||!mapPath.trim()||path.extname(mapPath).toLowerCase()!=='.json')throw Error('Knowledge input must be a JSON file');
  const resolved=path.resolve(root,mapPath);
  const configured=resolved!==path.resolve(root,MAP_PATH);
  return {mapPath:resolved,guidePath:configured?resolved.slice(0,-5)+'.md':path.join(root,GUIDE_PATH),configured};
}
export function loadKnowledge(root=ROOT,mapPath){return JSON.parse(fs.readFileSync(resolveKnowledgePaths(root,mapPath).mapPath,'utf8'));}

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
    duplicate_model_groups_across_repositories:[...blobs.values()].filter(x=>new Set(x.map(o=>o.repository)).size>1).length,
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
    '# 3D technical knowledge lookup','',
    '<!-- Generated by node tools/3d-knowledge.mjs render. Edit the JSON source, not this projection. -->','',
    'This lookup follows existing project authorities. Search results do not establish source recovery, rights, accepted output or production readiness.','',
    '## Use it before work','',
    '```sh','node tools/3d-knowledge.mjs search asset','node tools/3d-knowledge.mjs summary','node tools/3d-knowledge.mjs gaps','node tools/check-before-create.mjs asset bike','```','',
    'The public default contains repo-local technical pointers. Cross-project lessons and recipe curation are supplied through an explicit authorized local JSON file:','',
    '```sh',"export KONA_3D_KNOWLEDGE_MAP='/absolute/private/path/KNOWLEDGE_MAP.json'",'node tools/check-before-create.mjs asset sofa','node tools/3d-knowledge.mjs search sofa --kind recipe','node tools/3d-knowledge.mjs check','```','',
    'Alternatively use `node tools/3d-knowledge.mjs search sofa --map /absolute/private/path/KNOWLEDGE_MAP.json`. The CLI flag takes precedence over the environment. A missing or invalid configured input fails visibly without falling back. Nothing is downloaded, executed or promoted.','',
    'Private input and output stay local. Do not commit, bundle, paste into public CI logs or publish that file, generated guide or search results. For a configured map, `render` and `check` use the adjacent `.md` file; they do not overwrite this public guide. Existing public Git history is not erased by changing the current tree.','',
    '## Snapshot and limits','',
    `Observed ${data.updated_at}: ${s.records} records across ${s.sources} sources; ${s.by_kind.recipe||0} recipe pointers; ${s.model_occurrences} model occurrences / ${s.distinct_model_blobs} distinct Git blobs. Duplicate groups: ${s.duplicate_model_groups} across all locations, ${s.duplicate_model_groups_across_repositories} spanning repositories. These units do not establish accepted assets, rights or safe deletion.`,
    '',...data.scope.limitations.map(x=>'- '+x),'',
    '## Source and lifecycle policy','',
    '- `source-inspected` is not an independent rebuild or physical-device test.',
    '- `reported-in-source` retains a cited observation without promoting it to independently measured fact.',
    '- `historical-observation` stays bound to its revision or run.',
    '- `candidate` requires its adoption gate. A lookup pointer does not promote its implementation.',
    '- Preserve IDs, pinned sources, contradictions and superseded lineage. Update affected records when sources change or delivery produces new evidence.','',
    '## Project and workflow map','',
    '| ID | Source and scope | Use and gate |','| --- | --- | --- |'];
  for(const r of data.records.filter(x=>['project','workflow'].includes(x.kind))){const source=data.sources.find(x=>x.id===r.source_ids[0]);lines.push(`| \`${esc(r.id)}\` | [${esc(r.title)}](${source.url}) - ${esc(r.summary)} | ${esc(r.use_when)} **Gate:** ${esc(r.adoption_gate)} |`);}
  const lessons=data.records.filter(x=>x.kind==='lesson');
  if(lessons.length){
    lines.push('','## Reusable lessons','','| ID | Lesson and evidence scope | Apply and verify |','| --- | --- | --- |');
    for(const r of lessons){const source=data.sources.find(x=>x.id===r.source_ids[0]);lines.push(`| \`${esc(r.id)}\` | [${esc(r.title)}](${source.url}) (${esc(r.evidence)}). ${esc(r.summary)} | ${esc(r.use_when)} **Gate:** ${esc(r.adoption_gate)} |`);}
  }
  for(const kind of ['capability','benchmark','recipe','gap','decision']){
    const rows=data.records.filter(x=>x.kind===kind);if(!rows.length)continue;
    lines.push('',`## ${kind==='gap'?'Unresolved gates':kind[0].toUpperCase()+kind.slice(1)+' pointers'}`,'');
    for(const r of rows){const source=data.sources.find(x=>x.id===r.source_ids[0]);lines.push(`- [${esc(r.title)}](${source.url}) (\`${esc(r.id)}\`; ${esc(r.status)}): ${esc(r.summary)} **Gate:** ${esc(r.adoption_gate)}`);}
  }
  lines.push('','## Update and validation','','```sh','node tools/3d-knowledge.mjs validate','node tools/3d-knowledge.mjs render','node tools/3d-knowledge.mjs check','node --test web/test/3d-knowledge.test.mjs','```','',
    'The unit suite uses synthetic private-map fixtures; commercial curation is not a public test dependency. Source claims remain separate from reproduced results and consumer acceptance.','');
  return lines.join('\n');
}

export function main(args=process.argv.slice(2)){
  const filtered=[];let mapPath;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--map'){
      if(mapPath!==undefined||!args[i+1]||args[i+1].startsWith('--')){console.error('--map requires exactly one JSON path');return 2;}
      mapPath=args[++i];
    }else filtered.push(args[i]);
  }
  const [command,...rest]=filtered;let data,paths;
  try{paths=resolveKnowledgePaths(ROOT,mapPath);data=loadKnowledge(ROOT,paths.mapPath);}
  catch{console.error('3D knowledge input could not be loaded. No fallback was used; check the explicit local input.');return 1;}
  const errors=validateKnowledge(data);
  if(errors.length){console.error(errors.join('\n'));return 1;}
  const json=rest.includes('--json');
  if(command==='validate'){console.log(JSON.stringify({status:'PASS',...summarizeKnowledge(data)},null,2));return 0;}
  if(command==='summary'){console.log(JSON.stringify(summarizeKnowledge(data),null,2));return 0;}
  if(command==='render'){fs.writeFileSync(paths.guidePath,renderKnowledgeGuide(data));console.log(paths.configured?'Updated configured local knowledge guide.':'Updated '+GUIDE_PATH);return 0;}
  if(command==='check'){if(!fs.existsSync(paths.guidePath)||fs.readFileSync(paths.guidePath,'utf8')!==renderKnowledgeGuide(data)){console.error('Knowledge guide is stale; run node tools/3d-knowledge.mjs render');return 1;}console.log('3D knowledge guide: PASS');return 0;}
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
  console.error('usage: node tools/3d-knowledge.mjs <validate|summary|render|check|search QUERY [--kind KIND] [--json]|show ID|gaps|duplicates> [--map LOCAL.json]');return 2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=main();
