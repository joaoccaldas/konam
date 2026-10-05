// Visual + budget evidence for The Hollow House, captured from the actual implementation.
//   node tools/build_pages.mjs && python3 -m http.server 8765   (repo root), then:
//   CHROME_PATH=/usr/bin/google-chrome node web/hollow-house-evidence.mjs http://127.0.0.1:8765/
// Writes docs/evidence/hollow-house/*.png and report.json, and fails if the page throws, the room never paints,
// or the room's own draw calls / triangles exceed the budgets declared in its manifest.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'docs/evidence/hollow-house');
fs.mkdirSync(out, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'world/konam/rooms/hollow-house.room.json'), 'utf8'));
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => fs.existsSync(f));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// yaw: looking east is -π/2; the host's forward is (-sin yaw, -cos yaw)
const VIEWS = [
  ['01-door-from-hall', 5.6, -38.4, -Math.PI / 2, -.02],
  ['02-foyer-stair-and-glass', 11, -38.4, 0, .08],
  ['03-corridor-and-the-lodger', 15.8, -38.4, -Math.PI / 2, 0],
  ['04-parlor-table', 16.6, -34.2, -1.2, -.1],
  ['05-nursery', 22, -34, -Math.PI / 2, -.1],
  ['06-library', 16.5, -42, -Math.PI / 2, -.05],
  ['07-dining', 22, -41.5, -1.2, -.1],
  ['08-cellar-machine', 28.6, -40.4, -Math.PI / 2, -.02],
];

const browser = await puppeteer.launch({
  executablePath: chrome, headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--ignore-certificate-errors'],
});

async function capture(label, viewport, { reduce = false, views = VIEWS } = {}) {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::|CORS|blocked by/.test(m.text())) errors.push('console: ' + m.text()); });
  if (reduce) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport(viewport);
  const url = new URL(base); url.searchParams.set('reviewRoom', 'hollow-house'); url.searchParams.set('room', 'hollow');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => window.__museum?.hollow && window.__museumGo, { timeout: 400000, polling: 1000 });
  await page.evaluate(() => { try { localStorage.setItem('speedmax.coach.v1', '1'); } catch (_) { } window.__museum.enter(); window.__museumGo('hollow'); });
  await page.evaluate(() => window.__museum.hollow.ready);
  await page.waitForFunction(() => window.__museum.hollow.bikeSpot.bike, { timeout: 300000, polling: 1000 }).catch(() => errors.push('the CFR never loaded'));
  const shots = [];
  for (const [name, x, z, yaw, pitch] of views) {
    await page.evaluate((x, z, yaw, pitch) => { const m = window.__museum; m.halt(); Object.assign(m.P, { x, z, yaw, pitch }); }, x, z, yaw, pitch);
    await sleep(2500);
    const file = `${label}-${name}.png`;
    await page.screenshot({ path: path.join(out, file) });
    shots.push(file);
  }
  const state = await page.evaluate(() => {
    const h = window.__museum.hollow;
    return { room: h.group.name, visible: h.group.visible, budget: h.budget(), budgetWithBike: h.budget({ withBike: true }), painted: h.painted(), pickables: window.__museum.pickables.length, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
  await page.close();
  return { label, viewport, state, shots, errors };
}

const results = [];
results.push(await capture('desktop', { width: 1280, height: 720, deviceScaleFactor: 1 }));
results.push(await capture('phone-portrait', { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, { views: VIEWS.slice(0, 4) }));
results.push(await capture('phone-landscape', { width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, { views: [VIEWS[1], VIEWS[2]] }));
results.push(await capture('desktop-reduced-motion', { width: 1280, height: 720, deviceScaleFactor: 1 }, { reduce: true, views: [VIEWS[2]] }));
await browser.close();

const problems = results.flatMap(r => r.errors.map(e => `${r.label}: ${e}`));
for (const r of results) {
  const tier = r.viewport.width < 600 || r.viewport.height < 500 ? 'mobile' : 'desktop', b = manifest.performance[tier], s = r.state;
  if (s.room !== 'hollowHouseRoom' || s.visible !== true) problems.push(`${r.label}: room did not become visible`);
  if (s.painted[0] !== s.painted[1]) problems.push(`${r.label}: only ${s.painted[0]} of ${s.painted[1]} surfaces painted`);
  if (s.budget.draws > b.max_room_draw_calls) problems.push(`${r.label}: ${s.budget.draws} draws > ${b.max_room_draw_calls}`);
  if (s.budget.tris > b.max_room_triangles) problems.push(`${r.label}: ${s.budget.tris} triangles > ${b.max_room_triangles}`);
  r.tier = tier; r.limits = { draws: b.max_room_draw_calls, triangles: b.max_room_triangles };
}
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ note: 'software-rendered (SwiftShader) browser; frame times are not representative, budgets (draws, triangles) are exact', results }, null, 2) + '\n');
if (problems.length) throw new Error(problems.join('\n'));
console.log(JSON.stringify(results.map(r => ({ label: r.label, tier: r.tier, budget: r.state.budget, limits: r.limits })), null, 2));
