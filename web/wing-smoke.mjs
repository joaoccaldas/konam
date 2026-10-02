// Wing smoke: every room of every data-built wing, one painting card, one bike card, the settings sheet.
//   node web/wing-smoke.mjs [outDir] [w] [h]      (serve the repo root on :8754)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [, , out = 'renders/wing-smoke', w = 1024, h = 640] = process.argv;
fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
const b = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 1200000, args: ['--no-sandbox', '--ignore-certificate-errors', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h });
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(m.text())) errors.push(m.text()); });
await p.goto(`http://127.0.0.1:${process.env.PORT || 8754}/?v=wing${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__museum && window.__atlas && window.__app, { timeout: 240000 });
await p.evaluate(() => { try { localStorage.setItem('speedmax.coach.v1', '1'); } catch (_) { } window.__museum.enter(); });
await p.waitForFunction(() => window.__atlas.bikes.every(x => x.bike) && window.__atlas.sculptures.every(s => s.model), { timeout: 900000, polling: 3000 }).catch(() => errors.push('wing models not all loaded'));
const ids = await p.evaluate(() => window.__atlas.rooms.map(r => r.wing + '/' + r.id));
for (const id of ids.filter(i => !process.env.WING || i.startsWith(process.env.WING))) {
  await p.evaluate(id => { const [wg, rid] = id.split('/'); const r = window.__atlas.rooms.find(q => q.wing === wg && q.id === rid), { P } = window.__museum; window.__museum.halt();
    P.x = r.view.x; P.z = r.view.z; P.y = 6.6; P.yaw = Math.atan2(-(r.look.x - P.x), -(r.look.z - P.z)); P.pitch = -.05; }, id);
  await new Promise(r => setTimeout(r, +(process.env.SETTLE || 4000)));
  await p.screenshot({ path: `${out}/${id.replace('/', '--')}.png` });
}
await p.evaluate(() => window.__app.openArt(window.__atlas.paintings[0])); await new Promise(r => setTimeout(r, 1500)); await p.screenshot({ path: `${out}/card-painting.png` });
await p.evaluate(() => window.__app.openAtlas(window.__atlas.bikes.find(x => x.data.ref) || window.__atlas.bikes[0])); await new Promise(r => setTimeout(r, 1500)); await p.screenshot({ path: `${out}/card-bike.png` });
await p.evaluate(() => window.__app.openArt(window.__atlas.sculptures[0])); await new Promise(r => setTimeout(r, 1500)); await p.screenshot({ path: `${out}/card-sculpture.png` });
await p.evaluate(() => { document.getElementById('card').classList.remove('on'); window.__app.settings.open(); }); await new Promise(r => setTimeout(r, 800)); await p.screenshot({ path: `${out}/settings.png` });
const stats = await p.evaluate(() => ({ calls: window.__museum.renderer.info.render.calls, tris: window.__museum.renderer.info.render.triangles }));
console.log(JSON.stringify({ rooms: ids.length, stats, errors: [...new Set(errors)] }, null, 1));
await b.close();
