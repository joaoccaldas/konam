#!/usr/bin/env node
// Backfill assets/atlas/<key>/build-meta.json for atlas bikes built before blender/atlas_build.py wrote it.
// Deterministic: every field comes from records already in the repo, in the same shape atlas_build.py writes:
//   museum/atlas/bikes.json (skeleton: name, maker, kind)  ·  assets/atlas/build-report.json (tris)
//   the packed GLB itself (bytes, and the `part` tags Blender stored on each node, read from the glTF JSON chunk).
// Never overwrites an existing build-meta.json; a rebuild with Blender replaces these with the generator's own.
//   node tools/atlas-build-meta.mjs [key ...]      (default: every atlas bike missing its meta)
//   node tools/atlas-build-meta.mjs --check        (exit 1 if a backfill would write anything)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => path.join(root, p);
const args = process.argv.slice(2), check = args.includes('--check'), only = args.filter(a => !a.startsWith('--'));
const atlas = JSON.parse(fs.readFileSync(rel('museum/atlas/bikes.json'), 'utf8'));
const skeletons = Array.isArray(atlas) ? atlas : Array.isArray(atlas.bikes) ? atlas.bikes : Object.values(atlas);
const report = JSON.parse(fs.readFileSync(rel('assets/atlas/build-report.json'), 'utf8'));

function gltfParts(file) {                                                     // the `part` tags from the glTF JSON chunk
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const len = b.readUInt32LE(12), type = b.readUInt32LE(16);
  if (type !== 0x4e4f534a) throw new Error(`${file}: first chunk is not JSON`);
  const json = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
  return [...new Set((json.nodes || []).map(n => n.extras?.part).filter(Boolean))].sort();
}

const written = [];
for (const dir of fs.readdirSync(rel('assets/atlas'))) {
  const glb = rel(`assets/atlas/${dir}/bike.glb`), meta = rel(`assets/atlas/${dir}/build-meta.json`);
  if (!fs.existsSync(glb) || fs.existsSync(meta) || (only.length && !only.includes(dir))) continue;
  const b = skeletons.find(s => s.key === dir), entry = report[dir];
  if (!b || !entry) { console.warn(`skip ${dir}: ${!b ? 'no skeleton in museum/atlas/bikes.json' : 'no entry in build-report.json'}`); continue; }
  const lods = ['bike.glb', ...(fs.existsSync(rel(`assets/atlas/${dir}/bike-lite.glb`)) ? ['bike-lite.glb'] : [])];
  const out = { schema_version: 1, id: dir, type: 'bike', brand: b.maker || 'Studio design', model: b.name,
    representation: b.representation || (b.kind === 'type' ? 'concept' : 'geometry-study'),
    source_records: ['museum/atlas/bikes.json'], generator: 'blender', generator_script: 'blender/atlas_build.py',
    detail: b.detail || 'standard', tris: entry.tris, bytes: fs.statSync(glb).size, semantic_parts: (parts => parts.length ? parts : null)(gltfParts(glb)), lods,   // null: this older build carried no part tags
    notes: 'Built from its own skeleton in museum/atlas/bikes.json. Unbranded. Meta backfilled by tools/atlas-build-meta.mjs from the build report and the GLB.' };
  written.push(dir);
  if (!check) fs.writeFileSync(meta, JSON.stringify(out, null, 1) + '\n');
}
console.log(`${check ? 'would write' : 'wrote'} ${written.length} build-meta.json${written.length ? ': ' + written.join(', ') : ''}`);
if (check && written.length) process.exit(1);
