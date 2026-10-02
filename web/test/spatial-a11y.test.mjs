import test from 'node:test';import assert from 'node:assert/strict';
import {createSpatialAnnouncer,focusArtifactDom} from '../src/a11y/spatial.js';
test('rapid spatial updates announce only the settled item',()=>{const region={textContent:''};let cb=null;const a=createSpatialAnnouncer({region,setTimer:f=>(cb=f,1),clearTimer:()=>{cb=null;}});a.announce('Bike A');a.announce('Bike B');cb();assert.equal(region.textContent,'Bike B');});
test('duplicate announcement is suppressed after delivery',()=>{const region={textContent:''};let count=0,cb;const a=createSpatialAnnouncer({region,setTimer:f=>(cb=f,++count),clearTimer:()=>{}});a.announce('Bike');cb();a.announce('Bike');assert.equal(count,1);});
test('3D selection can focus corresponding DOM artifact',()=>{let focused=false;const el={hasAttribute:()=>false,setAttribute(){},focus(){focused=true;}};const root={querySelector:q=>q.includes('bike-1')?el:null};assert.equal(focusArtifactDom('bike-1',{root}),true);assert.equal(focused,true);});
