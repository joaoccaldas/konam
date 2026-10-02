// Against the Clock + map smoke: loads the page, checks for errors, stands in each wing room and
// screenshots it, opens a bike card and the map.   node web/atlas-smoke.mjs [outDir] [w] [h]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [, , out = 'renders/atlas-smoke', w = 800, h = 500] = process.argv;
fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
const b = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 900000, args: ['--no-sandbox', '--ignore-certificate-errors', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h });
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(m.text())) errors.push(m.text()); });
await p.goto(`http://127.0.0.1:${process.env.PORT || 8754}/?v=atlas${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__museum && window.__atlas && window.__map, { timeout: 240000 });
await p.evaluate(() => { try { localStorage.setItem('speedmax.coach.v1', '1'); } catch (_) { } window.__museum.enter(); });
await p.waitForFunction(() => window.__atlas.bikes.every(x => x.bike) && window.__atlas.show.bike, { timeout: 600000, polling: 2000 }).catch(() => errors.push('atlas bikes not loaded in time'));
const shots = process.env.SHOTS?.split(',') || ['corridor', 'hour', 'mono', 'tri', 'types', 'paint', 'refs'];
for (const id of shots) {
  await p.evaluate(id => {
    const { P } = window.__museum, A = window.__atlas; window.__museum.halt();
    const look = (x, y, z) => { P.yaw = Math.atan2(-(x - P.x), -(z - P.z)); P.pitch = Math.atan2(y - (P.y + 1.62), Math.hypot(x - P.x, z - P.z)); };
    P.y = 6.6;
    if (id === 'corridor') { P.x = 13.6; P.z = 28.2; look(13.6, 8.6, 51); return; }
    const r = A.rooms.find(q => q.id === id);
    P.x = r.view.x; P.z = r.view.z; look(r.look.x, r.look.y, r.look.z);
  }, id);
  await new Promise(r => setTimeout(r, +(process.env.SETTLE || 5000)));
  await p.screenshot({ path: `${out}/atlas-${id}.png` });
}
const stats = await p.evaluate(() => ({ calls: window.__museum.renderer.info.render.calls, tris: window.__museum.renderer.info.render.triangles, bikes: window.__atlas.bikes.map(x => [x.data.key, !!x.bike]) }));
await p.evaluate(() => { const i = window.__atlas.bikes[2]; window.__museum.P.x = i.view.x; window.__museum.P.z = i.view.z; document.querySelector('.chip.atlas'); });
await p.evaluate(() => window.__map.open());
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: `${out}/map-upper.png` });
await p.evaluate(() => document.querySelector('.map-tabs button[data-floor=ground]').click());
await new Promise(r => setTimeout(r, 800));
await p.screenshot({ path: `${out}/map-ground.png` });
console.log(JSON.stringify({ stats, errors: [...new Set(errors)] }, null, 1));
await b.close();
