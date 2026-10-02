import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
const glbPath = process.env.GLB || path.join(here, '..', 'assets', 'speedmax_web.glb');
const res = await build({ entryPoints: [path.join(here, 'src/main.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none', loader: {'.png':'dataurl'} });
const app = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const glb = fs.readFileSync(glbPath).toString('base64');
const tpl = fs.readFileSync(path.join(here, 'index.template.html'), 'utf8');
const profile=JSON.parse(fs.readFileSync(process.env.BIKE_PROFILE||path.join(here,'../museum/viewer-cfr.json'),'utf8'));
// Identity text is populated at runtime from the profile (see identity() in main.js);
// only the static <title> and meta description differ per build.
const b = profile.bike || {};
const docTitle = b.pageTitle || `Canyon Museum — ${b.name || 'Speedmax'} (${b.year || '2027'})`;
let template=tpl
  .replace('<title>Canyon Collection — Speedmax CFR AXS</title>', `<title>${docTitle.replace(/</g,'&lt;')}</title>`)
  .replace('Speedmax CFR AXS (MY2027) — an unofficial, fully procedural Blender model you can explode, ride, inspect and repaint in the browser.',
    `${b.name || 'Speedmax'} (${b.year || 'MY2027'}) — an unofficial, fully procedural Blender model you can explode, ride, inspect and repaint in the browser.`);
const html = template.replace('<head>','<head><script>window.__BIKE_PROFILE='+JSON.stringify(profile).replaceAll('<','\\u003c')+';</script>').replace('__GLB__', () => glb).replace('__APP__', () => '/* Speedmax study · three.js (MIT) bundled */\n' + app);
const out = process.env.OUT_HTML || path.join(here, 'dist', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html.replace(/[ \t]+$/gm,''));
console.log('wrote', out, (html.length / 1e6).toFixed(2), 'MB · app', (app.length / 1e3).toFixed(0), 'kB');
