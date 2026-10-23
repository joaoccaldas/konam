import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSemanticGLB} from '../../tools/validate-semantic-glb.mjs';
const ids=['base','shaft','impeller'];
function fixture({rename=false,brokenIndices=false}={}){
 const model={asset:{version:'2.0'},nodes:ids.map((name,i)=>({name:rename&&i===1?'broken':name,mesh:i})),meshes:ids.map(()=>({primitives:[{attributes:{POSITION:0},indices:1}]})),accessors:[{type:'VEC3',count:3},{type:'SCALAR',count:brokenIndices?4:3}],buffers:[{byteLength:4}]};
 const j=Buffer.from(JSON.stringify(model));const pad=(4-j.length%4)%4;const json=Buffer.concat([j,Buffer.alloc(pad,32)]);const bin=Buffer.alloc(4);
 const h=Buffer.alloc(12);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(12+8+json.length+8+bin.length,8);
 const ch=(type,b)=>{const t=Buffer.alloc(8);t.writeUInt32LE(b.length,0);t.write(type,4,4,'ascii');return Buffer.concat([t,b]);};
 return Buffer.concat([h,ch('JSON',json),ch('BIN\0',bin)]);
}
test('preserves exact semantic identities and triangle primitive counts',()=>{const r=validateSemanticGLB(fixture(),ids);assert.equal(r.semantic_nodes,3);assert.equal(r.triangles,3);});
test('rejects truncated byte stream',()=>assert.throws(()=>validateSemanticGLB(fixture().subarray(0,-1),ids)));
test('rejects a renamed component',()=>assert.throws(()=>validateSemanticGLB(fixture({rename:true}),ids),/semantic IDs/));
test('rejects malformed triangle accessor',()=>assert.throws(()=>validateSemanticGLB(fixture({brokenIndices:true}),ids),/triangle indices/));