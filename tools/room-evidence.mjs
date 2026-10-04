#!/usr/bin/env node
// tools/room-evidence.mjs — one command for a review room's visual evidence and its performance receipt.
//
//   node tools/room-evidence.mjs --review nor3-winter [--shots hero,lanes] [--out docs/evidence/<dir>] [--metrics] [--size 1600x900]
//
// Serves the repository itself, opens ?reviewRoom=<review> in headless Chromium (SwiftShader; Playwright from
// /opt/node-tools or web/node_modules), waits for the room's assets, then:
//   • renders each camera in "shots" (world/konam/rooms/<review>.decor.json, or --shots-file) to <out>/<shot>.png
//     with a virtual clock, so flames/snow/screens are deterministic;
//   • with --metrics, measures draw calls and triangles at desktop 1440×900 and phone 390×844 and checks them against
//     the room package budgets (--package world/konam/rooms/<id>.room.json; default from the decor file's room_id).
// Exit code 1 on page errors or a budget breach.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; }, flag = k => argv.includes(`--${k}`);
const review = arg('review') || (console.error('--review <reviewRoom> required'), process.exit(2));
const decorFile = path.join(root, `world/konam/rooms/${review}.decor.json`);
const decor = fs.existsSync(decorFile) ? JSON.parse(fs.readFileSync(decorFile, 'utf8')) : {};
const allShots = arg('shots-file') ? JSON.parse(fs.readFileSync(arg('shots-file'), 'utf8')) : (decor.shots || {});
const pick = arg('shots') ? arg('shots').split(',') : Object.keys(allShots);
const out = path.resolve(root, arg('out', `docs/evidence/${review}-latest`));
const [W, H] = arg('size', '1600x900').split('x').map(Number);
const pkgPath = arg('package', decor.room_id ? `world/konam/rooms/${decor.room_id}.room.json` : null);
const req = createRequire(fs.existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : path.join(root, 'web/node_modules/'));
const { chromium } = req('playwright');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/index.html?reviewRoom=${review}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
let failed = false;

async function open(viewport, mobile = false, clock = false) {
  const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 }); page.setDefaultTimeout(600000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/CERT|vibrate|net::ERR/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  if (clock) await page.addInitScript(() => { window.__vt = performance.now(); const raf = window.requestAnimationFrame.bind(window); window.__raf = raf; window.requestAnimationFrame = cb => raf(() => cb(window.__vt)); performance.now = () => window.__vt; });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__museum?.beast?.group && (window.__museum.beast.bikeSpot?.bike || window.__museum.beast.ownBikes === undefined), null, { timeout: 600000 });
  await page.waitForTimeout(6000);
  return { page, errors };
}
const place = (page, [x, z, drop, lx, ly, lz]) => page.evaluate(([x, z, drop, lx, ly, lz]) => { const m = window.__museum; m.halt(); Object.assign(m.P, { x, z, drop, vx: 0, vz: 0 }); const eye = 1.6 + drop; m.P.yaw = Math.atan2(-(lx - x), -(lz - z)); m.P.pitch = Math.atan2(ly - eye, Math.hypot(lx - x, lz - z)); }, [x, z, drop, lx, ly, lz]);

if (pick.length && !flag('metrics-only')) {
  fs.mkdirSync(out, { recursive: true });
  const { page, errors } = await open({ width: W, height: H }, false, true);
  await page.addStyleTag({ content: 'body *{visibility:hidden !important} #hall{visibility:visible !important}' });
  for (const name of pick) {
    const s = allShots[name]; if (!s) { console.warn('no shot', name); continue; }
    await place(page, s);
    for (let i = 0; i < 4; i++) await page.evaluate(async () => { const m = window.__museum, md = m.beast.mood; if (md) { m.renderer.toneMappingExposure = md.exposure; m.scene.fog.near = md.fog.near; m.scene.fog.far = md.fog.far; md.fogColor && m.scene.fog.color.copy(md.fogColor); }
      window.__vt += 40; await new Promise(r => window.__raf(() => window.__raf(r))); });
    const b64 = await page.evaluate(async () => { window.__vt += 40; return await new Promise(r => window.__raf(() => window.__raf(() => r(document.getElementById('hall').toDataURL('image/png').split(',')[1])))); });
    fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(b64, 'base64')); console.log('shot', name);
  }
  if (errors.length) { failed = true; console.error('page errors:', errors.slice(0, 5)); }
  await page.close();
}

if (flag('metrics') || flag('metrics-only')) {
  const budgets = pkgPath && fs.existsSync(path.join(root, pkgPath)) ? JSON.parse(fs.readFileSync(path.join(root, pkgPath), 'utf8')).performance : null;
  const hero = allShots.hero || Object.values(allShots)[0];
  const receipt = {};
  for (const [name, vp, mobile, budgetKey] of [['desktop', { width: 1440, height: 900 }, false, 'desktop'], ['phone', { width: 390, height: 844 }, true, 'mobile']]) {
    const { page, errors } = await open(vp, mobile);
    if (hero) await place(page, hero); await page.waitForTimeout(5000);
    const r = await page.evaluate(() => { const m = window.__museum, ren = m.renderer; ren.info.autoReset = true; ren.render(m.scene, m.camera); const i = ren.info.render; let meshes = 0, tris = 0;
      m.beast.group.traverse(o => { if (o.isMesh && o.visible) { meshes++; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } });
      return { scene_calls: i.calls, scene_triangles: i.triangles, room_meshes: meshes, room_triangles: Math.round(tris) }; });
    const b = budgets?.[budgetKey], ok = !b || (r.room_meshes <= b.max_room_draw_calls && r.room_triangles <= b.max_room_triangles);
    receipt[name] = { ...r, errors: errors.length, budget: b ? { calls: b.max_room_draw_calls, triangles: b.max_room_triangles } : null, within_budget: ok };
    if (!ok || errors.length) failed = true;
    console.log(name, JSON.stringify(receipt[name]));
    await page.close();
  }
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify({ review, measured_at: new Date().toISOString(), ...receipt }, null, 2));
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
