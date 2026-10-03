import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const ROOT=path.resolve(import.meta.dirname,'../..');const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');const json=p=>JSON.parse(read(p));
test('NOR3 public review is hidden from canonical navigation and room registry',()=>{const rooms=json('museum/world/rooms.json');assert.equal((rooms.areas||[]).some(x=>JSON.stringify(x).includes('norwegian-engine')),false);const html=read('norwegian-engine-review.html');assert.match(html,/noindex,nofollow/);});
test('NOR3 review consumes canonical brand tokens and generic review shell',()=>{const html=read('norwegian-engine-review.html');assert.match(html,/brand\/tokens\.css/);assert.match(html,/web\/styles\/room-review\.css/);assert.doesNotMatch(html,/<style>/);});
test('NOR3 review snapshot is provenance-bound to PR15 and owns no runtime',()=>{const src=read('web/src/review/norwegian-installation.snapshot.js');assert.match(src,/6e0c7d541ec2826c46bbe2ee9286c57200aa31c8/);assert.match(src,/function norwegian\(ctx\)/);assert.doesNotMatch(src,/WebGLRenderer|PerspectiveCamera|OrbitControls|RoomEnvironment/);});
test('NOR3 review harness is review-only and uses KONA render semantics',()=>{const src=read('web/src/room-review-norwegian.js');assert.match(src,/buildNorwegianReview/);assert.match(src,/THREE\.AgXToneMapping/);assert.match(src,/THREE\.PCFShadowMap/);});

test('NOR3 cinematic v3 adds semantic inspection and trailer without creating room runtime authority',()=>{
 const snap=read('web/src/review/norwegian-installation.snapshot.js');
 const runtime=read('web/src/room-review-norwegian.js');
 const html=read('norwegian-engine-review.html');
 assert.match(snap,/REVIEW_VARIANT='cinematic-production-v3'/);
 assert.match(snap,/reviewPickables/);
 assert.match(snap,/Environment bay|Recovery bench|Fjord relief/);
 assert.match(runtime,/trailerOrder/);
 assert.match(runtime,/inspectAt/);
 assert.match(runtime,/pinchDistance/);
 assert.match(html,/data-view="trailer"/);
 assert.match(html,/data-view="recovery"/);
 assert.doesNotMatch(snap,/WebGLRenderer|PerspectiveCamera|OrbitControls|RoomEnvironment/);
});
