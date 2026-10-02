import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'artifacts', 'artworld-visual');
fs.mkdirSync(out, { recursive: true });

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const executablePath = chromeCandidates.find(p => fs.existsSync(p));
if (!executablePath) throw new Error('Chrome/Chromium executable not found');

const baseUrl = process.env.MUSEUM_URL || 'http://127.0.0.1:8744/index.html';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = {
  baseUrl,
  executablePath,
  generatedAt: new Date().toISOString(),
  contexts: [],
};

const scenes = [
  { name: 'main-entrance', pose: { x: 0, z: 3.15, yaw: 0, pitch: -0.035 } },
  { name: 'st-george-far', pose: { x: -1.5, z: -11.8, yaw: -Math.PI / 2, pitch: -0.045 } },
  { name: 'st-george-near', goto: 'st-george' },
  { name: 'vegas-far', pose: { x: -1.5, z: -22.6, yaw: -Math.PI / 2, pitch: -0.045 } },
  { name: 'vegas-near', goto: 'las-vegas' },
  { name: 'nice-near', goto: 'nice' },
  { name: 'kona-near', goto: 'kona' },
  { name: 'secret-portal', pose: { x: -3.5, z: -36.4, yaw: Math.PI / 2, pitch: -0.035 } },
  { name: 'horror-room-wide', goto: 'horror' },
  { name: 'horror-bikes-close', horror: true, pose: { x: 45, z: -23.8, yaw: 0, pitch: -0.055 } },
];

const contexts = [
  { name: 'desktop', width: 1512, height: 982, isMobile: false, hasTouch: false },
  { name: 'samsung', width: 412, height: 915, isMobile: true, hasTouch: true },
];

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
  ],
});

let failed = false;
try {
  for (const cfg of contexts) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({
      width: cfg.width,
      height: cfg.height,
      deviceScaleFactor: 1,
      isMobile: cfg.isMobile,
      hasTouch: cfg.hasTouch,
    });

    const pageErrors = [];
    const consoleErrors = [];
    const consoleWarnings = [];
    page.on('pageerror', e => pageErrors.push(e.stack || e.message));
    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push(m.text());
      if (m.type() === 'warn') consoleWarnings.push(m.text());
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(
      () => window.__museum && window.__museumArt,
      { timeout: 45000 },
    );
    await page.waitForFunction(
      () => window.__museumArt?.ready,
      { timeout: 30000 },
    );
    await page.waitForFunction(
      () => window.__museum?.PIECES?.some(p => p.bike),
      { timeout: 30000 },
    ).catch(() => {});

    await page.evaluate(() => {
      try { localStorage.setItem('speedmax.coach.v1', '1'); } catch (_) {}
      window.__museum.enter();
    });
    // Let the museum's own entrance route finish before deterministic camera teleports.
    // Otherwise its private path follower keeps pulling screenshots back toward the lobby.
    await page.waitForFunction(() => {
      const p = window.__museum?.P;
      return p && Math.abs(p.z - 0.6) < 0.3 && Math.hypot(p.vx || 0, p.vz || 0) < 0.45;
    }, { timeout: 10000 }).catch(() => {});
    await pause(450);

    const metadata = await page.evaluate(() => {
      const gl = window.__museum.renderer.getContext();
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const art = window.__museum.scene.getObjectByName('ART WORLD');
      return {
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        artChildren: art?.children?.length || 0,
        assetChildren: window.__museumArt.asset?.children?.length || 0,
        bikeCount: window.__museum.PIECES.filter(p => p.bike).length,
        artLoadError: window.__museumArt.loadError || null,
        invalidArtGeometry: (() => {
          let invalid = 0;
          art?.traverse(o => {
            const a = o.isMesh && o.geometry?.attributes?.position?.array;
            if (a && Array.from(a).some(v => !Number.isFinite(v))) invalid++;
          });
          return invalid;
        })(),
      };
    });

    const shots = [];
    for (const scene of scenes) {
      await page.evaluate(({ goto, horror, pose }) => {
        const art = window.__museumArt;
        const P = window.__museum.P;
        if (goto) art.goto(goto);
        if (horror && !art.regionOf(P.x, P.z)) art.enter({ id: 'horror-in' });
        if (pose) Object.assign(P, { ...pose, vx: 0, vz: 0 });
        document.getElementById('card')?.classList.remove('on');
        document.body.classList.remove('card-open');
        document.getElementById('toast')?.classList.remove('on');
        document.getElementById('coach')?.setAttribute('hidden', '');
      }, scene);

      await pause(scene.name.includes('near') ? 1100 : 700);
      const file = path.join(out, `${cfg.name}__${scene.name}.png`);
      await page.screenshot({ path: file, type: 'png' });
      const bytes = fs.statSync(file).size;
      shots.push({ scene: scene.name, file: path.basename(file), bytes });
      if (bytes < 15000) failed = true;
    }

    const sceneState = await page.evaluate(() => {
      const hidden = window.__museum.scene.getObjectByName('SECRET COLLECTION');
      const archive = hidden?.getObjectByName('ARCHIVE WALL');
      return {
        hiddenRoomExists: !!hidden,
        hiddenRoomChildren: hidden?.children?.length || 0,
        archiveBikes: archive?.children?.length || 0,
        artReady: !!window.__museumArt?.ready,
      };
    });

    report.contexts.push({
      ...cfg,
      metadata,
      sceneState,
      shots,
      pageErrors,
      consoleErrors,
      consoleWarnings,
    });

    const expectedArchive = cfg.isMobile ? 8 : 18;
    if (pageErrors.length || consoleErrors.length || metadata.artLoadError || metadata.invalidArtGeometry || sceneState.archiveBikes !== expectedArchive || metadata.assetChildren === 0) failed = true;
    await context.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed) {
  console.error('Art-world visual smoke failed. Inspect report.json and screenshots.');
  process.exitCode = 1;
}
