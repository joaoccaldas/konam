// Shared stage for the standalone experiences (night scenes and History Lane):
// renderer tuned per device, an orbit or rail camera driven by touch, the Speedmax loader with
// exploded view and part picking, and a scene-built environment map so metal and paint reflect
// the world they stand in rather than a generic studio.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export const coarse = matchMedia('(pointer: coarse)').matches;
export const lite = coarse || innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const B2T = v => new THREE.Vector3(v[0], v[2], -v[1]);

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
export const seeded = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite || devicePixelRatio < 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.shadowMap.enabled = !lite; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .05, 600);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const frameFns = [];
  const stage = {
    renderer, scene, camera,
    onFrame: f => frameFns.push(f),
    // environment from a small scene of the theme's own light (sky, moon, fire, lamps): reflections that belong
    envFrom(envScene, intensity = 1) { const rt = pmrem.fromScene(envScene, .02); scene.environment = rt.texture; scene.environmentIntensity = intensity; },
    resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = h > w ? 62 : 45; camera.updateProjectionMatrix(); },
  };
  addEventListener('resize', stage.resize); stage.resize();
  let last = performance.now();
  renderer.setAnimationLoop(now => { const dt = Math.min(.05, (now - last) / 1000); last = now; for (const f of frameFns) f(dt, now / 1000); renderer.render(scene, camera); });
  return stage;
}

// ---- orbit camera: drag to turn, pinch or wheel to zoom, tap to pick, idles into a slow turn
export function orbit(stage, canvas, o, onTap) {
  const S = { target: new THREE.Vector3(...o.target), yaw: o.yaw ?? .6, pitch: o.pitch ?? .12, r: o.r ?? 4.2, rMin: o.rMin ?? 1.6, rMax: o.rMax ?? 9, idle: 0, fly: null };
  const ptrs = new Map(); let drag = null, pinch = null;
  canvas.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, e); canvas.setPointerCapture(e.pointerId); S.idle = 0; S.fly = null;
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch, moved: 0 };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), r: S.r }; drag = null; } });
  canvas.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, e);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; S.r = clamp(pinch.r * pinch.d / Math.max(20, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)), S.rMin, S.rMax); return; }
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); S.yaw = drag.yaw - dx * .006; S.pitch = clamp(drag.pitch + dy * .004, -.15, 1.1); } });
  const up = e => { const d = drag; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (d && d.moved < 7 && ptrs.size === 0) onTap?.(e.clientX, e.clientY); if (!ptrs.size) drag = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = pinch = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); S.r = clamp(S.r * (1 + Math.sign(e.deltaY) * .08), S.rMin, S.rMax); S.idle = 0; }, { passive: false });
  const v = new THREE.Vector3();
  stage.onFrame(dt => {
    S.idle += dt; if (S.idle > 7 && !reduce && !S.fly) S.yaw += dt * .08;
    if (S.fly) { const k = 1 - Math.exp(-dt * 3.2); S.target.lerp(S.fly.target, k); S.r += (S.fly.r - S.r) * k; if (S.fly.yaw != null) S.yaw += (S.fly.yaw - S.yaw) * k; if (S.target.distanceTo(S.fly.target) < .01) S.fly = null; }
    v.set(Math.sin(S.yaw) * Math.cos(S.pitch), Math.sin(S.pitch), Math.cos(S.yaw) * Math.cos(S.pitch)).multiplyScalar(S.r).add(S.target);
    stage.camera.position.copy(v); stage.camera.lookAt(S.target);
  });
  return S;
}

