#!/usr/bin/env node
// tools/decor.mjs — find, add, move, remove and validate room dressing (world/konam/rooms/*.decor.json).
//
//   node tools/decor.mjs list [room]                         every decor item (or one room's), with refs and placements
//   node tools/decor.mjs find <text>                         search decor items, atlas bikes and room assets by name
//   node tools/decor.mjs add <room> <id> --kind glb|bike --ref <path|atlas-key> --at x,y,z[,yaw[,scale]] [--height h] [--lite skip] [--rights <manifest>]
//   node tools/decor.mjs place <room> <id> x,y,z[,yaw[,scale]]   add one more placement to an item
//   node tools/decor.mjs move <room> <id> <index> x,y,z[,yaw[,scale]]
//   node tools/decor.mjs remove <room> <id> [index]           remove an item, or one placement of it
//   node tools/decor.mjs validate                             refs exist, ids unique, placements well-formed, rights recorded
//
// <room> is the decor file stem: world/konam/rooms/<room>.decor.json (e.g. nor3-winter).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'world/konam/rooms');
const files = () => fs.readdirSync(dir).filter(f => f.endsWith('.decor.json')).map(f => path.join(dir, f));
const load = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2) + '\n');
const fileOf = room => { const f = path.join(dir, `${room}.decor.json`); if (!fs.existsSync(f)) die(`no decor file: ${path.relative(root, f)}`); return f; };
const die = m => { console.error(m); process.exit(2); };
const vec = s => { const v = String(s).split(',').map(Number); if (v.length < 3 || v.some(n => !Number.isFinite(n))) die(`bad placement: ${s}`); return v; };
const refPath = it => it.kind === 'bike' ? `assets/atlas/${it.ref}/bike.glb` : it.ref;
const opt = (args, k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };

function validate() {
  const errors = [];
  for (const f of files()) {
    const d = load(f), rel = path.relative(root, f), ids = new Set();
    if (d.schema_version !== 1) errors.push(`${rel}: schema_version must be 1`);
    for (const it of d.items || []) {
      if (!it.id || ids.has(it.id)) errors.push(`${rel}: missing or duplicate id ${it.id}`); ids.add(it.id);
      if (!['glb', 'bike'].includes(it.kind)) errors.push(`${rel}#${it.id}: kind must be glb|bike`);
      if (!fs.existsSync(path.join(root, refPath(it)))) errors.push(`${rel}#${it.id}: missing ${refPath(it)}`);
      if (it.kind === 'bike' && !fs.existsSync(path.join(root, `assets/atlas/${it.ref}/build-meta.json`))) errors.push(`${rel}#${it.id}: bike has no build-meta.json`);
      if (!it.rights_ref || !fs.existsSync(path.join(root, it.rights_ref))) errors.push(`${rel}#${it.id}: rights_ref missing or not found`);
      if (!Array.isArray(it.at) || !it.at.length || it.at.some(a => !Array.isArray(a) || a.length < 3 || a.some(n => !Number.isFinite(n)))) errors.push(`${rel}#${it.id}: at must be [[x,y,z,yaw?,scale?], ...]`);
    }
  }
  return errors;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'list') {
  for (const f of files()) {
    const d = load(f); if (args[0] && !f.endsWith(`${args[0]}.decor.json`)) continue;
    console.log(`\n${path.relative(root, f)}  (${d.room_id}${d.variant ? ' · ' + d.variant : ''})`);
    for (const it of d.items) console.log(`  ${it.id.padEnd(18)} ${it.kind.padEnd(5)} ×${String(it.at.length).padEnd(3)} ${refPath(it)}${it.lite === 'skip' ? '  [phones: skipped]' : ''}`);
  }
} else if (cmd === 'find') {
  const q = (args[0] || '').toLowerCase(); if (!q) die('find <text>');
  for (const f of files()) for (const it of load(f).items) if (JSON.stringify(it).toLowerCase().includes(q)) console.log(`decor   ${path.relative(root, f)}#${it.id}  ${refPath(it)}`);
  const atlas = load(path.join(root, 'museum/atlas/bikes.json'));
  for (const b of atlas.bikes) if (`${b.key} ${b.name} ${b.maker}`.toLowerCase().includes(q)) console.log(`bike    ${b.key}  "${b.name}" (${b.maker}) → assets/atlas/${b.key}/bike.glb${b.detail === 'hero' ? ' [hero + lite]' : ''}`);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const a of walk(path.join(root, 'assets/rooms'))) if (path.relative(root, a).toLowerCase().includes(q)) console.log(`asset   ${path.relative(root, a)}  ${(fs.statSync(a).size / 1024).toFixed(0)} KB`);
} else if (cmd === 'add') {
  const [room, id] = args, f = fileOf(room), d = load(f);
  if (d.items.some(i => i.id === id)) die(`${id} already exists — use place/move`);
  const it = { id, kind: opt(args, 'kind') || 'glb', ref: opt(args, 'ref'), at: [vec(opt(args, 'at') || die('--at x,y,z[,yaw]'))] };
  if (!it.ref) die('--ref required');
  if (opt(args, 'height')) it.height = +opt(args, 'height');
  if (opt(args, 'lite')) it.lite = opt(args, 'lite');
  it.rights_ref = opt(args, 'rights') || '';
  d.items.push(it); save(f, d); console.log(`added ${id} to ${path.relative(root, f)}`);
} else if (cmd === 'place' || cmd === 'move' || cmd === 'remove') {
  const [room, id, a3, a4] = args, f = fileOf(room), d = load(f), it = d.items.find(i => i.id === id) || die(`no item ${id}`);
  if (cmd === 'place') it.at.push(vec(a3));
  else if (cmd === 'move') { if (!it.at[+a3]) die(`no placement ${a3}`); it.at[+a3] = vec(a4); }
  else if (a3 === undefined) d.items = d.items.filter(i => i !== it);
  else { it.at.splice(+a3, 1); if (!it.at.length) d.items = d.items.filter(i => i !== it); }
  save(f, d); console.log(`${cmd} ${id} ✓ (${path.relative(root, f)})`);
} else if (cmd === 'validate') {
  const errors = validate();
  if (errors.length) { errors.forEach(e => console.error('✗', e)); process.exit(1); }
  console.log(`decor: ${files().length} file(s), all items valid`);
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
}
