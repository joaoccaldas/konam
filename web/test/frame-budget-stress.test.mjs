import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameBudget} from '../src/render/frame-budget.js';
// Synthetic policy stress: NOT real GPU, device, FPS or visual-quality evidence.
function simulate(label,count,frame,config={}) {
 const q=createFrameBudget({windowSize:20,cooldownWindows:0,...config});
 let changes=0,invalid=0;
 for(let i=0;i<count;i++){
  const x=q.observe(frame(i));
  if(x.changed)changes++;
  if(x.reason==='invalid-sample')invalid++;
  assert.ok(q.scale>=.65-1e-8&&q.scale<=1+1e-8,label+' unbounded scale');
 }
 return {changes,invalid,scale:q.scale,p95:q.lastP95};
}
test('steady 16ms remains high quality',()=>assert.deepEqual(simulate('steady',200,()=>16),{changes:0,invalid:0,scale:1,p95:16}));
test('steady 45ms reduces scale no lower than floor',()=>{
 const x=simulate('heavy',200,()=>45);assert.equal(x.scale,.65);assert.ok(x.changes<=5);
});
test('one stall exceeding filter limit never drives scaling',()=>{
 const x=simulate('pause',400,i=>i%40===0?1001:18);assert.equal(x.scale,1);assert.equal(x.invalid,10);
});
test('oscillatory scenes remain bounded and reveal churn',()=>{
 const x=simulate('oscillating',1000,i=>30+20*Math.sin(i/15));
 assert.ok(x.changes<=30,'unexpected change oscillation: '+x.changes);
 // This is a characterization threshold, not acceptance for a live deployment.
});
test('million-pixel framebuffer budget remains enforced',()=>{
 const q=createFrameBudget({maxPixelCount:1_000_000});
 for(const [w,h,dpr] of [[4000,3000,3],[390,844,4],[2560,1440,2]]){
  const ratio=q.pixelRatio({width:w,height:h,devicePixelRatio:dpr});
  assert.ok(w*h*ratio*ratio<=1_000_001);
 }
});
