#!/usr/bin/env node
/**
 * tools/render_paintings.mjs — render museum "paintings" (side-view images) for every
 * bike GLB, used as landing-page exhibit art. Zero network: three.js from web/node_modules.
 *
 * Usage: node tools/render_paintings.mjs   (run from repo root)
 */
import { build } from '../web/node_modules/esbuild/lib/main.js';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import puppeteer from '../web/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'assets/reference/paintings');
fs.mkdirSync(outDir, { recursive: true });

const bikes = [
  { key: 'cfr-2027',         glb: 'assets/museum/speedmax_web.glb',                    color: 0xeceaf0 },
  { key: 'slx-2027',         glb: 'assets/museum-slx/speedmax_web.glb',                color: 0x9aa3ad },
  { key: 'speedmax-three-2005', glb: 'assets/heritage/speedmax-three-2005/speedmax_web.glb', color: 0x14161a },
  { key: 'speedmax-2007',    glb: 'assets/heritage/speedmax-2007/speedmax_web.glb',     color: 0x8a1f1f },
  { key: 'speedmax-al-2011',  glb: 'assets/heritage/speedmax-al-2011/speedmax_web.glb',  color: 0xd8d8dc },
  { key: 'speedmax-cf-2011',  glb: 'assets/heritage/speedmax-cf-2011/speedmax_web.glb',  color: 0x101014 },
];

// ---------------------------------------------------------------- inline viewer page
const pageHtml = (glbB64) => `<!doctype html><html><body style="margin:0;overflow:hidden;background:#0d1117">
<canvas id="c" style="width:100vw;height:100vh;display:block"></canvas>
<script>__APP__</script></body></html>`;

const app = await build({
  stdin: {
    contents: `
      import * as THREE from 'three';
      import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
      import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
      import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
      window.__render = async (b64) => {
        const canvas = document.getElementById('c');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.AgXToneMapping;
        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
        const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 2); scene.add(key);
        const rim = new THREE.DirectionalLight(0xcfe3ff, 1.4); rim.position.set(-3, 1.5, -2); scene.add(rim);
        const hemi = new THREE.HemisphereLight(0xffffff, 0x222831, .5); scene.add(hemi);
        const u8 = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const gltf = await new Promise((res, rej) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(u8.buffer, '', res, rej));
        scene.add(gltf.scene);
        // frame the bike from the side (X = bike length axis in this rig)
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, .01, 100);
        const d = Math.max(size.x, size.y);
        cam.position.set(c.x, c.y + d * .04, c.z + d * 2.6);
        cam.lookAt(c);
        renderer.setSize(innerWidth, innerHeight);
        renderer.render(scene, cam);
        return box.getSize(new THREE.Vector3()).toArray();
      };
    `,
    resolveDir: path.join(root, 'web'),
  },
  bundle: true, format: 'iife', minify: false, write: false, target: 'es2020',
});
const appJs = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const server = createServer((req, res) => { res.writeHead(404); res.end(); }).listen(0);
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
try {
  for (const b of bikes) {
    const glbPath = path.join(root, b.glb);
    if (!fs.existsSync(glbPath)) { console.log('SKIP (no glb)', b.key); continue; }
    const b64 = fs.readFileSync(glbPath).toString('base64');
    const html = pageHtml().replace('__APP__', appJs);
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 600, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent(html, { waitUntil: 'load' });
    const size = await page.evaluate((b64) => window.__render(b64), b64);
    const png = await page.screenshot({ type: 'png' });
    fs.writeFileSync(path.join(outDir, `${b.key}.png`), png);
    console.log('painted', b.key, 'size', size.map(n => n.toFixed(2)).join('×'), errors.length ? 'ERRORS: ' + errors.join(';') : '');
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log('done →', outDir);