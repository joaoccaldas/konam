// Bundle one heritage exhibit into a self-contained, offline HTML page.
// GLB=... BIKE_PROFILE=museum/viewer-<key>.json OUT_HTML=... node build_heritage.mjs
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
for (const k of ['GLB', 'BIKE_PROFILE', 'OUT_HTML']) if (!process.env[k]) throw new Error(k + ' is required');
const res = await build({ entryPoints: [path.join(here, 'src/heritage.js')], bundle: true, format: 'iife', minify: true, write: false,
  target: 'es2020', legalComments: 'none' });
const app = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const glb = fs.readFileSync(process.env.GLB).toString('base64');
const profile = JSON.parse(fs.readFileSync(process.env.BIKE_PROFILE, 'utf8'));
// Measured results come from this build's own reports, never from hand-typed numbers.
if (process.env.CHECKS_DIR) {
  const g = JSON.parse(fs.readFileSync(path.join(process.env.CHECKS_DIR, 'geometry-checks.json'), 'utf8'));
  const sil = JSON.parse(fs.readFileSync(path.join(process.env.CHECKS_DIR, 'silhouette-report.json'), 'utf8'));
  const cal = JSON.parse(fs.readFileSync(process.env.HERITAGE_PROFILE, 'utf8')).calibration;
  profile.bike.checks = [
    ['Scale', `${cal.mm_per_px.toFixed(3)} mm per photo pixel (tyre fits, RMS ${cal.wheels.rear.rms_px}/${cal.wheels.front.rms_px} px)`],
    ['Wheelbase', `${g.geometry_mm.wheelbase.toFixed(1)} mm measured`],
    ['Chainstay', `${g.geometry_mm.chainstay.toFixed(1)} mm measured`],
    ['BB drop', `${g.geometry_mm.bb_drop.toFixed(1)} mm measured`],
    ['Frame outline', `IoU ${sil.frame_zone.iou} · median ${sil.frame_zone.boundary_median_mm} mm · p95 ${sil.frame_zone.boundary_p95_mm} mm`],
    ['Whole bike outline', `IoU ${sil.whole_bike.iou} (spokes and cables are thin at this resolution)`],
    ['Topology', `frame ${g.frame.triangles.toLocaleString('en')} tris, watertight`],
  ];
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const html = fs.readFileSync(path.join(here, 'heritage.template.html'), 'utf8')
  .replace('__TITLE__', () => esc(profile.bike.pageTitle))
  .replace('<head>', () => '<head><script>window.__BIKE_PROFILE=' + JSON.stringify(profile).replaceAll('<', '\\u003c') + ';</script>')
  .replace('__GLB__', () => glb)
  .replace('__APP__', () => '/* Canyon heritage exhibit · three.js (MIT) bundled */\n' + app);
fs.mkdirSync(path.dirname(process.env.OUT_HTML), { recursive: true });
fs.writeFileSync(process.env.OUT_HTML, html);
console.log('wrote', process.env.OUT_HTML, (html.length / 1e6).toFixed(2), 'MB');
