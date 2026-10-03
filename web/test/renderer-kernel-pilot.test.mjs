// Release certification trigger: Experiences renderer migration + generated page are validated together.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Collectible Stage delegates renderer authority to the R0 kernel',()=>{
  const stage=read('src/ui/collectible-stage.js');
  const kernel=read('src/render/renderer.js');
  assert.match(stage,/createRendererContext/);
  assert.doesNotMatch(stage,/new\s+THREE\.WebGLRenderer\s*\(/);
  assert.match(stage,/__collectibleRendererAuthority='shared-r0'/);
  assert.match(kernel,/new\s+THREE\.WebGLRenderer\s*\(/);
  assert.match(kernel,/visibilitychange/);
  assert.match(kernel,/renderer\.dispose\(\)/);
});

test('kernel owns GPU lifecycle but not camera or controls',()=>{
  const kernel=read('src/render/renderer.js');
  assert.doesNotMatch(kernel,/PerspectiveCamera/);
  assert.doesNotMatch(kernel,/OrbitControls/);
  assert.doesNotMatch(kernel,/GLTFLoader/);
});

test('Race Self delegates renderer lifecycle while keeping camera and controls local',()=>{
  const stage=read('src/ui/race-self-stage.js');
  assert.match(stage,/createRendererContext/);
  assert.doesNotMatch(stage,/new\s+THREE\.WebGLRenderer\s*\(/);
  assert.match(stage,/new\s+THREE\.PerspectiveCamera\s*\(/);
  assert.match(stage,/new\s+OrbitControls\s*\(/);
  assert.match(stage,/__raceSelfRendererAuthority='shared-r0'/);
  assert.match(stage,/renderContext\.dispose\(\{forceContextLoss:true\}\)/);
});

test('shared Experiences stage delegates renderer lifecycle but keeps camera systems local',()=>{
  const engine=read('src/exp/engine.js');
  const main=read('src/exp/main.js');
  assert.match(engine,/createRendererContext/);
  assert.doesNotMatch(engine,/new\s+THREE\.WebGLRenderer\s*\(/);
  assert.match(engine,/new\s+THREE\.PerspectiveCamera\s*\(/);
  assert.match(engine,/export function orbit/);
  assert.match(engine,/export function rail/);
  assert.match(engine,/environmentTarget\?\.dispose/);
  assert.match(engine,/pmrem\.dispose\(\)/);
  assert.match(engine,/renderContext\.dispose\(\{ forceContextLoss: true \}\)/);
  assert.match(main,/pagehide[\s\S]*stage\.dispose\(\)/);
});
