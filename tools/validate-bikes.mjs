// Bike asset contract (docs/ARCHITECTURE.md): every bike GLB the museum loads must name its paint
// materials from engine/skins.js SLOTS (at least `paint_frame`), stay within the size budget, and be
// readable. Run from the repo root:  node tools/validate-bikes.mjs   (exits 1 on any violation)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('web/package.json'));
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { MeshoptDecoder } = require('meshoptimizer');
const { SLOTS, REQUIRED_SLOTS, slotOfMaterial } = await import(path.resolve('web/src/engine/skins.js'));

const BUDGET_MB = 3.5;
const files = [];
const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/(speedmax_web|bike)\.glb$/.test(f.name)) files.push(p); } };
walk('assets');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
let bad = 0;
for (const f of files.sort()) {
  const mb = fs.statSync(f).size / 1e6, problems = [];
  let slots = [];
  try {
    const doc = await io.read(f);
    const names = doc.getRoot().listMaterials().map(m => m.getName());
    slots = [...new Set(names.map(slotOfMaterial).filter(Boolean))];
    for (const r of REQUIRED_SLOTS) if (!slots.includes(r)) problems.push(`missing ${SLOTS[r][0]}`);
  } catch (e) { problems.push('unreadable: ' + e.message.slice(0, 80)); }
  if (mb > BUDGET_MB) problems.push(`${mb.toFixed(2)} MB > ${BUDGET_MB} MB budget`);
  if (problems.length) bad++;
  console.log(`${problems.length ? 'FAIL' : ' ok '} ${f.padEnd(52)} ${mb.toFixed(2).padStart(5)} MB  slots: ${slots.join(', ')}${problems.length ? '  ← ' + problems.join('; ') : ''}`);
}
console.log(`${files.length} bike files, ${bad} failing`);
process.exit(bad ? 1 : 0);
