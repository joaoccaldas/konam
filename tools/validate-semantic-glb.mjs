import fs from 'node:fs';
import path from 'node:path';
export function validateSemanticGLB(buffer, expectedIds) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') throw Error('invalid GLB magic');
  if (buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) throw Error('invalid GLB version/length');
  let offset = 12, json = null, bin = null;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw Error('truncated GLB chunk');
    const size = buffer.readUInt32LE(offset), type = buffer.toString('ascii', offset + 4, offset + 8);
    offset += 8;
    if (size % 4 || offset + size > buffer.length) throw Error('invalid chunk alignment/length');
    if (type === 'JSON') {if (json) throw Error('duplicate JSON chunk'); json=JSON.parse(buffer.toString('utf8', offset, offset + size));}
    if (type === 'BIN\0') {if (bin) throw Error('duplicate binary chunk');bin=buffer.subarray(offset,offset+size);}
    offset += size;
  }
  if (!json || json.asset?.version !== '2.0' || !bin) throw Error('missing GLB structure');
  const nodes = json.nodes || [], meshes = json.meshes || [], accessors=json.accessors||[];
  const actual=nodes.filter(n=>n.mesh!==undefined).map(n=>n.name);
  if (actual.length !== expectedIds.length || new Set(actual).size !== actual.length || actual.some(n=>!expectedIds.includes(n))) throw Error('semantic IDs lost or duplicated');
  let triangles = 0;
  for (const node of nodes.filter(n=>n.mesh!==undefined)) {
    if (!Number.isInteger(node.mesh) || node.mesh<0 || node.mesh>=meshes.length) throw Error('invalid node mesh');
    for (const prim of meshes[node.mesh].primitives||[]) {
      if (prim.mode!==undefined && prim.mode!==4) throw Error('non-triangle primitive');
      const ai=prim.indices===undefined?null:accessors[prim.indices];
      const pos=accessors[prim.attributes?.POSITION];
      if (!pos || pos.type!=='VEC3' || pos.count<3) throw Error('invalid position accessor');
      const count=ai?ai.count:pos.count;
      if (!Number.isInteger(count) || count%3) throw Error('invalid triangle indices');
      triangles+=count/3;
    }
  }
  return {ok:true, semantic_nodes:actual.length, triangles, ids:actual.sort(), bytes:buffer.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const [file,manifestFile]=process.argv.slice(2);if(!file||!manifestFile)throw Error('usage: node validate-semantic-glb.mjs file.glb manifest.json');
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 console.log(JSON.stringify(validateSemanticGLB(fs.readFileSync(file),manifest.semantic_parts.map(x=>x.id)),null,2));
}