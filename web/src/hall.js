// hall.js — immersive 3D museum hall for the collection landing page.
// Six Speedmax generations on plinths under spotlights; walk the hall, focus a bike,
// read its wall plate, and enter the full exhibit. Works with mouse, touch and keyboard.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { coarse } from './detect.js';

const BIKES = window.__HALL || [];
const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PLINTH_GAP = 3.4;                    // metres between bike centres
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ------------------------------------------------------------------ renderer / scene
const canvas = $('#hall-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = !coarse;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0f14');
scene.fog = new THREE.Fog('#0b0f14', 9, 26);

const camera = new THREE.PerspectiveCamera(34, 1, .02, 80);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .05).texture;
scene.environmentIntensity = .32;

// ------------------------------------------------------------------ hall architecture
const hall = new THREE.Group(); scene.add(hall);
{
  const dark = new THREE.MeshStandardMaterial({ color: 0x10151b, roughness: .28, metalness: .18, envMapIntensity: .5 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PLINTH_GAP * (BIKES.length + 2), 30), dark);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -6; floor.receiveShadow = true; hall.add(floor);
  // faint polished reflection strip under the bikes
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(PLINTH_GAP * (BIKES.length + 2), 4.4),
    new THREE.MeshStandardMaterial({ color: 0x2c3a48, roughness: .12, metalness: .6, envMapIntensity: .9 }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.set(0, .002, .6); hall.add(sheen);
  // back wall + end walls
  const wall = new THREE.Mesh(new THREE.BoxGeometry(PLINTH_GAP * (BIKES.length + 2), 5.4, .2),
    new THREE.MeshStandardMaterial({ color: 0x0d1118, roughness: .85, envMapIntensity: .2 }));
  wall.position.set(0, 2.7, -4.2); hall.add(wall);
  const side = new THREE.BoxGeometry(.2, 5.4, 9);
  const e1 = new THREE.Mesh(side, wall.material); e1.position.set(-PLINTH_GAP * (BIKES.length + 1) / 2, 2.7, -1); hall.add(e1);
  const e2 = new THREE.Mesh(side, wall.material); e2.position.set(PLINTH_GAP * (BIKES.length + 1) / 2, 2.7, -1); hall.add(e2);
}

// spotlights: one warm pool per bike + soft ambience
const key = new THREE.DirectionalLight(0xfff1e0, 1.1); key.position.set(2, 6, 4);
if (!coarse) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 4, bottom: -4, near: 1, far: 18 }); key.shadow.bias = -.0005; }
scene.add(key);
scene.add(new THREE.HemisphereLight(0x9db4c8, 0x0a0d12, .5));

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const loaded = new Set();
const loadedBikes = new Map();  // index -> {group, spinM}

function place(i) { return (i - (BIKES.length - 1) / 2) * PLINTH_GAP; }

