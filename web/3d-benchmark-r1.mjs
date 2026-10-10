// Unified 3D benchmark harness R1.
// Research-only utility. Measures existing scenes without changing runtime behavior.
//
// Usage:
//   CHROME_PATH=/path/to/chrome node web/3d-benchmark-r1.mjs nor [base] [out]
//   CHROME_PATH=/path/to/chrome node web/3d-benchmark-r1.mjs beast [base] [out]
//   CHROME_PATH=/path/to/chrome node web/3d-benchmark-r1.mjs museum [base] [out]\n//   CHROME_PATH=/path/to/chrome node web/3d-benchmark-r1.mjs breitling [base] [out]
//
// The harness intentionally reuses existing review/runtime surfaces.
// It does not create a renderer, room implementation, or product authority.

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const mode = process.argv[2] || 'nor';
const base = process.argv[3] || 'http://127.0.0.1:8754/';
const out = path.resolve(process.argv[4] || 'docs/evidence/3d-benchmark-r1', mode);
fs.mkdirSync(out, { recursive: true });

const chrome = process.env.CHROME_PATH || process.env.CHROME;
if (!chrome) throw new Error('CHROME_PATH or CHROME is required');

const configs = [
  { name: 'phone390', viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  { name: 'landscape', viewport: { width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  { name: 'desktop', viewport: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false } }
];

function pct(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)));
  return +sorted[i].toFixed(3);
}

async function sampleFrames(page, ms = 5000) {
  return page.evaluate(async duration => {
    const d = [];
    let last = performance.now();
    const start = last;
    await new Promise(resolve => {
      function step(now) {
        if (now > last) d.push(now - last);
        last = now;
        if (now - start >= duration) resolve();
        else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
    return d;
  }, ms);
}

async function enter(page) {
  if (mode === 'nor') {
    const url = new URL('norwegian-engine-review.html', base);
    await page.goto(url.href, { waitUntil: 'networkidle0', timeout: 180000 });
    await page.waitForFunction(() => window.__NOR3_REVIEW_READY === true && window.__NOR3_REVIEW_API, { timeout: 90000 });
    await page.evaluate(() => window.__NOR3_REVIEW_API.setView('overview'));
    await new Promise(r => setTimeout(r, 1400));
    return;
  }

  const url = new URL(base);
  if (mode === 'beast') {
    url.searchParams.set('reviewRoom', 'beast-cave');
    url.searchParams.set('room', 'beast');
  }
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__museum, { timeout: 180000 });

  if (mode === 'breitling') {
    await page.waitForFunction(() => window.__museumGo && window.__BRANDROOMS?.rooms?.some?.(r => r.id === 'breitling'), { timeout: 180000 });
    await page.evaluate(() => {
      try { localStorage.setItem('speedmax.coach.v1', '1'); } catch {}
      window.__museum.enter?.();
      window.__museumGo('breitling');
    });
    await new Promise(r => setTimeout(r, 7000));
    return;
  }

  if (mode === 'museum') {
    await page.evaluate(() => {
      try { localStorage.setItem('speedmax.coach.v1', '1'); } catch {}
      window.__museum.enter?.();
    });
  } else if (mode === 'beast') {
    await page.waitForFunction(() => window.__museum?.beast?.group, { timeout: 120000 });
  }
  await new Promise(r => setTimeout(r, 5000));
}

async function runtimeMetrics(page) {
  return page.evaluate(mode => {
    if (mode === 'nor') return window.__NOR3_REVIEW_API.metrics();
    const r = window.__museum?.renderer;
    const scene = window.__museum?.scene;
    let meshes = 0, lights = 0, materials = new Set(), geometries = new Set(), textures = new Set();
    scene?.traverse?.(o => {
      if (o.isMesh) {
        meshes++;
        if (o.geometry?.uuid) geometries.add(o.geometry.uuid);
        for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
          if (!m) continue;
          materials.add(m.uuid || m.id);
          for (const k of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap']) {
            if (m[k]?.uuid) textures.add(m[k].uuid);
          }
        }
      }
      if (o.isLight) lights++;
    });
    return {
      meshes,
      lights,
      unique_geometries: geometries.size,
      unique_materials: materials.size,
      textures: textures.size,
      draw_calls: r?.info?.render?.calls ?? null,
      triangles: r?.info?.render?.triangles ?? null,
      points: r?.info?.render?.points ?? null,
      lines: r?.info?.render?.lines ?? null,
      dpr: r?.getPixelRatio?.() ?? null
    };
  }, mode);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  protocolTimeout: 600000,
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']
});

const results = [];
for (const cfg of configs) {
  const page = await browser.newPage();
  await page.setViewport(cfg.viewport);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('response', res => { if (res.status() >= 400) errors.push('http ' + res.status() + ': ' + res.url()); });

  const t0 = performance.now();
  await enter(page);
  const readyMs = performance.now() - t0;

  const samples = await sampleFrames(page, +(process.env.SAMPLE_MS || 5000));
  const sorted = [...samples].sort((a,b) => a - b);
  const metrics = await runtimeMetrics(page);
  const fps = samples.length ? +(1000 / (samples.reduce((a,b)=>a+b,0)/samples.length)).toFixed(2) : null;

  const row = {
    mode,
    config: cfg.name,
    viewport: cfg.viewport,
    ready_ms: +readyMs.toFixed(1),
    frame_samples: samples.length,
    fps_mean: fps,
    frame_ms_p50: pct(sorted, .50),
    frame_ms_p95: pct(sorted, .95),
    frame_ms_p99: pct(sorted, .99),
    ...metrics,
    errors: [...new Set(errors)]
  };

  await page.screenshot({ path: path.join(out, cfg.name + '.png'), fullPage: false });
  fs.writeFileSync(path.join(out, cfg.name + '.json'), JSON.stringify(row, null, 2) + '\n');
  results.push(row);
  await page.close();
}

await browser.close();

const summary = {
  schema_version: 1,
  benchmark: 'BenchmarkSpec-v1-draft',
  mode,
  captured_at: new Date().toISOString(),
  git_sha: process.env.GIT_SHA || 'UNKNOWN',
  sample_ms: +(process.env.SAMPLE_MS || 5000),
  results
};

fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

const failures = results.flatMap(r => r.errors.map(e => r.config + ': ' + e));
if (failures.length) process.exitCode = 1;
console.log(JSON.stringify(summary, null, 2));
