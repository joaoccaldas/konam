#!/usr/bin/env node
// tools/pack-glb.mjs — the deterministic packing step after a Blender export.
// Meshopt-compresses each GLB in place (nodes, names and machine-inspection extras survive), then
// refreshes the byte counts in the sibling build-meta.json and in assets/atlas/build-report.json.
//
//   node tools/pack-glb.mjs assets/atlas/<key>/bike.glb [assets/atlas/<key>/bike-lite.glb ...]
//   node tools/pack-glb.mjs --lod [--error 0.003] [--suffix lod1] <src.glb> [...]   (derived LOD <src>-<suffix>.glb + .meta.json)
//   node tools/pack-glb.mjs --unpack <packed.glb> <plain.glb>     (for Blender, whose importer cannot read meshopt)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'web/node_modules/.bin/gltf-transform');
if (process.argv[2] === '--lod') {                                        // derived display LOD: <src>-lod1.glb + .meta.json (same materials/nodes)
  const req = createRequire(path.join(root, 'web/node_modules/'));
  const { NodeIO } = req('@gltf-transform/core'), { ALL_EXTENSIONS } = req('@gltf-transform/extensions'), { MeshoptDecoder } = req('meshoptimizer');
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const stats = async f => { const d = await io.read(f); let t = 0; for (const m of d.getRoot().listMeshes()) for (const q of m.listPrimitives()) { const i = q.getIndices(); t += (i ? i.getCount() : q.getAttribute('POSITION').getCount()) / 3; }
    return { triangles: Math.round(t), materials: d.getRoot().listMaterials().length, nodes: d.getRoot().listNodes().length }; };
  const args = process.argv.slice(3), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
  const error = opt('--error', '0.003'), suffix = opt('--suffix', 'lod1');                 // e.g. --error 0.0012 --suffix lite (phone hero)
  for (const src of args) {
    const abs = path.resolve(root, src), out = abs.replace(/\.glb$/, `-${suffix}.glb`), w = out + '.weld.glb', sm = out + '.simp.glb';
    execFileSync(cli, ['weld', abs, w], { stdio: 'pipe' }); execFileSync(cli, ['simplify', w, sm, '--ratio', '0.05', '--error', error], { stdio: 'pipe' });
    execFileSync(cli, ['meshopt', sm, out, '--level', 'medium'], { stdio: 'pipe' }); fs.rmSync(w); fs.rmSync(sm);
    const a = await stats(abs), b = await stats(out), rel = path.relative(root, out);
    fs.writeFileSync(out.replace(/\.glb$/, '.meta.json'), JSON.stringify({ asset: rel, kind: 'derived-runtime-lod', derived_from: path.relative(root, abs),
      rights: "inherits the source asset's rights and provenance; no new geometry or marks",
      pipeline: `gltf-transform weld -> simplify --ratio 0.05 --error ${error} -> meshopt --level medium (node tools/pack-glb.mjs --lod)`,
      triangles: b.triangles, source_triangles: a.triangles, bytes: fs.statSync(out).size, materials: b.materials, nodes: b.nodes,
      use: suffix === 'lod1' ? 'beyond LOD_NEAR only (web/src/landing.js); never for inspection, explode or hero shots' : `lite-tier stand-in (${suffix}); see web/src/landing.js` }, null, 1) + '\n');
    console.log(`lod ${rel}: ${a.triangles} -> ${b.triangles} triangles, ${fs.statSync(out).size} bytes`);
  }
  process.exit(0);
}
if (process.argv[2] === '--unpack') {                                     // decode meshopt for tools that cannot read it (Blender's importer)
  const req = createRequire(path.join(root, 'web/node_modules/'));
  const { NodeIO } = req('@gltf-transform/core'), { ALL_EXTENSIONS } = req('@gltf-transform/extensions'), { MeshoptDecoder } = req('meshoptimizer');
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(process.argv[3]);
  for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'EXT_meshopt_compression') e.dispose();
  await io.write(process.argv[4], doc); process.exit(0);
}
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tools/pack-glb.mjs <file.glb> [...]'); process.exit(2); }
const reportPath = path.join(root, 'assets/atlas/build-report.json');
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

for (const f of files) {
  const abs = path.resolve(root, f), rel = path.relative(root, abs), tmp = abs + '.packing.glb';
  const before = fs.statSync(abs).size;
  execFileSync(cli, ['meshopt', abs, tmp, '--level', 'medium'], { stdio: 'pipe' });
  fs.renameSync(tmp, abs);
  const bytes = fs.statSync(abs).size;
  const meta = path.join(path.dirname(abs), 'build-meta.json');
  if (fs.existsSync(meta) && path.basename(abs) === 'bike.glb') {
    const m = JSON.parse(fs.readFileSync(meta, 'utf8')); m.bytes = bytes; m.compression = 'EXT_meshopt_compression';
    fs.writeFileSync(meta, JSON.stringify(m, null, 1));
  }
  if (report) for (const e of Object.values(report)) if (e.glb === rel) { e.bytes = bytes; e.compression = 'EXT_meshopt_compression'; }
  console.log(`packed ${rel}: ${before} → ${bytes} bytes`);
}
if (report) fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
