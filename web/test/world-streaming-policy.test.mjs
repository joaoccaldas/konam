import test from 'node:test';import assert from 'node:assert/strict';
import {assetPriority,desiredLod,deviceBudget,shouldRelease} from '../src/world/streaming-policy.js';
import {disposeObject3D} from '../src/world/disposal.js';
test('visible forward current-room assets outrank hidden equivalents',()=>assert.ok(assetPriority({distance:10,visible:true,facing:true,currentRoom:true})>assetPriority({distance:8,visible:false,facing:false,currentRoom:false})));
test('inspect explicitly requests engineering detail',()=>assert.equal(desiredLod({distance:20,intent:'inspect'}),'engineering'));
test('low budget releases sooner',()=>assert.equal(shouldRelease({distance:30,secondsAway:4,budget:'low'}),true));
test('device budget responds to memory/cores/data saving',()=>{assert.equal(deviceBudget({memoryGB:2,cores:8}),'low');assert.equal(deviceBudget({memoryGB:8,cores:8}),'high');assert.equal(deviceBudget({memoryGB:8,cores:8,reducedData:true}),'low');});
test('disposal de-duplicates shared GPU resources',()=>{let gd=0,md=0,td=0;const tex={isTexture:true,dispose:()=>td++},mat={map:tex,dispose:()=>md++},geo={dispose:()=>gd++};const root={parent:{remove(){}},traverse(fn){fn({geometry:geo,material:mat});fn({geometry:geo,material:mat});}};assert.deepEqual(disposeObject3D(root),{geometries:1,materials:1,textures:1});assert.deepEqual([gd,md,td],[1,1,1]);});
