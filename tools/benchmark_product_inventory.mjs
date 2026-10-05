// Deterministic file/geometry inventory, NOT a runtime or visual benchmark.
// Usage: node tools/benchmark_product_inventory.mjs > report.json
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const catalog=JSON.parse(fs.readFileSync('museum/catalog/products.json','utf8'));
const paths=[...new Set(catalog.products.map(p=>p.glb).filter(Boolean))].sort();
const assets=paths.map(path=>{
 const bytes=fs.readFileSync(path);
 if(bytes.toString('utf8',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2)throw new Error('Invalid GLB '+path);
 if(bytes.readUInt32LE(16)!==0x4e4f534a)throw new Error('Missing JSON chunk '+path);
 const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 const primitives=(gltf.meshes||[]).flatMap(mesh=>mesh.primitives);
 let meshTriangles=0;
 for(const p of primitives){
  const count=gltf.accessors?.[p.indices??p.attributes?.POSITION]?.count||0;
  if((p.mode??4)===4)meshTriangles+=count/3;
  else if([5,6].includes(p.mode))meshTriangles+=Math.max(0,count-2);
 }
 return{path,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,meshTriangles,primitives:primitives.length,materials:gltf.materials?.length||0,extensions:gltf.extensionsUsed||[],products:catalog.products.filter(p=>p.glb===path).map(p=>p.id)};
});
console.log(JSON.stringify({schema_version:1,kind:'static-product-baseline',source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),limitations:['Mesh triangle count is per mesh definition, not per rendered instance or draw call.','File bytes are not decoded GPU memory.','No FPS, mobile thermal, LOD visual parity, or quality improvement is established.'],products:catalog.products.length,uniqueAssets:assets.length,totalUniqueBytes:assets.reduce((n,a)=>n+a.bytes,0),productsWithExplicitLodMap:catalog.products.filter(p=>p.lod&&Object.keys(p.lod).length).length,assets},null,2));
