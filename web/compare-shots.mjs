// Before/after screenshots: the same steps on two builds (e.g. the live site and a local build).
//   node web/compare-shots.mjs <baseUrl> <outDir> [w] [h] [mobile]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [, , base, out, w = 390, h = 844, mob = '1'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
const b = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 1200000, args: ['--no-sandbox', '--ignore-certificate-errors', '--enable-unsafe-swiftshader'] });
const errs = [];
const page = async () => { const p = await b.newPage(); await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: mob === '1', hasTouch: mob === '1' }); p.on('pageerror', e => errs.push(e.message)); return p; };
const wait = ms => new Promise(r => setTimeout(r, ms));
let p = await page();
await p.goto(`${base}/?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await p.waitForFunction(() => window.__museum, { timeout: 300000 });
await p.waitForFunction(() => window.__museum.PIECES.filter(x => x.glb).every(x => x.bike), { timeout: 600000, polling: 3000 }).catch(() => errs.push('hall slow'));
await wait(3000); await p.screenshot({ path: `${out}/1-landing.png` });
await p.evaluate(() => { try { localStorage.setItem('speedmax.coach.v1', '1'); } catch (_) { } window.__museum.enter(); });
await wait(6000); await p.screenshot({ path: `${out}/2-hall.png` });
await p.evaluate(() => { const M = window.__museum; const piece = M.PIECES.find(x => x.bike); M.visit(piece); });
await p.waitForFunction(() => document.getElementById('card')?.classList.contains('on'), { timeout: 240000, polling: 1000 }).catch(() => {});
await wait(2500); await p.screenshot({ path: `${out}/3-card.png` });
const hasMap = await p.evaluate(() => !!window.__map);
if (hasMap) { await p.evaluate(() => { document.getElementById('card').classList.remove('on'); window.__map.open(); }); await wait(1200); await p.screenshot({ path: `${out}/4-map.png` }); await p.evaluate(() => window.__map.close()); }
const hasApp = await p.evaluate(() => !!window.__app);
if (hasApp) {
  await p.evaluate(() => window.__app.settings.open()); await wait(900); await p.screenshot({ path: `${out}/5-settings.png` }); await p.evaluate(() => window.__app.settings.close());
  await p.waitForFunction(() => window.__atlas?.paintings?.length, { timeout: 10000 }).catch(() => {});
  await p.evaluate(() => { const a = window.__atlas.paintings[0], { P } = window.__museum; window.__museum.halt(); P.x = a.view.x; P.z = a.view.z; P.y = 6.6; P.yaw = Math.atan2(-(a.face.x - P.x), -(a.face.z - P.z)); P.pitch = 0; });
  await wait(6000); await p.screenshot({ path: `${out}/6-gallery.png` });
  await p.evaluate(() => window.__app.openArt(window.__atlas.paintings[0])); await wait(2000); await p.screenshot({ path: `${out}/7-art-card.png` });
}
await p.close();
p = await page();
const studio = fs.existsSync('../Studio.html') && !base.includes('github.io') ? `${base}/Studio.html?p=atlas-lotus-108-1992` : `${base}/Speedmax_Museum.html`;
await p.goto(studio, { waitUntil: 'domcontentloaded', timeout: 240000 }).catch(e => errs.push('studio ' + e.message));
await wait(25000); await p.screenshot({ path: `${out}/8-studio.png` });
if (await p.evaluate(() => !!window.__studio)) {
  await p.evaluate(() => document.querySelector('[data-tab=themes]').click()); await wait(800);
  await p.evaluate(() => document.querySelector('#panel .chips button').click()); await wait(9000); await p.screenshot({ path: `${out}/9-studio-theme.png` });
  await p.evaluate(() => window.__studio.setDream(true)); await wait(7000); await p.screenshot({ path: `${out}/10-dream.png` });
}
console.log(JSON.stringify({ base, errors: [...new Set(errs)] }));
await b.close();
