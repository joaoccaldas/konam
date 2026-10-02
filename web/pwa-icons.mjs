// Renders the PWA PNG icons (Android launchers, iOS home screen) from assets/pwa/icon-v3.svg — the single source of the mark.
// usage: node pwa-icons.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const svg = fs.readFileSync(new URL('../assets/pwa/icon-v3.svg', import.meta.url), 'utf8');
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await b.newPage();
for (const [name, size, pad] of [['icon-v3-192.png', 192, 0], ['icon-v3-512.png', 512, 0], ['icon-v3-maskable-512.png', 512, 0], ['apple-touch-icon-v3.png', 180, 0]]) {
  await p.setViewport({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await p.setContent(`<html><body style="margin:0;background:#f4efe7;display:grid;place-items:center;width:${size}px;height:${size}px">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${inner}" height="${inner}"></body></html>`);
  await p.screenshot({ path: new URL(`../assets/pwa/${name}`, import.meta.url).pathname, omitBackground: false });
}
await b.close(); console.log('icons written');