// ---- rail camera: drag or scroll along a path (History Lane)
export function rail(stage, canvas, curve, lookAt, onTap, onMove) {
  const S = { t: 0, want: 0, look: 0 };
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, t: S.want, look: S.look, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    S.want = clamp(drag.t + dy * -.0009 * (coarse ? 1.4 : 1), 0, 1); S.look = clamp(drag.look - dx * .004, -1.2, 1.2); });
  canvas.addEventListener('pointerup', e => { if (drag && drag.moved < 7) onTap?.(e.clientX, e.clientY); drag = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); S.want = clamp(S.want + e.deltaY * .00025, 0, 1); }, { passive: false });
  addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'w') S.want = clamp(S.want + .02, 0, 1); if (e.key === 'ArrowDown' || e.key === 's') S.want = clamp(S.want - .02, 0, 1); });
  const p = new THREE.Vector3(), q = new THREE.Vector3(), l = new THREE.Vector3();
  stage.onFrame(dt => {
    S.t += (S.want - S.t) * (1 - Math.exp(-dt * 3));
    curve.getPointAt(S.t, p); curve.getPointAt(Math.min(1, S.t + .01), q);
    stage.camera.position.set(p.x, 1.65, p.z);
    lookAt(S.t, l, p, q); const dir = l.sub(stage.camera.position); dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.look);
    stage.camera.lookAt(stage.camera.position.clone().add(dir));
    onMove?.(S.t);
  });
  return S;
}

// ---- the Speedmax: load, repaint, exploded view, parts
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export async function loadSpeedmax(url, { livery, shadows = !lite } = {}) {
  const gltf = await loader.loadAsync(url);
  const bike = gltf.scene;
  bike.traverse(o => {
    if (o.userData?.optional_accessory) o.visible = false;
    if (!o.isMesh) return;
    o.castShadow = shadows; o.receiveShadow = shadows;
    o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
    for (const m of [].concat(o.material)) { m.envMapIntensity = 1; livery?.(m, o); }
  });
  const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
  bike.position.set(-c.x, -box.min.y, -c.z);
  const holder = new THREE.Group(); holder.add(bike);
  const nodes = {}, explodables = [];
  bike.traverse(o => { const ud = o.userData || {}; if (ud.part && !nodes[ud.part]) nodes[ud.part] = o; if (ud.explode) explodables.push({ node: o, base: o.position.clone(), vec: B2T(ud.explode) }); });
  [...explodables].sort((a, b) => a.vec.length() - b.vec.length()).forEach((x, i, a) => x.delay = i / a.length);
  const S = { holder, nodes, ex: 0, exT: 0, size: box.getSize(new THREE.Vector3()) };
  S.setExploded = on => { S.exT = on ? 1 : 0; };
  S.update = dt => {
    if (Math.abs(S.ex - S.exT) < .0005) return;
    S.ex += Math.sign(S.exT - S.ex) * Math.min(Math.abs(S.exT - S.ex), dt * (reduce ? 10 : 1.1));
    for (const x of explodables) { const u = clamp(S.ex * 1.35 - x.delay * .35, 0, 1), e = u * u * (3 - 2 * u); x.node.position.copy(x.base).addScaledVector(x.vec, e * 1.15); }
  };
  S.partOf = obj => { for (let o = obj; o; o = o.parent) if (o.userData?.part) return o.userData.part; return null; };
  S.meshes = []; bike.traverse(o => { if (o.isMesh) S.meshes.push(o); });
  return S;
}

// ---- Canyon links: the bike's own product page, and Canyon's site search for a part
export function canyonLocale(locales) {
  const lang = (navigator.language || 'en-DE').toLowerCase(), region = lang.split('-')[1];
  if (region && locales.includes(`en-${region}`)) return `en-${region}`;
  return 'en-de';
}
export const canyonSearch = (loc, q) => `https://www.canyon.com/${loc}/search?q=${encodeURIComponent(q)}`;

// ---- tiny synth for ambience (opt-in): each theme passes a recipe
export function ambience(recipe) {
  let ctx = null, gain = null;
  return {
    toggle(on) {
      if (on && !ctx) {
        ctx = new AudioContext(); gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
        const noise = (seconds = 4) => { const len = ctx.sampleRate * seconds, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.2; } const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s; };
        recipe(ctx, gain, noise);
      }
      if (ctx) { ctx.resume(); gain.gain.setTargetAtTime(on ? .22 : 0, ctx.currentTime, .6); }
    },
  };
}
