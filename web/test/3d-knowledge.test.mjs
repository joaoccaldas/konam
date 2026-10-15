import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT, GUIDE_PATH, loadKnowledge, validateKnowledge, summarizeKnowledge, searchKnowledge, findModelOccurrences, renderKnowledgeGuide} from '../../tools/3d-knowledge.mjs';

const current=loadKnowledge();
const copy=()=>structuredClone(current);
const invalid=(data,expected)=>assert.ok(validateKnowledge(data).some(x=>expected.test(x)),validateKnowledge(data).join('\n'));

test('curated map has resolved citations and real local baseline sources',()=>{
  assert.deepEqual(validateKnowledge(current),[]);
  assert.ok(current.records.some(x=>x.kind==='lesson'));
  assert.ok(current.records.some(x=>x.kind==='recipe'));
});

test('duplicate records and orphan citations fail instead of silently overwriting knowledge',()=>{
  const data=copy();data.records.push(structuredClone(data.records[0]));invalid(data,/duplicate record/);
  const orphan=copy();orphan.records[0].source_ids=['missing-evidence'];invalid(orphan,/unknown source/);
});

test('floating research refs and source URLs that disagree with their pinned locator fail',()=>{
  const data=copy();data.sources.find(x=>x.kind==='repository-file').ref='main';invalid(data,/full pinned commit/);
  const mismatch=copy();mismatch.sources[0].url='https://github.com/other/repo';invalid(mismatch,/URL does not match/);
});

test('missing on-disk source references and path traversal are rejected',()=>{
  const data=copy();data.sources[0].path='docs/nonexistent-knowledge-source.md';data.sources[0].url=`https://github.com/${data.sources[0].repository}/blob/${data.sources[0].ref}/${data.sources[0].path}`;
  invalid(data,/local baseline source missing/);
  const traversal=copy();traversal.sources[0].path='../external-file';invalid(traversal,/unsafe or empty source path/);
});

test('private workstation paths and credential-bearing URLs cannot enter the public projection',()=>{
  const data=copy();data.records[0].summary=['','Users','example','private-source'].join('/');invalid(data,/prohibited private data/);
  const signed=copy();signed.sources.find(x=>x.kind==='public-reference').url='https://example.test/asset?token=example';invalid(signed,/without credentials/);
});

test('a recipe or locator cannot self-promote into accepted or rights-cleared content',()=>{
  const data=copy();data.records.find(x=>x.kind==='recipe').status='active-pointer';invalid(data,/recipe pointers must remain candidates/);
  const promoted=copy();promoted.model_occurrences[0].acceptance='approved';invalid(promoted,/must not claim rights or acceptance/);
});

test('lifecycle links and structured field types are checked without crashing',()=>{
  const data=copy();data.records[0].related_ids=['unknown-record'];invalid(data,/unknown related record/);
  const bad=copy();bad.records[0].source_ids={};invalid(bad,/source citations required/);
  const nulls=copy();nulls.records.push(null);nulls.sources.push(null);nulls.model_occurrences.push(null);invalid(nulls,/must be an object/);
});

test('model occurrence metadata preserves separate locations and coherent blob sizes',()=>{
  const data=copy();data.model_occurrences.push(structuredClone(data.model_occurrences[0]));invalid(data,/duplicate model occurrence/);
  const inconsistent=copy();const first=inconsistent.model_occurrences[0];inconsistent.model_occurrences.push({...first,path:'assets/synthetic-different-path.glb',bytes:first.bytes+1});invalid(inconsistent,/inconsistent byte counts/);
});

test('snapshot metrics derive from occurrence groups and are not accepted-asset counts',()=>{
  const summary=summarizeKnowledge(current);
  assert.equal(summary.model_occurrences,current.model_occurrences.length);
  assert.equal(summary.distinct_model_blobs,new Set(current.model_occurrences.map(x=>x.git_blob_id)).size);
  assert.ok(summary.duplicate_occurrence_bytes>0);
  assert.match(summary.evidence_limit,/not executed acceptance/);
});

test('search resolves accent-insensitive sources, existing recipes and applicable failure gates',()=>{
  assert.ok(searchKnowledge(current,'Gaudí').some(x=>x.id==='project:gaudi'));
  assert.ok(searchKnowledge(current,'sofa',{kind:'recipe'}).some(x=>x.id==='recipe:sofa_two_seat'));
  assert.ok(searchKnowledge(current,'metrology').some(x=>x.id==='lesson:metrology-boundary'));
  assert.equal(searchKnowledge(current,'unrelated-synthetic-missing-term').length,0);
  assert.ok(findModelOccurrences(current,'speedmax').length>0);
});

test('generated guide is current and preserves unresolved evidence rather than publishing a PASS claim',()=>{
  assert.equal(fs.readFileSync(path.join(ROOT,GUIDE_PATH),'utf8'),renderKnowledgeGuide(current));
  assert.match(renderKnowledgeGuide(current),/not an independent rebuild/);
  assert.match(renderKnowledgeGuide(current),/Unresolved gates/);
});

test('existing pre-create lookup actually uses the map and surfaces a known candidate issue',()=>{
  const result=spawnSync(process.execPath,['tools/check-before-create.mjs','asset','sofa'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/recipe:sofa_two_seat/);
  assert.match(result.stdout,/lesson:procedural-boundary/);
  assert.match(result.stdout,/pointers, not promotion approval/);
});

test('CLI search has machine-readable evidence, source lookup and honest empty results',()=>{
  const result=spawnSync(process.execPath,['tools/3d-knowledge.mjs','search','sofa','--kind','recipe','--json'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const data=JSON.parse(result.stdout);assert.ok(data.records.every(x=>x.kind==='recipe'&&x.sources.length));
  const empty=spawnSync(process.execPath,['tools/3d-knowledge.mjs','search','unrelated-synthetic-missing-term'],{cwd:ROOT,encoding:'utf8'});
  assert.match(empty.stdout,/coverage gap, not permission/);
});
