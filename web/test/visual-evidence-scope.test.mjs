import test from 'node:test';
import assert from 'node:assert/strict';
import {requiresVisualEvidence,visualScope} from '../../tools/visual-evidence-scope.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const pr={pull_request:{base:{sha:a},head:{sha:b}}};

test('known documentation and lookup-only changes can avoid browser capture',()=>{
  assert.equal(requiresVisualEvidence(['README.md','docs/architecture/3D_KNOWLEDGE_MAP.json','docs/architecture/3D_KNOWLEDGE_MAP.md','tools/3d-knowledge.mjs','tools/check-before-create.mjs','web/test/3d-knowledge.test.mjs']),false);
});
test('every served source, builder and unknown path still requires the full visual matrix',()=>{
  for(const file of ['index.html','web/src/landing.js','web/styles/home.css','app/hall.js','world/konam/rooms/x.room.json','assets/x.glb','tools/build_pages.mjs','integrations/public-catalog.json','docs/runtime.json','new-unclassified-file'])assert.equal(requiresVisualEvidence([file]),true,file);
});
test('workflow or detector changes require full visual execution',()=>{
  assert.equal(requiresVisualEvidence(['.github/workflows/visual-evidence-v2.yml']),true);
  assert.equal(requiresVisualEvidence(['tools/visual-evidence-scope.mjs']),true);
});
test('manual, missing, invalid and initial-push comparisons run the matrix',()=>{
  const unused=()=>{throw Error('not needed');};
  assert.equal(visualScope('workflow_dispatch',{},unused).run_visual,true);
  assert.equal(visualScope('pull_request',{},unused).run_visual,true);
  assert.equal(visualScope('push',{before:'0'.repeat(40),after:b},unused).run_visual,true);
  assert.equal(visualScope('push',{before:'--unsafe',after:b},unused).run_visual,true);
});
test('PR and push comparisons use exact refs and only skip known nonvisual changes',()=>{
  let seen;const docs=(base,head)=>{seen=[base,head];return ['docs/example.md'];};
  assert.equal(visualScope('pull_request',pr,docs).run_visual,false);assert.deepEqual(seen,[a,b]);
  assert.equal(visualScope('push',{before:a,after:b},()=>['web/src/landing.js']).run_visual,true);
});
test('failed, empty or malformed comparisons require the full matrix',()=>{
  assert.equal(visualScope('pull_request',pr,()=>{throw Error('unavailable');}).run_visual,true);
  for(const files of [[],null,['../outside.md'],['/absolute.md'],[null]])assert.equal(requiresVisualEvidence(files),true);
});
