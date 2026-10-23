import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {loadTerrainSite} from '../src/engine/terrain-portal.js';
const meta=()=>({schema:'konam.norseman-terrain/v1',id:'site',grid:2,width_m:100,height_m:100,bbox:{west:1,east:2,south:50,north:51},encoding:'uint16 LE decimetres, row-major, north row first'});
const source=(metadata=meta(),binary=new Uint8Array([1,0,0,1,2,0,3,0]))=>async url=>url.endsWith('.json')?new Response(JSON.stringify(metadata)):new Response(binary);
test('terrain decoder checks the grid and decodes little endian values',async()=>{
 const loaded=await loadTerrainSite('/terrain/','site',source());assert.deepEqual([...loaded.heights],[1,256,2,3]);
});
test('HTTP error pages are rejected before binary decoding',async()=>{
 const fetchSource=async url=>url.endsWith('.json')?new Response(JSON.stringify(meta())):new Response('<html>not found</html>',{status:404});
 await assert.rejects(loadTerrainSite('/terrain/','site',fetchSource),/Terrain request failed \(404\)/);
});
test('truncated and oversized terrain bodies fail against the metadata grid',async()=>{
 await assert.rejects(loadTerrainSite('/terrain/','site',source(meta(),new Uint8Array(7))),/byte length/);
 await assert.rejects(loadTerrainSite('/terrain/','site',source(meta(),new Uint8Array(9))),/byte budget/);
});
test('invalid dimensions, bounds, identity and encoding stop before fetching the binary',async()=>{
 for(const bad of [{...meta(),grid:1e8},{...meta(),grid:2.5},{...meta(),bbox:{west:2,east:1,south:50,north:51}},{...meta(),id:'other'},{...meta(),encoding:'unknown'}]){
  let calls=0;await assert.rejects(loadTerrainSite('/terrain/','site',async()=>{calls++;return new Response(JSON.stringify(bad));}),/Invalid terrain metadata/);assert.equal(calls,1);
 }
});
test('real Norseman terrain binaries are sealed as lazy assets and match their grids',async()=>{
 const root=new URL('../../',import.meta.url), manifest=JSON.parse(fs.readFileSync(new URL('app/app-manifest.json',root)));
 for(const id of ['eidfjord','gaustatoppen']){
  const path=`assets/rooms/norseman-training/${id}.bin`,raw=fs.readFileSync(new URL(path,root));
  assert.equal(manifest.files[path],crypto.createHash('sha256').update(raw).digest('base64'));assert.ok(!manifest.core.includes(path));
  const loaded=await loadTerrainSite('assets/rooms/norseman-training/',id,async path=>new Response(fs.readFileSync(new URL(path,root))));
  assert.equal(loaded.heights.length,385*385);
 }
});
