import puppeteer from 'puppeteer-core';
const [, , out = 'shot.png', w = 1440, h = 900, script = ''] = process.argv;
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: +w < 700, hasTouch: +w < 700 });
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warn') console.log('console', m.type(), m.text()); });
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('http://127.0.0.1:8731/', { waitUntil: 'load' });
await p.waitForFunction(() => document.body.classList.contains('ready'), { timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
if (script) { await p.evaluate(script); await new Promise(r => setTimeout(r, 2600)); }
await p.screenshot({ path: out });
await b.close();
