import test from 'node:test';import assert from 'node:assert/strict';
import {auditCatalog} from './catalog.mjs';import {resolveCompatibility} from './compatibility.mjs';
const src=[{label:'fixture evidence',file:'fixture'}];
test('museum edition shares physical representation',()=>{const x=auditCatalog({products:[{id:'a',type:'bike',brand:'x',name:'study',origin:'geometry-study',sources:src,glb:'g.glb'},{id:'b',type:'bike',brand:'x',name:'edition',origin:'museum-edition',base:'a',sources:src,glb:'g.glb'}]});assert.deepEqual(x.errors,[]);assert.equal(x.distinctGlbs,1);assert.equal(x.museumEditions,1);assert.equal(x.nonEditionEntities,1);});
test('duplicate ids fail',()=>{const p={id:'a',type:'bike',brand:'x',name:'x',origin:'type-study',sources:src};assert.ok(auditCatalog({products:[p,p]}).errors.length);});
test('no verified compatibility rule means unknown',()=>{assert.equal(resolveCompatibility({bikeId:'a',componentId:'b'}).result,'unknown');});
test('candidate compatibility never accepted',()=>{assert.equal(resolveCompatibility({bikeId:'a',componentId:'b',rules:[{id:'1',bike_id:'a',component_id:'b',source_ref:'doc',review_status:'candidate',result:'compatible'}]}).result,'unknown');});
test('conflicting verified rules return unknown',()=>{const rules=['compatible','incompatible'].map((result,i)=>({id:String(i),bike_id:'a',component_id:'b',result,review_status:'verified',source_ref:'doc'}));assert.equal(resolveCompatibility({bikeId:'a',componentId:'b',rules}).result,'unknown');});