// plinths + name walls (always present, even before GLB arrives)
const plinths = BIKES.map((b, i) => {
  const g = new THREE.Group(); g.position.x = place(i);
  const stone = new THREE.MeshStandardMaterial({ color: 0x1a2029, roughness: .4, metalness: .3, envMapIntensity: .6 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.62, .68, .16, 64), stone);
  base.position.y = .08; base.receiveShadow = true; base.castShadow = true; g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.64, .008, 12, 96),
    new THREE.MeshBasicMaterial({ color: b.accent || 0xbde9d9 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .165; g.add(ring);
  // spotlight cone for this bike
  const spot = new THREE.SpotLight(0xfff4e2, 26, 7, .5, .55, 1.6);
  spot.position.set(0, 4.4, 1.15); spot.target.position.set(0, .4, 0);
  if (!coarse) { spot.castShadow = true; spot.shadow.mapSize.set(512, 512); spot.shadow.bias = -.0004; }
  g.add(spot, spot.target);
  hall.add(g);
  return g;
});

// ------------------------------------------------------------------ progressive GLB loading
async function loadBike(i) {
  if (loaded.has(i) || !BIKES[i]?.glb) return;
  loaded.add(i);
  try {
    const gltf = await loader.loadAsync(BIKES[i].glb);
    const root = gltf.scene;
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // normalise: centre on plinth, scale to 1.75 m display height
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const s = 1.0 / Math.max(size.x, size.y, .001) * 1.9;
    root.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(root);
    const c = box2.getCenter(new THREE.Vector3());
    root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box2.min.y;
    const holder = new THREE.Group(); holder.add(root); holder.position.y = .17;
    plinths[i].add(holder);
    loadedBikes.set(i, holder);
    if (i === focus) holder.visible = true; else holder.visible = Math.abs(place(i) - camX) < PLINTH_GAP * 2.2;
  } catch (e) { console.warn('hall: failed to load', BIKES[i]?.glb, e); }
}

// ------------------------------------------------------------------ camera choreography
let focus = 0, camX = 0, tw = null;
const camY = () => (coarse ? 1.15 : .95);
function camFor(i) {
  const x = place(i);
  const wide = innerWidth < innerHeight;
  return { x, pos: new THREE.Vector3(x + (coarse ? .4 : .85), camY() + .35, wide ? 3.3 : 2.9), tgt: new THREE.Vector3(x, camY(), 0) };
}
function goTo(i, instant) {
  focus = Math.max(0, Math.min(BIKES.length - 1, i));
  loadBike(focus);
  const v = camFor(focus);
  if (instant || reduced) { camera.position.copy(v.pos); controls.target.copy(v.tgt); camX = v.x; }
  else tw = { p0: camera.position.clone(), t0: controls.target.clone(), p1: v.pos, t1: v.tgt, t: 0 };
  const b = BIKES[focus];
  $('#plate')?.classList.add('on');
  $('#pl-eyebrow').textContent = b?.eyebrow || '';
  $('#pl-name').innerHTML = b ? `${esc(b.family)}<br><span>${esc(b.name)}</span>` : '';
  $('#pl-fact').textContent = b?.fact || '';
  $('#pl-meta').innerHTML = b ? [['Era', b.era], ['Weight', b.weight], ['Drivetrain', b.drivetrain], ['Wheels', b.wheels]]
    .filter(([, v]) => v).map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('') : '';
  const enter = $('#pl-enter');
  if (enter) { enter.hidden = !b?.viewer; if (b?.viewer) enter.href = b.viewer; }
  $('#hall-count').textContent = `${String(focus + 1).padStart(2, '0')} / ${String(BIKES.length).padStart(2, '0')}`;
  document.querySelectorAll('#hall .hall-nav button').forEach((btn, j) => btn.classList.toggle('active', j === focus));
}

// orbit while focused (limited, so the hall reading stays calm)
const controls = {
  target: new THREE.Vector3(), enabled: true,
  // minimal orbit state
  az: 0, azT: 0, el: 0, elT: 0,
};

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 46 : 34; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// pointer: drag orbits the focused bike; horizontal fling with 2 fingers / fast swipe changes bike
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.moved = Math.hypot(drag.x - e.clientX + (drag.x - drag.x), 0) || drag.moved; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
  controls.azT = Math.max(-.7, Math.min(.7, controls.azT - dx * .004));
  controls.elT = Math.max(-.35, Math.min(.5, controls.elT + dy * .003));
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', e => {
  if (drag && drag.moved < 7) {
    // tap: pick nearest bike by screen x
    const r = canvas.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width - .5);
    const per = 1 / Math.max(1, BIKES.length);
    const idx = Math.round(t / per + (BIKES.length - 1) / 2);
    goTo(Math.max(0, Math.min(BIKES.length - 1, idx)));
  } else if (drag && Math.abs(e.clientX - (drag.x0 ?? e.clientX)) > 0 && drag.moved > 90) {
    // big horizontal swipe: next/prev handled by momentum feel
  }
  drag = null;
});
canvas.addEventListener('pointercancel', () => drag = null);

// nav buttons
document.addEventListener('click', e => {
  const b = e.target.closest('#hall [data-hall-nav]');
  if (b) goTo(focus + (+b.dataset.hallNav));
  const j = e.target.closest('#hall .hall-nav button');
  if (j) goTo([...document.querySelectorAll('#hall .hall-nav button')].indexOf(j));
});
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight') goTo(focus + 1);
  if (e.key === 'ArrowLeft') goTo(focus - 1);
});

// wheel: step through the hall
canvas.addEventListener('wheel', e => {
  if (Math.abs(e.deltaY) < 8) return;
  e.preventDefault();
  if (e.deltaY > 0) goTo(focus + 1); else goTo(focus - 1);
}, { passive: false });

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let idle = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05);
  // tween
  if (tw) {
    tw.t += dt / 1.1; const k = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
    camera.position.lerpVectors(tw.p0, tw.p1, k);
    controls.target.lerpVectors(tw.t0, tw.t1, k);
    if (tw.t >= 1) tw = null;
  }
  camX += (place(focus) - camX) * (1 - Math.exp(-dt * 3));
  // orbit around target
  controls.az += (controls.azT - controls.az) * (1 - Math.exp(-dt * 6));
  controls.el += (controls.elT - controls.el) * (1 - Math.exp(-dt * 6));
  const v = camFor(focus);
  const cx = v.pos.x + Math.sin(controls.az) * 1.05;
  const cz = v.pos.z - (Math.cos(controls.az) - 1) * .8 + Math.sin(controls.el) * .6;
  const cy = v.pos.y + Math.sin(controls.el) * .8;
  camera.position.set(cx, cy, cz);
  camera.lookAt(controls.target);
  // lazy neighbours + gentle turntable for the focused bike
  for (const [i, holder] of loadedBikes) {
    const near = Math.abs(place(i) - camX) < PLINTH_GAP * 2.2;
    holder.visible = near;
    if (i === focus && !drag) holder.rotation.y += dt * .12 * (reduced ? 0 : 1);
  }
  idle += dt;
  renderer.render(scene, camera);
});

// kick off: focus the newest bike (CFR) or first
goTo(BIKES.length ? BIKES.findIndex(b => b.key === 'cfr') >= 0 ? BIKES.findIndex(b => b.key === 'cfr') : 0 : 0, true);
// preload neighbours shortly after
setTimeout(() => { loadBike(focus - 1); loadBike(focus + 1); }, 900);
window.__hall = { goTo, load: loadBike };