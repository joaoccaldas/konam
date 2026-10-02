// One command for every page: catalogue → museum → studio → collection → experiences → hardening
// (security/SEO metadata + the shared design system on every page, including the frozen engineering studios).
//   node tools/build_pages.mjs            (npm run build in web/)
// The six engineering studios (Speedmax_*_Museum.html) are produced by the Blender pipelines
// (tools/build_museum.py, tools/build_heritage.py) and are only post-processed here.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const steps = [['companion', 'tools/build_companion.mjs'], ['catalogue', 'tools/build_catalog.mjs'], ['entry-preview', 'tools/build_entry_catalog.mjs'], ['public-catalog', 'tools/build_public_catalog.mjs'], ['public-graph', 'tools/build_triathlon_graph.mjs'], ['registry', 'tools/build_registry.mjs'], ['admin-assets', 'tools/build_admin_assets.mjs'], ['museum', 'web/build_landing.mjs'], ['studio', 'web/build_studio.mjs'],
  ['collection', 'tools/build_collection.mjs'], ['experiences', 'web/build_experience.mjs'], ['hardening', 'tools/harden_pages.mjs']];
for (const [name, file] of steps) {
  const t = Date.now();
  const out = execFileSync(process.execPath, [path.join(root, file)], { cwd: root, encoding: 'utf8' }).trim().split('\n').pop();
  console.log(`${name.padEnd(12)} ${String(Date.now() - t).padStart(5)} ms  ${out}`);
}

// Rebuild the two modern direct viewers from their existing models and profiles.
// Event visibility also applies to old bookmarked configurator links.
const glbs=JSON.parse(fs.readFileSync(path.join(root,'museum/catalog/canyon-assets.json'))).glb;
for(const [key,page] of [['cfr','Speedmax_Museum.html'],['slx','Speedmax_SLX_Museum.html']]){
  execFileSync(process.execPath,[path.join(root,'web/build.mjs')],{cwd:root,env:{...process.env,GLB:path.join(root,glbs[key]),BIKE_PROFILE:path.join(root,'museum/viewer-'+key+'.json'),OUT_HTML:path.join(root,page)},stdio:'pipe'});
}
execFileSync(process.execPath,[path.join(root,'tools/harden_pages.mjs')],{cwd:root,stdio:'pipe'});

// the app bundle (web/dist, packaged by app/native) mirrors the hardened pages; its index is the collection
const dist = path.join(root, 'web/dist');
for (const f of fs.readdirSync(dist).filter(f => f.endsWith('.html'))) {
  const src = path.join(root, f === 'index.html' ? 'Canyon_Collection.html' : f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dist, f));
}
console.log('mirror       web/dist ←', fs.readdirSync(dist).filter(f => f.endsWith('.html')).length, 'hardened pages');
