import test from 'node:test';import assert from 'node:assert/strict';
import {assetPriority,desiredLod,deviceBudget,shouldRelease,availableLod} from '../src/world/streaming-policy.js';
import {disposeObject3D} from '../src/world/disposal.js';
test('visible forward current-room assets outrank hidden equivalents',()=>assert.ok(assetPriority({distance:10,visible:true,facing:true,currentRoom:true})>assetPriority({distance:8,visible:false,facing:false,currentRoom:false})));
test('inspect explicitly requests engineering detail',()=>assert.equal(desiredLod({distance:20,intent:'inspect'}),'engineering'));
test('low budget releases sooner',()=>assert.equal(shouldRelease({distance:30,secondsAway:4,budget:'low'}),true));
test('device budget responds to memory/cores/data saving',()=>{assert.equal(deviceBudget({memoryGB:2,cores:8}),'low');assert.equal(deviceBudget({memoryGB:8,cores:8}),'high');assert.equal(deviceBudget({memoryGB:8,cores:8,reducedData:true}),'low');});
test('disposal de-duplicates shared GPU resources',()=>{let gd=0,md=0,td=0;const tex={isTexture:true,dispose:()=>td++},mat={map:tex,dispose:()=>md++},geo={dispose:()=>gd++};const root={parent:{remove(){}},traverse(fn){fn({geometry:geo,material:mat});fn({geometry:geo,material:mat});}};assert.deepEqual(disposeObject3D(root),{geometries:1,materials:1,textures:1});assert.deepEqual([gd,md,td],[1,1,1]);});

test('unloading a room preserves resources still owned by another room',()=>{
 let geometryDisposals=0,materialDisposals=0,textureDisposals=0;
 const texture={isTexture:true,dispose:()=>textureDisposals++};
 const sharedMaterial={map:texture,dispose:()=>materialDisposals++};
 const sharedGeometry={dispose:()=>geometryDisposals++};
 const root={traverse(fn){fn({geometry:sharedGeometry,material:sharedMaterial});}};
 const retainedMaterials=new Set([sharedMaterial]);
 assert.deepEqual(disposeObject3D(root,{retainedMaterials,retainedGeometries:new Set([sharedGeometry])}),{geometries:0,materials:0,textures:0});
 assert.deepEqual([geometryDisposals,materialDisposals,textureDisposals],[0,0,0]);
 assert.equal(retainedMaterials.size,1);
 assert.deepEqual(disposeObject3D(root),{geometries:1,materials:1,textures:1});
});
test('visible, pinned and inspected assets survive distance-based eviction',()=>{
 for(const guard of [{visible:true},{pinned:true},{intent:'inspect'},{currentRoom:true}])
   assert.equal(shouldRelease({distance:100,secondsAway:60,budget:'low',...guard}),false);
 assert.equal(shouldRelease({distance:100,secondsAway:60,budget:'low'}),true);
});
test('detail requests fall back only to declared representations',()=>{
 assert.equal(availableLod('engineering',['proxy','museum']),'museum');
 assert.equal(availableLod('hero',['proxy','hero']),'hero');
 assert.equal(availableLod('proxy',['hero']),'none');
 assert.equal(availableLod('hero',[]),'none');
 assert.equal(availableLod('invalid',['hero']),'none');
 assert.equal(availableLod('none',['proxy']),'none');
});
