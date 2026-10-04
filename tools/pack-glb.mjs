#!/usr/bin/env node
// tools/pack-glb.mjs — the deterministic packing step after a Blender export.
// Meshopt-compresses each GLB in place (nodes, names and machine-inspection extras survive), then
// refreshes the byte counts in the sibling build-meta.json and in assets/atlas/build-report.json.
//
//   node tools/pack-glb.mjs assets/atlas/<key>/bike.glb [assets/atlas/<key>/bike-lite.glb ...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'web/node_modules/.bin/gltf-transform');
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
