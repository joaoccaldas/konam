// Build the local museum site into site/: collection page + one viewer per bike that has a build.
// Usage: node tools/heritage/build_site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { build } from '../../web/node_modules/esbuild/lib/main.js';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'site');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
fs.mkdirSync(path.join(out, 'img'), { recursive: true });

const catalog = read('museum/heritage/catalog.json');
const css = fs.readFileSync(path.join(root, 'web/heritage/style.css'), 'utf8');

function copyImg(rel) {
  if (!rel) return null;
  const name = path.basename(rel);
  fs.copyFileSync(path.join(root, rel), path.join(out, 'img', name));
  return 'img/' + name;
}

// ---------------------------------------------------------------- per-bike viewers
const app = await build({ entryPoints: [path.join(root, 'web/heritage/viewer.js')], bundle: true, format: 'esm',
  minify: true, write: false, target: 'es2020', nodePaths: [path.join(root, 'web/node_modules')] });
const built = new Set();
for (const e of catalog.entries.filter((x) => x.viewer)) {
  const man = read(`museum/bikes/${e.id}.json`);
  const spec = read(man.source_geometry);
  const meta = read(path.join(man.pipeline.out_dir, 'build-meta.json'));
  const cal = read(path.join(man.pipeline.data_dir, 'calibration.json'));
  const trim = spec.trims[man.trim];
  const dir = path.join(out, 'bikes', e.id);
  fs.mkdirSync(dir, { recursive: true });
  const glbSrc = fs.existsSync(path.join(root, man.deliverables.glb)) ? man.deliverables.glb : path.join(man.pipeline.out_dir, 'bike_web_raw.glb');
  fs.copyFileSync(path.join(root, glbSrc), path.join(dir, 'bike.glb'));
  const photo = copyImg(man.pipeline.reference);
  const P = (spec_, basis = 'Published, 2004 Trek Specifications Manual') => ({ spec: spec_, basis });
  const profile = {
    glb: 'bike.glb',
    parts: {
      frame: { label: 'Frame', ...P(`${trim.frame.main_tubes}; stays ${trim.frame.stays}. ${trim.color}.`), basis: 'Material published; tube shapes traced from the photo; lateral widths inferred.' },
      fork: { label: 'Fork', ...P(trim.fork) },
      wheel_front: { label: 'Front wheel', ...P(trim.front_wheel) }, wheel_rear: { label: 'Rear wheel', ...P(trim.rear_wheel) },
      tyre_front: { label: 'Front tyre', ...P(trim.front_tire) }, tyre_rear: { label: 'Rear tyre', ...P(trim.rear_tire) },
      rim_front: { label: 'Front rim', ...P(trim.front_wheel), basis: 'Rim depth derived from the published ERD; profile inferred.' },
      rim_rear: { label: 'Rear rim', ...P(trim.rear_wheel), basis: 'Rim depth derived from the published ERD; profile inferred.' },
      spokes_front: { label: 'Front spokes', ...P(trim.spokes) }, spokes_rear: { label: 'Rear spokes', ...P(trim.spokes) },
      cassette: { label: 'Cassette', ...P(trim.cassette) }, crankset: { label: 'Crankset', ...P(trim.crankset) },
      chainrings: { label: 'Chainrings', ...P(trim.crankset) }, crank_arms: { label: 'Crank arms', ...P(trim.crankset) },
      chain: { label: 'Chain', ...P(trim.chain) },
      front_derailleur: { label: 'Front derailleur', ...P(trim.front_derailleur), basis: 'Published model; body shape simplified.' },
      rear_derailleur: { label: 'Rear derailleur', ...P(trim.rear_derailleur), basis: 'Published model; body shape simplified.' },
      brake_front: { label: 'Front brake', ...P(trim.brakes), basis: 'Published model; caliper shape simplified.' },
      brake_rear: { label: 'Rear brake', ...P(trim.brakes), basis: 'Published model; caliper shape simplified.' },
      basebar: { label: 'Base bar', ...P(trim.handlebar) }, clipons: { label: 'Clip-on extensions', ...P(trim.handlebar) },
      shifters: { label: 'Bar-end shifters', ...P(trim.shift_levers) }, brake_levers: { label: 'Brake levers', ...P(trim.brake_levers) },
      stem: { label: 'Stem', ...P(trim.stem) }, seatpost: { label: 'Seatpost', ...P(trim.seatpost) }, saddle: { label: 'Saddle', ...P(trim.saddle) },
    },
  };
  const sm = cal.size_match;
  const bolts = cal.bb_prediction.spindle_from_bolts;
  const rows = [
    ['Model year', `${man.model_year} (photo captured ${man.launch_year_basis.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ''})`],
    ['Size shown', `${meta.size} (from the photo: wheelbase ${cal.wheelbase_from_photo_mm.toFixed(0)} mm vs ${sm.published_wheelbase_mm} mm published, ${(sm.relative_residual * 100).toFixed(2)}%)`],
    ['Scale check', `Chainring bolt circle ${bolts.bolt_circle_mm_at_scale.toFixed(1)} mm vs 130 mm published; crank ${bolts.crank_length_mm_at_scale.toFixed(1)} mm vs ${spec.fit.crank_length[spec.fit.sizes.indexOf(meta.size)]} mm`],
    ['Geometry (published)', `HTA ${meta.published_mm.head_tube_angle}°, STA ${meta.published_mm.seat_tube_angle}°, chainstay ${meta.published_mm.chainstay}, wheelbase ${meta.published_mm.wheelbase}, BB height ${meta.published_mm.bb_height} mm`],
    ['Groupset', `${trim.rear_derailleur} rear, ${trim.front_derailleur}, ${trim.crankset}, ${trim.cassette}`],
    ['Cockpit', `${trim.handlebar}; ${trim.shift_levers}; ${trim.brake_levers}`],
  ];
  const conflict = `The photographed sample does not match the published size-58 table at the rear: in the photo the chainstay measures ${bolts.photo_chainstay_mm.toFixed(0)} mm and the BB height ${bolts.photo_bb_height_mm.toFixed(0)} mm, against ${meta.published_mm.chainstay} mm and ${meta.published_mm.bb_height} mm published. This model follows the published table.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(man.brand + ' ' + man.model)} ${man.model_year}</title><style>${css}</style>
<script>window.__PROFILE=${JSON.stringify(profile).replaceAll('<', '\\u003c')}</script></head><body class="viewer">
<header><a href="../../index.html">← Collection</a><h1>${esc(man.brand + ' ' + man.model)} <span>MY${man.model_year} · size ${esc(meta.size)}</span></h1></header>
<main><div class="stage"><canvas id="view" aria-label="3D model"></canvas><div id="loading">Loading model…</div>
<div class="tools"><label>Explode <input id="explode" type="range" min="0" max="1" step="0.01" value="0"></label>
<button id="sideview">Side view</button><label><input id="overlay" type="checkbox"> Source photo</label></div>
<img id="photo" src="../../${photo}" alt="Source photo from trekbikes.com, 2003" hidden>
<div id="partcard" hidden><h3></h3><p class="spec"></p><p class="basis"></p></div></div>
<aside><p class="status">Status: draft reference study. Not yet through every validation check.</p>
<table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
<h2>Known conflict</h2><p>${esc(conflict)}</p>
<h2>Uncertainties</h2><ul>${man.uncertainties.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>
<h2>Parts</h2><ul id="parts" class="parts"></ul>
<h2>Sources</h2><ul>${man.references.map((r) => `<li><a href="${esc(r.url)}">${esc(r.role)}</a></li>`).join('')}</ul></aside></main>
<script type="module">${app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  built.add(e.id);
}

// ---------------------------------------------------------------- collection page
const label = { 'not-modelled': 'Not modelled', research: 'Researched — not yet modelled', 'reference-study-draft': 'Draft 3D model', 'reference-study': '3D reference study' };
const cards = catalog.entries.map((e) => {
  const img = copyImg(e.thumbnail);
  const link = e.viewer && built.has(e.id) ? `<a class="open" href="${e.viewer}">Open 3D viewer</a>` : '';
  return `<article class="card ${esc(e.status)}">${img ? `<img src="${img}" alt="${esc(e.name)}" loading="lazy">` : '<div class="noimg">No usable photo</div>'}
<div class="body"><p class="years">${esc(e.years)}</p><h2>${esc(e.name)}</h2><p class="mat">${esc(e.material)}</p><p>${esc(e.feature)}</p>
<p class="badge">${esc(label[e.status] || e.status)}</p><p class="reason">${esc(e.reason)}</p>${link}</div></article>`;
}).join('\n');
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trek Tri Collection</title><style>${css}</style></head><body><header><h1>${esc(catalog.title)}</h1><p>${esc(catalog.note)}</p></header>
<main class="grid">${cards}</main></body></html>`);
console.log('site:', catalog.entries.length, 'cards;', built.size, 'viewer(s)');
