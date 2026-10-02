// Headless gameplay smoke test. Needs the local server (npm run serve) and Google Chrome.
// Usage: node tools/smoke_game.mjs [outDir]
import puppeteer from 'puppeteer-core';
const OUT = process.argv[2] || 'renders/review';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.KONA_URL || 'http://127.0.0.1:8791/';
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
const errors = [];
p.on('pageerror', e => errors.push(e.message));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const loaded = new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('load timeout')), 240000); p.on('console', m => { if (/Load completed/.test(m.text())) { clearTimeout(t); res(); } }); });
await p.goto(URL, { waitUntil: 'load' });
await loaded; await sleep(3000);
await p.evaluate(() => localStorage.clear());

// 1. terrain
const dem = await p.evaluate(() => { let best = 0, up = 0, n = 0; window.__kona.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > 400000) { o.geometry.computeBoundingBox(); best = Math.max(best, o.geometry.boundingBox.max.y); const nr = o.geometry.attributes.normal; for (let i = 0; i < nr.count; i += 997) { n++; if (nr.getY(i) > 0) up++; } } }); return { best, up, n }; });
check(dem.best > 3500, `island DEM loaded (peak ${Math.round(dem.best)} m)`);
check(dem.n > 0 && dem.up / dem.n > 0.99, `island faces point up (${dem.up}/${dem.n})`);

// 2. quest: proximity must not auto-complete; E completes
const s0 = await p.evaluate(() => window.__kona.currentStep.id);
await p.evaluate(() => document.querySelector('#btnTeleportStep').click());
await sleep(2500);
const s1 = await p.evaluate(() => ({ id: window.__kona.currentStep.id, prompt: document.querySelector('#actionPrompt').classList.contains('on') }));
check(s1.id === s0, `arriving does not auto-complete (${s0})`);
check(s1.prompt, 'action prompt shown at objective');
await p.keyboard.press('KeyE'); await sleep(800);
const s2 = await p.evaluate(() => window.__kona.currentStep.id);
check(s2 !== s0, `E completes the objective (${s0} -> ${s2})`);

// 3. bike: B mounts via app (UI in sync), W accelerates realistically, coasting decays, no jump
await p.keyboard.press('KeyB'); await sleep(400);
const label = await p.evaluate(() => document.querySelector('#modeLabel')?.textContent);
check(/bike/i.test(label || ''), `B syncs UI mode label (${label})`);
await p.keyboard.down('KeyW');
const v = [];
for (let i = 0; i < 10; i++) { await sleep(1000); v.push(await p.evaluate(() => window.__kona.locomotion.getState().speedKmh)); }
const hud = await p.evaluate(() => document.querySelector('#mode').textContent);
await p.keyboard.up('KeyW');
check(v[0] > 0 && v[0] < 25, `bike accelerates gradually (1 s: ${v[0]} km/h)`);
check(v[9] > 25 && v[9] < 55, `bike reaches a plausible speed at 250 W (10 s: ${v[9]} km/h)`);
check(/rpm/.test(hud) && /×/.test(hud) && /W/.test(hud), `ride HUD shows cadence/gear/power (${hud})`);
await sleep(2000);
const coast = await p.evaluate(() => window.__kona.locomotion.getState().speedKmh);
check(coast > 0 && coast < v[9], `coasting decays (${v[9]} -> ${coast} km/h)`);
await p.keyboard.press('Space'); await sleep(150);
const airborne = await p.evaluate(() => !window.__kona.locomotion.getState().isGrounded);
check(!airborne, 'no jumping on the bike');
await p.screenshot({ path: `${OUT}/smoke_bike.png` });

// 4. walk speed
await p.keyboard.press('KeyB'); await sleep(400);
await p.keyboard.down('KeyW'); await sleep(1500);
const walk = await p.evaluate(() => window.__kona.locomotion.getState().speedKmh);
await p.keyboard.up('KeyW');
check(walk >= 5 && walk <= 7, `walking speed is human (${walk} km/h)`);

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await b.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASSED');
process.exit(fails.length ? 1 : 0);
