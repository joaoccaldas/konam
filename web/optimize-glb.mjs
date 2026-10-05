// Same bounded transforms as the former CLI invocation, using the glTF API.
// No flatten/join/instance/simplify/sparse: semantic part names and hierarchy matter.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,resample,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node web/optimize-glb.mjs input.glb output.glb');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document=await io.read(input);
await document.transform(dedup(),weld(),resample(),prune({keepAttributes:false,keepIndices:false,keepLeaves:false,keepSolidTextures:false}),meshopt({encoder:MeshoptEncoder,level:'high'}));
await io.write(output,document);
