import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT, MAP_PATH, GUIDE_PATH, resolveKnowledgePaths, loadKnowledge, validateKnowledge, summarizeKnowledge, searchKnowledge, findModelOccurrences, renderKnowledgeGuide} from '../../tools/3d-knowledge.mjs';

const current=loadKnowledge(ROOT,MAP_PATH);
const env={...process.env,KONA_3D_KNOWLEDGE_MAP:''};
const cli=(args,extra={})=>spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',env:{...env,...extra}});
// Synthetic inputs exercise the local workflow without publishing commercial curation.
function fixture(){
  const data=structuredClone(current);
  data.sources.push({id:'synthetic-reference',kind:'public-reference',role:'synthetic test fixture',url:'https://example.test/synthetic-reference',observed_at:'2026-10-15'});
  const common={summary:'Synthetic input, not a real asset or measured result.',status:'candidate',evidence:'proposed',source_ids:['synthetic-reference'],tags:['synthetic'],use_when:'Only in this boundary test.',adoption_gate:'Synthetic fixture requires independent consumer evidence.',related_ids:[]};
  data.records.push({...common,id:'lesson:synthetic',kind:'lesson',title:'Café synthetic lesson'},
    {...common,id:'recipe:synthetic_fixture',kind:'recipe',title:'Synthetic fixture recipe',source_entry:'synthetic_fixture'},
    {...common,id:'gap:synthetic',kind:'gap',status:'unresolved',title:'Synthetic unresolved gate'});
  const model={repository:'joaoccaldas/konam',ref:data.scope.konam_baseline_ref,path:'assets/synthetic-a.glb',git_blob_id:'a'.repeat(40),bytes:1234,rights_review:'not-performed',acceptance:'not-established'};
  data.model_occurrences=[model,{...model,path:'assets/synthetic-b.glb'}];
  return data;
}
function withInput(fn){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kona-knowledge-'));
  const input=path.join(dir,'PRIVATE.json');fs.writeFileSync(input,JSON.stringify(fixture()));
  try{return fn(input,dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const invalid=(data,expected)=>assert.ok(validateKnowledge(data).some(x=>expected.test(x)),validateKnowledge(data).join('\n'));

test('public default contains only the deliberately small KONA contract projection',()=>{
  assert.deepEqual(validateKnowledge(current),[]);
  assert.equal(current.scope.publication,'public-repo-only');
  assert.deepEqual(current.scope.covered_public_repositories,['konam']);
  assert.equal(current.records.length,3);
  assert.ok(current.records.every(x=>['project','workflow'].includes(x.kind)));
  assert.ok(current.sources.every(x=>x.repository==='joaoccaldas/konam'));
  assert.deepEqual(current.model_occurrences,[]);
});

test('duplicate IDs, missing citations and unresolved relations fail',()=>{
  const data=fixture();data.records.push(structuredClone(data.records[0]));invalid(data,/duplicate record/);
  const orphan=fixture();orphan.records[0].source_ids=['missing'];invalid(orphan,/unknown source/);
  const related=fixture();related.records[0].related_ids=['missing'];invalid(related,/unknown related record/);
});

test('floating refs and URLs that disagree with pinned locators fail',()=>{
  const data=fixture();data.sources[0].ref='main';invalid(data,/full pinned commit/);
  const mismatch=fixture();mismatch.sources[0].url='https://github.com/other/repo';invalid(mismatch,/URL does not match/);
});

test('missing local sources, traversal and credential-bearing URLs are rejected',()=>{
  const data=fixture();data.sources[0].path='docs/nonexistent-knowledge-source.md';data.sources[0].url=`https://github.com/${data.sources[0].repository}/blob/${data.sources[0].ref}/${data.sources[0].path}`;invalid(data,/local baseline source missing/);
  const traversal=fixture();traversal.sources[0].path='../external-file';invalid(traversal,/unsafe or empty source path/);
  const signed=fixture();signed.sources.at(-1).url='https://example.test/asset?token=example';invalid(signed,/without credentials/);
});

test('source-pointer maps cannot embed workstation paths or self-approve recipes and models',()=>{
  const data=fixture();data.records[0].summary=['','Users','example','private-source'].join('/');invalid(data,/prohibited private data/);
  const recipe=fixture();recipe.records.find(x=>x.kind==='recipe').status='active-pointer';invalid(recipe,/recipe pointers must remain candidates/);
  const promoted=fixture();promoted.model_occurrences[0].acceptance='approved';invalid(promoted,/must not claim rights or acceptance/);
});

test('invalid field types and null entries fail without crashing',()=>{
  const data=fixture();data.records[0].source_ids={};invalid(data,/source citations required/);
  const nulls=fixture();nulls.records.push(null);nulls.sources.push(null);nulls.model_occurrences.push(null);invalid(nulls,/must be an object/);
});

test('duplicate locations and inconsistent blob sizes are rejected',()=>{
  const data=fixture();data.model_occurrences.push(structuredClone(data.model_occurrences[0]));invalid(data,/duplicate model occurrence/);
  const bad=fixture();bad.model_occurrences[1].bytes++;invalid(bad,/inconsistent byte counts/);
});

test('all-location duplicates and cross-repository duplicates have distinct denominators',()=>{
  const data=fixture();const summary=summarizeKnowledge(data);
  assert.equal(summary.duplicate_model_groups,1);assert.equal(summary.duplicate_model_groups_across_repositories,0);
  assert.equal(summary.duplicate_occurrence_bytes,1234);
  data.scope.covered_public_repositories.push('synthetic-mirror');
  data.model_occurrences.push({...data.model_occurrences[0],repository:'fixture/synthetic-mirror'});
  assert.deepEqual(validateKnowledge(data),[]);
  assert.equal(summarizeKnowledge(data).duplicate_model_groups_across_repositories,1);
});

test('synthetic local search resolves accent-insensitive evidence and candidate gates',()=>{
  const data=fixture();assert.ok(searchKnowledge(data,'cafe').some(x=>x.id==='lesson:synthetic'));
  assert.ok(searchKnowledge(data,'fixture',{kind:'recipe'}).some(x=>x.id==='recipe:synthetic_fixture'));
  assert.equal(findModelOccurrences(data,'synthetic').length,2);
  assert.equal(searchKnowledge(data,'unrelated-missing-term').length,0);
});

test('public guide is deterministic and explains private input and historical exposure',()=>{
  const guide=renderKnowledgeGuide(current);
  assert.equal(fs.readFileSync(path.join(ROOT,GUIDE_PATH),'utf8'),guide);
  assert.match(guide,/KONA_3D_KNOWLEDGE_MAP/);
  assert.match(guide,/Existing public Git history is not erased/);
  assert.doesNotMatch(guide,/recipe:synthetic_fixture/);
});

test('pre-create uses an explicitly configured local map without copying it into the repo',()=>withInput(input=>{
  const before=fs.readFileSync(path.join(ROOT,MAP_PATH),'utf8');
  const result=cli(['tools/check-before-create.mjs','asset','synthetic'],{KONA_3D_KNOWLEDGE_MAP:input});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/recipe:synthetic_fixture/);
  assert.match(result.stdout,/Configured local knowledge is active/);
  assert.equal(fs.readFileSync(path.join(ROOT,MAP_PATH),'utf8'),before);assert.ok(!result.stdout.includes(input));
}));

test('without configuration, pre-create uses the public contract projection only',()=>{
  const result=cli(['tools/check-before-create.mjs','asset','synthetic']);
  assert.equal(result.status,0,result.stderr);assert.doesNotMatch(result.stdout,/recipe:synthetic_fixture|Configured local knowledge/);
});

test('an unavailable configured map fails visibly instead of using the public fallback',()=>withInput((input,dir)=>{
  const missing=path.join(dir,'missing.json');
  for(const args of [['tools/check-before-create.mjs','asset','synthetic'],['tools/3d-knowledge.mjs','search','synthetic']]){
    const result=cli(args,{KONA_3D_KNOWLEDGE_MAP:missing});
    assert.equal(result.status,1);assert.match(result.stderr,/No fallback was used/);assert.ok(!result.stderr.includes(missing));
  }
}));

test('CLI --map overrides the environment and returns source-linked machine-readable results',()=>withInput(input=>{
  const result=cli(['tools/3d-knowledge.mjs','search','synthetic','--kind','recipe','--json','--map',input],{KONA_3D_KNOWLEDGE_MAP:'/unavailable/input.json'});
  assert.equal(result.status,0,result.stderr);
  const data=JSON.parse(result.stdout);assert.equal(data.records.length,1);assert.equal(data.records[0].id,'recipe:synthetic_fixture');
  assert.ok(data.records[0].sources.length);assert.equal(data.records[0].status,'candidate');
}));

test('configured render/check write beside the local map and leave the public guide unchanged',()=>withInput(input=>{
  const publicBefore=fs.readFileSync(path.join(ROOT,GUIDE_PATH),'utf8');
  assert.equal(cli(['tools/3d-knowledge.mjs','check','--map',input]).status,1);
  const rendered=cli(['tools/3d-knowledge.mjs','render','--map',input]);assert.equal(rendered.status,0,rendered.stderr);
  const guide=resolveKnowledgePaths(ROOT,input).guidePath;assert.match(fs.readFileSync(guide,'utf8'),/recipe:synthetic_fixture/);
  assert.equal(cli(['tools/3d-knowledge.mjs','check','--map',input]).status,0);
  assert.equal(fs.readFileSync(path.join(ROOT,GUIDE_PATH),'utf8'),publicBefore);
  fs.appendFileSync(guide,'drift');assert.equal(cli(['tools/3d-knowledge.mjs','check','--map',input]).status,1);
}));

test('invalid configured JSON fails closed and CLI input errors do not overwrite files',()=>withInput(input=>{
  fs.writeFileSync(input,'{invalid');
  const broken=cli(['tools/3d-knowledge.mjs','render','--map',input]);assert.equal(broken.status,1);assert.match(broken.stderr,/No fallback was used/);
  assert.equal(fs.readFileSync(input,'utf8'),'{invalid');
  assert.equal(cli(['tools/3d-knowledge.mjs','summary','--map']).status,2);
  assert.equal(cli(['tools/3d-knowledge.mjs','summary','--map',input,'--map',input]).status,2);
  assert.throws(()=>resolveKnowledgePaths(ROOT,input.replace(/json$/,'md')),/JSON file/);
}));

test('CLI empty results stay explicit about coverage limits',()=>{
  const result=cli(['tools/3d-knowledge.mjs','search','unrelated-missing-term']);
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/coverage gap, not permission/);
});
