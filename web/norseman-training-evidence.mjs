// Norseman training room evidence: same placement and metrics as final-room-recovery-evidence.mjs, but on hardware GL
// with longer waits (the software-GL harness times out on this machine).
// usage: node web/norseman-training-evidence.mjs http://127.0.0.1:<port>/index.html <out-dir> [desktop,phone390,landscape]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = path.resolve(import.meta.dirname, '..');
const puppeteer = createRequire(ROOT + '/web/package.json')('puppeteer-core');
const base = process.argv[2], out = process.argv[3], only = (process.argv[4] || '').split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const decor = JSON.parse(fs.readFileSync(ROOT + '/world/konam/rooms/norseman-training.decor.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync(ROOT + '/world/konam/rooms/norseman-training.room.json', 'utf8'));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 600000, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=metal'] });
const configs = [
  { id: 'desktop', width: 1440, height: 900, mobile: false, budget: 'desktop', shots: Object.keys(decor.shots) },
  { id: 'phone390', width: 390, height: 844, mobile: true, budget: 'mobile', shots: ['hero', 'fjord', 'mountain', 'spine'] },
  { id: 'landscape', width: 844, height: 390, mobile: true, budget: 'mobile', shots: ['hero', 'pool'] },
].filter(c => !only.length || only.includes(c.id));
const summary = [];
for (const cfg of configs) {
  const page = await browser.newPage(); const errors = [];
  await page.setViewport({ width: cfg.width, height: cfg.height, deviceScaleFactor: 1, isMobile: cfg.mobile, hasTouch: cfg.mobile });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/CERT|vibrate|net::ERR/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); if (m.type() === 'warning' && /decor|norseman/.test(m.text())) errors.push('warn: ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400) errors.push('http ' + r.status() + ': ' + r.url()); });
  const url = new URL(base); url.searchParams.set('reviewRoom', 'norseman-training');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__museum?.beast?.group && window.__museumGo, { timeout: 180000 });
  await page.evaluate(() => window.__museumGo('beast'));
  await page.waitForFunction(() => window.__museum?.beast?.group?.visible === true, { timeout: 180000 });
  await page.waitForFunction(() => Boolean(window.__museum?.beast?.bikeSpot?.bike), { timeout: 90000 }).catch(() => errors.push('bike not placed in 90 s'));
  await page.waitForFunction(() => window.__museum?.beast?.terrainReady === true, { timeout: 120000 }).catch(() => errors.push('terrain not ready in 120 s'));
  await new Promise(r => setTimeout(r, 4000));
  await page.evaluate(() => { document.getElementById('cardClose')?.click(); [...document.querySelectorAll('button')].filter(b => /^Got it$/.test(b.textContent.trim())).forEach(b => b.click()); document.querySelectorAll('.coach,.toast').forEach(e => e.style.display = 'none'); });
  const shot = async name => { const s = decor.shots[name];
    await page.evaluate(([x, z, drop, lx, ly, lz]) => { const m = window.__museum; m.halt?.(); Object.assign(m.P, { x, z, drop, vx: 0, vz: 0 }); const eye = 1.6 + drop;
      m.P.yaw = Math.atan2(-(lx - x), -(lz - z)); m.P.pitch = Math.atan2(ly - eye, Math.hypot(lx - x, lz - z)); }, s);
    await new Promise(r => setTimeout(r, 1500));
    await (await page.$('#hall')).screenshot({ path: path.join(out, `${cfg.id}-${name}.png`) }); };
  for (const n of cfg.shots) await shot(n);
  await shot('hero');
  const metrics = await page.evaluate(() => { const m = window.__museum, ren = m.renderer; ren.info.autoReset = true; ren.render(m.scene, m.camera); const ri = ren.info.render;
    let meshes = 0, tris = 0; m.beast.group.traverse(o => { if (!o.isMesh || !o.visible) return; meshes++; const g = o.geometry; tris += (g?.index ? g.index.count : g?.attributes?.position?.count || 0) / 3 * (o.isInstancedMesh ? o.count : 1); });
    return { scene_calls: ri.calls, scene_triangles: ri.triangles, room_meshes: meshes, room_triangles: Math.round(tris), dpr: ren.getPixelRatio() }; });
  const fps = await page.evaluate(async () => { const d = []; let last = performance.now(), s = last; await new Promise(res => { const st = n => { d.push(n - last); last = n; n - s > 2500 ? res() : requestAnimationFrame(st); }; requestAnimationFrame(st); }); return +(1000 / (d.reduce((a, b) => a + b, 0) / d.length)).toFixed(1); });
  const b = pkg.performance[cfg.budget];
  summary.push({ config: cfg.id, viewport: [cfg.width, cfg.height], fps_mean: fps, ...metrics, budget: { calls: b.max_room_draw_calls, triangles: b.max_room_triangles }, within_budget: metrics.room_meshes <= b.max_room_draw_calls && metrics.room_triangles <= b.max_room_triangles, errors: [...new Set(errors)] });
  console.log(JSON.stringify(summary.at(-1)));
  await page.close();
}
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ captured_at: new Date().toISOString(), renderer: 'headless Chrome, ANGLE Metal (hardware)', configs: summary }, null, 2) + '\n');
await browser.close();
