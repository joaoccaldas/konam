// Theme-room audit: stands in each upper-floor room (Bio, Horror, Alien, Zombie) and screenshots
// the arrival view, then (WALK=1) walks room-to-room from the rail chips to catch nave stalls.
//   python3 -m http.server 8754 --bind 127.0.0.1      (repo root)
//   node web/walk-rooms.mjs [outDir] [width] [height]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [, , out = 'renders/rooms', w = 960, h = 600] = process.argv;
fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
const b = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--ignore-certificate-errors', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: +w < 700, hasTouch: +w < 700 });
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(`http://127.0.0.1:${process.env.PORT || 8754}/?v=walk${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__museum && window.__gallery, { timeout: 180000 });
await p.evaluate(() => { try { localStorage.setItem('speedmax.coach.v1', '1'); } catch (_) { } window.__museum.enter(); });
await p.waitForFunction(() => window.__gallery.rooms.every(r => r.bike), { timeout: 300000, polling: 1000 }).catch(() => errors.push('theme bikes not loaded'));
const ids = process.env.ROOMS?.split(',') || ['bio', 'horror', 'alien', 'zombie'];
const rows = [];
for (const id of ids) {                                          // stand where the walk ends, look where it looks
  await p.evaluate(id => {
    const { P } = window.__museum, r = window.__gallery.rooms.find(x => x.id === id);
    window.__museum.halt();
    P.x = r.view.x; P.z = r.view.z; P.y = 6.6;
    P.yaw = Math.atan2(-(r.face.x - P.x), -(r.face.z - P.z)); P.pitch = Math.atan2(r.face.y - (P.y + 1.62), Math.hypot(r.face.x - P.x, r.face.z - P.z));
  }, id);
  await new Promise(r => setTimeout(r, +(process.env.SETTLE || 6000)));
  const s = await p.evaluate(() => { const { P, scene, renderer } = window.__museum; return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), fog: '#' + scene.fog?.color.getHexString(), exposure: +renderer.toneMappingExposure.toFixed(2), calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; });
  await p.screenshot({ path: `${out}/room-${id}.png` });
  rows.push({ id, ...s });
}
if (process.env.WALK) {                                          // chip to chip, the way a visitor does it
  for (const id of ids) {
    const t0 = Date.now();
    await p.evaluate(id => { document.getElementById('card').classList.remove('on'); document.querySelector(`.chip.${id}`)?.click(); }, id);
    const ok = await p.waitForFunction(() => document.getElementById('card').classList.contains('on'), { timeout: +(process.env.WALK_MS || 240000), polling: 500 }).then(() => true, () => false);
    const s = await p.evaluate(() => { const { P } = window.__museum; return { x: +P.x.toFixed(2), z: +P.z.toFixed(2), card: document.getElementById('cName').textContent }; });
    rows.push({ walk: id, arrived: ok, secs: Math.round((Date.now() - t0) / 1000), ...s });
  }
}
console.log(JSON.stringify({ rows, errors: [...new Set(errors)] }, null, 1));
await b.close();
