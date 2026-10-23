import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameBudget} from '../src/render/frame-budget.js';
const fill=(governor,value,count)=>{let result;for(let i=0;i<count;i++)result=governor.observe(value);return result;};
test('sustained slow frames lower resolution within floor',()=>{
 const q=createFrameBudget({windowSize:8,cooldownWindows:0,minScale:.75});
 assert.equal(fill(q,50,8).reason,'decrease');
 for(let i=0;i<10;i++)fill(q,50,8);
 assert.equal(q.scale,.75);
});
test('fast frames recover gradually with cooldown',()=>{
 const q=createFrameBudget({windowSize:8,cooldownWindows:1,minScale:.65});
 fill(q,50,8);assert.equal(q.scale,.9);
 assert.equal(fill(q,8,8).reason,'cooldown');
 assert.equal(fill(q,8,8).reason,'increase');
 assert.equal(q.scale,.95);
});
test('outliers only matter according to p95',()=>{
 const q=createFrameBudget({windowSize:20,cooldownWindows:0,targetMs:33.33});
 for(let i=0;i<19;i++)q.observe(20);
 const outcome=q.observe(60);
 assert.equal(outcome.reason,'decrease');
});
test('pixel cap bounds high resolution independent of scale',()=>{
 const q=createFrameBudget({maxPixelCount:1_000_000});
 assert.ok(q.pixelRatio({width:2000,height:2000,devicePixelRatio:3})<=.5);
});
test('invalid samples ignored and reset supported',()=>{
 const q=createFrameBudget({windowSize:8,cooldownWindows:0});
 assert.equal(q.observe(NaN).reason,'invalid-sample');
 fill(q,50,8);assert.ok(q.scale<1);q.reset();assert.equal(q.scale,1);
 assert.throws(()=>createFrameBudget({windowSize:0}),/invalid/);
});
