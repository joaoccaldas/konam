import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {bakeTexture,encodePNG,evidence,validateOptions,MATERIALS} from '../tools/texture-bake.mjs';
test('validates caps, material and seed',()=>{for(const args of [{size:24},{size:2048},{material:'fake'},{seed:-1},{seed:1.4}])assert.throws(()=>validateOptions(args));});
test('all materials are deterministic, non-flat, opaque and decodable PNG',()=>{
 for(const material of MATERIALS){
  const a=bakeTexture({material,size:64,seed:71}),b=bakeTexture({material,size:64,seed:71});
  assert.deepEqual(a.data,b.data);assert(a.data.some((v,i)=>i%4===0&&v!==a.data[0]));
  for(let i=3;i<a.data.length;i+=4)assert.equal(a.data[i],255);
  const png=encodePNG(a);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),64);
  const pos=8+25,len=png.readUInt32BE(pos),raw=zlib.inflateSync(png.subarray(pos+8,pos+8+len));
  assert.equal(raw.length,64*(64*4+1));
 }
});
test('seed changes output and digests reproduce',()=>{
 const a=evidence({seed:1,size:32}),b=evidence({seed:2,size:32}),c=evidence({seed:1,size:32});
 assert.notEqual(a.sha256,b.sha256);assert.equal(a.sha256,c.sha256);
});
