import test from 'node:test';
import assert from 'node:assert/strict';
import {assertInspectionDescriptor} from '../src/world/protocol.mjs';
const valid=()=>({version:1,worldId:'kona',entityId:'bike-01',assetId:'bike-asset-01',parts:[{id:'frame',label:'Frame'},{id:'wheel',label:'Wheel'}]});
test('synthetic inspection descriptor is renderer-independent',()=>{
 const a=assertInspectionDescriptor(valid());
 assert.equal(a.parts[0].id,'frame');assert.ok(Object.isFrozen(a));assert.ok(Object.isFrozen(a.parts));
 assert.equal(JSON.stringify(a).includes('THREE'),false);
});
test('duplicate part identities rejected',()=>{
 const a=valid();a.parts.push({id:'frame',label:'Other'});assert.throws(()=>assertInspectionDescriptor(a),/duplicate/);
});
test('invalid object and IDs rejected',()=>{
 assert.throws(()=>assertInspectionDescriptor(null),/descriptor/);
 const a=valid();a.assetId='../bad';assert.throws(()=>assertInspectionDescriptor(a),/assetId/);
});
test('unbounded content and malformed part rejected',()=>{
 const a=valid();a.parts=Array.from({length:257},(_,i)=>({id:'part-'+i,label:'Part'}));
 assert.throws(()=>assertInspectionDescriptor(a),/bounded/);
 const b=valid();b.parts[0].label='';assert.throws(()=>assertInspectionDescriptor(b),/label/);
});
test('unsupported version rejected',()=>{
 const a=valid();a.version=2;assert.throws(()=>assertInspectionDescriptor(a),/version/);
});
