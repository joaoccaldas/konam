// norseman-training.js — FJORD TO SUMMIT · a Norseman training room (review room, ?reviewRoom=norseman-training).
//
// A training hall, not a race replica. An 8.4 m timber-and-concrete hall glazed on two sides: through the south glass,
// the real head of the Hardangerfjord at Eidfjord, where the swim ends; through the east glass, the real Gaustatoppen
// seen from the south, where the run ends. A 21 m cold lap pool runs along the fjord glass with its edge at the
// fjord's own waterline and a ferry ramp at its head. Down the middle, the course profile as a sculpted stone ridge
// rising to a summit against the mountain. Around it: the climbing trainer, the work stand, the incline treadmill
// facing the summit, the crew table and summit backpack, a week of training, the two finisher tops. A low dawn sun
// comes through the east glass and lays the mullions' shadows down the hall.
//
// Truth / rights: facts come from pitch/norseman-training/course-facts-v1.json (sourced). Terrain heights are real
// (tools/build_norseman_terrain.py; Norway terrain data © Kartverket, CC BY 4.0, via Terrain Tiles); the shading,
// trees, snow, sun, mist and ferry are KONA.m interpretation, and the two views are arranged around one room — their
// real distance apart is not shown. The profile's anchors are sourced, the line between them drawn. No official
// logo, mark or photography. Bikes are unbranded KONA.m atlas studies; treadmill and fan are the Beast Cave's.
//
// Efficiency: windows are one portal pass (engine/terrain-portal.js) shared by every pane; static architecture is
// merged per material; slats, trees and bikes are instanced; water and light animate on the GPU; one shadowed sun.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import facts from '../../pitch/norseman-training/course-facts-v1.json' with { type: 'json' };
import decor from '../../world/konam/rooms/norseman-training.decor.json' with { type: 'json' };
import { BROOM, BDOOR } from './beast-cave.js';
import { loadDecor } from './engine/decor.js';
import { localEnvCapture } from './engine/env-capture.js';
import { createTerrainPortal, terrainGeometry, terrainHeightAt, terrainMaterial, withAerial, aerialWater } from './engine/terrain-portal.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { motes, mistTex } from './roomkit.js';

export const NORSEMAN_MOOD = Object.freeze({ exposure: .96, hemi: .15, sun: .0, fog: { near: 30, far: 140 }, fogColor: new THREE.Color('#8f9aa5') });
export const NORSEMAN_TERRAIN = Object.freeze({ dir: 'assets/rooms/norseman-training/', sites: ['eidfjord', 'gaustatoppen'] });

const rng = (seed = 0x2E05E) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true, repeat) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };
const noise1 = (x, s = 0) => { const i = Math.floor(x), f = x - i, h = n => { const v = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); }; const u = f * f * (3 - 2 * f); return h(i) * (1 - u) + h(i + 1) * u; };
let rectLib = false;

// The profile as the room draws it. Anchor heights are sourced (facts.profile.anchors); the line between them is drawn.
const LEGS = {
  bike: { x0: 12.6, x1: 25.6, km: 180, pts: [[0, 0], [40, 1200], [58, 1080], [78, 1190], [100, 1040], [122, 1150], [142, 960], [160, 610], [180, 190]] },
  run: { x0: 26.6, x1: 33.3, km: 42.2, pts: [[0, 190], [25, 190], [31, 470], [37, 1010], [40, 1380], [41.5, 1800], [42.2, 1880]], back: 1.6 },
};
const SUMMIT_M = facts.facts.summit.value_m, VSCALE = 1.65 / SUMMIT_M, BASE = .10;    // 1,880 m → 1.65 m of stone
const yOf = m => BASE + m * VSCALE;
const xOf = (leg, km) => LEGS[leg].x0 + (LEGS[leg].x1 - LEGS[leg].x0) * km / LEGS[leg].km;
const heightAt = (leg, km) => { const p = LEGS[leg].pts; for (let i = 1; i < p.length; i++) if (km <= p[i][0]) { const [k0, m0] = p[i - 1], [k1, m1] = p[i]; return m0 + (m1 - m0) * (km - k0) / Math.max(1e-6, k1 - k0); } return p[p.length - 1][1]; };

// The two real views. Each viewpoint (lat/lon) is placed on a room point; map bearing `bearing` points out of its window.
const VIEWS = {
  eidfjord: { lat: 60.4660, lon: 7.0625, view: { x: 19.6, z: -11.0, y0: -.12, e0: 0, k: .1, bearing: 272, fwd: [0, -1], right: [-1, 0] }, snowline: 1450, treeline: 780, alpen: [800, 1500] },
  gaustatoppen: { lat: 59.8426, lon: 8.61018, view: { x: 21.0, z: -9.4, y0: -.3, e0: null, k: .1, bearing: 60, fwd: [1, 0], right: [0, 1] }, snowline: 1700, treeline: 1080, alpen: [1250, 1850] },
};

export function buildNorsemanTraining(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);        // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2, H = 8.4;
  const SZ = -12.0;                                                     // the ridge's centre line
  const SOUTH = { x0: 8.3, x1: 30.4 }, EAST = { z0: -14.2, z1: -4.6 }, POOL = { x0: 9.1, x1: 30.2, z0: R.z1 + .04, z1: -15.3, y: -.12 };
  const SUN = new THREE.Vector3(1, .14, .42).normalize();              // toward the sun: very low, straight through the east glass
  const rand = rng();
  const infos = [], info = (mesh, rec) => { for (const m of [].concat(mesh)) { m.userData.info = rec; pickables.push(m); } infos.push(rec); return rec; };
  const envMats = [], E = m => { envMats.push(m); return m; };
  const F = facts.facts, srcName = k => ({ wikipedia: 'Wikipedia', 'slowtwitch-2025': 'Slowtwitch', 'nxtri-2024': 'nxtri.com' })[k] || k;
  const fact = k => ({ cls: 'P', text: `${F[k].line} (${F[k].sources.map(srcName).join(', ')})` });

  // ------------------------------------------------------------ static geometry, merged per material at the end
  const buckets = new Map(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), EU = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const put = (mat, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(M4.compose(V.set(x, y, z), Q.setFromEuler(EU.set(rx, ry, rz)), S.set(sx, sy, sz)));
    (buckets.get(mat) || buckets.set(mat, []).get(mat)).push(g);
  };
  const box = (mat, w, h, d, x, y, z, ry = 0) => put(mat, new THREE.BoxGeometry(w, h, d), x, y, z, 0, ry);
  const flush = (cast = false) => { for (const [mat, list] of buckets) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast && !lite; m.receiveShadow = true; group.add(m); } buckets.clear(); };

  // ------------------------------------------------------------ materials
  const concreteC = canvas(1024, 1024, (g, w, h) => { g.fillStyle = '#8f8c87'; g.fillRect(0, 0, w, h); const r = rng(5);
    for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, rr = 60 + r() * 220, gr = g.createRadialGradient(x, y, 4, x, y, rr), v = r() < .5 ? 0 : 255; gr.addColorStop(0, `rgba(${v},${v},${v},${.03 + r() * .05})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    for (let i = 0; i < 26000; i++) { const v = 90 + r() * 90; g.fillStyle = `rgba(${v},${v - 3},${v - 7},${.12 + r() * .25})`; const s = .6 + r() * 1.8; g.fillRect(r() * w, r() * h, s, s); }
    g.strokeStyle = 'rgba(40,38,36,.55)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3); });
  const concreteR = canvas(512, 512, (g, w, h) => { g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, w, h); const r = rng(9);
    for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h; g.strokeStyle = `rgba(30,30,30,${.15 + r() * .2})`; g.lineWidth = 6 + r() * 20; g.beginPath(); g.arc(x, y, 30 + r() * 90, r() * 6, r() * 6 + 1.5); g.stroke(); } });
  const FT = 3.0;
  const floorMat = E(new THREE.MeshPhysicalMaterial({ map: tex(concreteC, true, [1, 1]), roughnessMap: tex(concreteR, false, [1, 1]), color: '#b8b4ad', roughness: .5, metalness: 0, clearcoat: .6, clearcoatRoughness: .12, envMapIntensity: .8 }));
  const boardC = canvas(1024, 1024, (g, w, h) => { g.drawImage(concreteC, 0, 0); const r = rng(13);       // board-formed: 15 cm planks, grain, tie holes
    for (let y = 0; y < h; y += 64) { const v = r() * 18 - 9; g.fillStyle = `rgba(${120 + v},${116 + v},${110 + v},.18)`; g.fillRect(0, y, w, 64); g.fillStyle = 'rgba(30,28,26,.35)'; g.fillRect(0, y, w, 2);
      for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(40,36,32,${.04 + r() * .06})`; g.lineWidth = 1; const yy = y + 4 + r() * 56; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(w * .3, yy + (r() - .5) * 6, w * .7, yy + (r() - .5) * 6, w, yy); g.stroke(); } }
    for (const [x, y] of [[128, 192], [640, 192], [128, 704], [640, 704]]) { const gr = g.createRadialGradient(x, y, 2, x, y, 14); gr.addColorStop(0, 'rgba(20,18,16,.85)'); gr.addColorStop(1, 'rgba(20,18,16,0)'); g.fillStyle = gr; g.fillRect(x - 14, y - 14, 28, 28); } });
  const boardBump = tex(boardC, false, [RW / 3.2, H / 3.2]);
  const wallConcrete = new THREE.MeshStandardMaterial({ map: tex(boardC, true, [RW / 3.2, H / 3.2]), bumpMap: boardBump, bumpScale: 1.2, color: '#7e7a73', roughness: .9, envMapIntensity: .25 });
  const grainC = (base, seed) => canvas(256, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < 90; i++) { const x = r() * w; g.strokeStyle = `rgba(${r() < .5 ? '40,24,12' : '255,230,200'},${.04 + r() * .08})`; g.lineWidth = .6 + r() * 2.2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * .01 + i) * 5, y); g.stroke(); } });
  const oak = E(new THREE.MeshStandardMaterial({ map: tex(grainC('#8a6544', 21), true, [1, 1]), color: '#ffffff', roughness: .62, metalness: 0, envMapIntensity: .4 }));
  const glulamC = canvas(512, 256, (g, w, h) => { g.fillStyle = '#b48d62'; g.fillRect(0, 0, w, h); const r = rng(23);
    for (let y = 0; y < h; y += 21) { g.fillStyle = `rgba(70,40,15,${.18 + r() * .12})`; g.fillRect(0, y, w, 1.6); }
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(90,55,25,${.05 + r() * .08})`; g.lineWidth = 1; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + (r() - .5) * 8, w * .7, y + (r() - .5) * 8, w, y + (r() - .5) * 4); g.stroke(); } });
  const glulam = E(new THREE.MeshStandardMaterial({ map: tex(glulamC, true, [4, 1]), color: '#ffffff', roughness: .58, envMapIntensity: .35 }));
  const ceilingC = canvas(512, 512, (g, w, h) => { g.fillStyle = '#7b5c3c'; g.fillRect(0, 0, w, h); const r = rng(29); for (let x = 0; x < w; x += 32) { const v = r() * 30 - 15; g.fillStyle = `rgb(${123 + v},${92 + v},${60 + v})`; g.fillRect(x + 1, 0, 29, h); g.fillStyle = 'rgba(20,10,4,.75)'; g.fillRect(x + 30, 0, 2, h); } });
  const ceilMat = new THREE.MeshStandardMaterial({ map: tex(ceilingC, true, [RW / 4, RD / 4]), color: '#cfc2b2', roughness: .7 });
  const steel = E(new THREE.MeshStandardMaterial({ color: '#1a1d21', roughness: .36, metalness: .85 }));
  const brushed = E(new THREE.MeshStandardMaterial({ color: '#a9b0b7', roughness: .28, metalness: 1 }));
  const ledCold = new THREE.MeshBasicMaterial({ color: '#e6efff', toneMapped: false });
  const ledWarm = new THREE.MeshBasicMaterial({ color: '#ffc58a', toneMapped: false });
  const hazard = new THREE.MeshBasicMaterial({ map: tex(canvas(256, 32, (g, w, h) => { g.fillStyle = '#e8b21c'; g.fillRect(0, 0, w, h); g.fillStyle = '#121212'; for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); } }), true, [4, 1]) });
  const neoprene = new THREE.MeshPhysicalMaterial({ color: '#16181b', roughness: .62, sheen: .5, sheenRoughness: .6, sheenColor: new THREE.Color('#4a5560'), clearcoat: .15 });
  const graniteC = canvas(256, 256, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); const r = rng(11); for (let i = 0; i < 1800; i++) { const v = r() * 255; g.fillStyle = `rgba(${v},${v},${v},.45)`; g.beginPath(); g.arc(r() * w, r() * h, .6 + r() * 2.2, 0, 7); g.fill(); } });
  const graniteBump = tex(graniteC, false); graniteBump.wrapS = graniteBump.wrapT = THREE.RepeatWrapping;
  const granite = E(new THREE.MeshStandardMaterial({ color: '#4a4d51', roughness: .82, bumpMap: graniteBump, bumpScale: 1.6, envMapIntensity: .4 }));
  const rock = (s, flat = .65, seed = rand()) => { const g = new THREE.IcosahedronGeometry(s, lite ? 1 : 2), p = g.attributes.position, n = new THREE.Vector3();
    const f = (x, y, z) => Math.sin(x * 7.1 + seed * 9) * Math.sin(y * 6.3 + seed * 5) * Math.sin(z * 5.7 + seed * 3) * .5 + Math.sin(x * 15 + y * 13 + seed * 20) * .12;
    for (let k = 0; k < p.count; k++) { n.set(p.getX(k), p.getY(k), p.getZ(k)).normalize(); const d = 1 + f(n.x, n.y, n.z) * .3; p.setXYZ(k, n.x * s * d * 1.15, n.y * s * d * flat, n.z * s * d); }
    g.computeVertexNormals(); return g; };

  // ------------------------------------------------------------ floor: polished concrete in 3 m bays, cut around the pool
  const floorGeos = [];
  const floorPiece = (x0, x1, z0, z1) => { const g = new THREE.PlaneGeometry(x1 - x0, z0 - z1); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - R.x0) / FT, (p.getZ(i) - R.z1) / FT); floorGeos.push(g); };
  floorPiece(R.x0, R.x1, R.z0, POOL.z1); floorPiece(R.x0, POOL.x0, POOL.z1, R.z1); floorPiece(POOL.x1, R.x1, POOL.z1, R.z1);
  floorMat.map.wrapS = floorMat.map.wrapT = floorMat.roughnessMap.wrapS = floorMat.roughnessMap.wrapT = THREE.RepeatWrapping;
  const floor = new THREE.Mesh(mergeGeometries(floorGeos), floorMat); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);
  box(new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: .9 }), RW, .1, RD, CX, -1.7, CZ);   // a floor under the floor, for the pool basin

  // ------------------------------------------------------------ shell: concrete, an oak slat north wall, glulam roof
  const slab = (mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = !lite; m.receiveShadow = true; group.add(m); return m; };
  slab(wallConcrete, RW + .6, H, .3, CX, H / 2, R.z0 + .15);                                    // north
  slab(wallConcrete, .3, H, BDOOR.z0 - R.z1, R.x0 + .15, H / 2, (R.z1 + BDOOR.z0) / 2);            // west: solid around the door from the hall
  slab(wallConcrete, .3, H, R.z0 - BDOOR.z1, R.x0 + .15, H / 2, (BDOOR.z1 + R.z0) / 2);
  slab(wallConcrete, .3, H - BDOOR.h, BDOOR.z1 - BDOOR.z0, R.x0 + .15, BDOOR.h + (H - BDOOR.h) / 2, (BDOOR.z0 + BDOOR.z1) / 2);
  slab(wallConcrete, SOUTH.x0 - R.x0, H, .3, (R.x0 + SOUTH.x0) / 2, H / 2, R.z1 - .15);           // south piers and header
  slab(wallConcrete, R.x1 - SOUTH.x1 + .3, H, .3, (SOUTH.x1 + R.x1 + .3) / 2, H / 2, R.z1 - .15);
  slab(wallConcrete, SOUTH.x1 - SOUTH.x0, .7, .3, (SOUTH.x0 + SOUTH.x1) / 2, H - .35, R.z1 - .15);
  slab(wallConcrete, .3, H, EAST.z0 - R.z1, R.x1 + .15, H / 2, (R.z1 + EAST.z0) / 2);             // east piers and header
  slab(wallConcrete, .3, H, R.z0 - EAST.z1, R.x1 + .15, H / 2, (EAST.z1 + R.z0) / 2);
  slab(wallConcrete, .3, .7, EAST.z1 - EAST.z0, R.x1 + .15, H - .35, (EAST.z0 + EAST.z1) / 2);
  const SKY = { x0: 12.4, x1: 32.8, z0: -11.4, z1: -12.6 };
  for (const [w, d, x, z] of [[RW, R.z0 - SKY.z0, CX, (R.z0 + SKY.z0) / 2], [RW, SKY.z1 - R.z1, CX, (SKY.z1 + R.z1) / 2], [SKY.x0 - R.x0, SKY.z0 - SKY.z1, (R.x0 + SKY.x0) / 2, SZ], [R.x1 - SKY.x1, SKY.z0 - SKY.z1, (SKY.x1 + R.x1) / 2, SZ]])
    slab(ceilMat, w, .2, d, x, H + .1, z);
  // glulam beams across the hall every 3.2 m, a light line under each; the skylight runs between them over the ridge
  for (let x = 9.4; x < R.x1 - .5; x += 3.2) { box(glulam, .18, .48, RD, x, H - .24, CZ); box(ledWarm, .035, .015, RD - 1.2, x, H - .485, CZ); }
  box(glulam, RW, .5, .2, CX, H - .25, SKY.z0 + .1); box(glulam, RW, .5, .2, CX, H - .25, SKY.z1 - .1);
  // north wall: vertical oak slats, full height, open where the wall carries kit
  const OPEN = [[9.2, 13.0, 0, 3.6], [19.0, 23.2, 1.4, 3.9], [23.5, 26.3, 0, 3.2], [30.8, 33.9, .4, 3.3]];
  const slatAt = []; for (let x = R.x0 + .5; x < R.x1 - .45; x += .13) { const gap = OPEN.find(([a, b]) => x > a && x < b); slatAt.push([x, gap ? gap[3] : 0, H - .8]); }
  const slat = new THREE.InstancedMesh(new THREE.BoxGeometry(.055, 1, .06), oak, slatAt.length);
  slatAt.forEach(([x, y0, y1], k) => { M4.compose(V.set(x, (y0 + y1) / 2, R.z0 - .06), Q.identity(), S.set(1, y1 - y0, 1)); slat.setMatrixAt(k, M4); });
  slat.castShadow = !lite; slat.receiveShadow = true; group.add(slat);
  box(new THREE.MeshStandardMaterial({ color: '#141516', roughness: .9 }), RW, H - .8, .02, CX, (H - .8) / 2, R.z0 - .02);

  // ------------------------------------------------------------ the windows: portal panes onto real terrain, timber mullions
  const portal = createTerrainPortal({ renderer, lite });
  const southPane = portal.windowMaterial({ top: '#9db3cc', mid: '#3d4a52', bottom: '#11232c' });
  const eastPane = portal.windowMaterial({ top: '#c8b39c', mid: '#4b5560', bottom: '#2b2f2a' });
  const skyPane = portal.windowMaterial({ top: '#7f9cbf', mid: '#7f9cbf', bottom: '#9fb6cf' });
  const pane = (pm, w, h, x, y, z, rx, ry) => { const m = pm.attach(new THREE.Mesh(new THREE.PlaneGeometry(w, h), pm.material)); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); group.add(m); return m; };
  const southWin = pane(southPane, SOUTH.x1 - SOUTH.x0, H - .7 - POOL.y, (SOUTH.x0 + SOUTH.x1) / 2, (H - .7 + POOL.y) / 2, R.z1 + .01, 0, 0);
  const eastWin = pane(eastPane, EAST.z1 - EAST.z0, H - .7, R.x1 - .01, (H - .7) / 2, (EAST.z0 + EAST.z1) / 2, 0, -Math.PI / 2);
  pane(skyPane, SKY.x1 - SKY.x0, SKY.z0 - SKY.z1, (SKY.x0 + SKY.x1) / 2, H + .005, SZ, Math.PI / 2, 0);
  // a whisper of glass in front of each pane: interior reflections, nothing more
  const glass = E(new THREE.MeshPhysicalMaterial({ color: '#e8f0f4', roughness: .04, metalness: 0, transparent: true, opacity: .035, envMapIntensity: .5, depthWrite: false }));
  if (!lite) { put(glass, new THREE.PlaneGeometry(SOUTH.x1 - SOUTH.x0, H - .7), (SOUTH.x0 + SOUTH.x1) / 2, (H - .7) / 2, R.z1 + .06);
    put(glass, new THREE.PlaneGeometry(EAST.z1 - EAST.z0, H - .7), R.x1 - .06, (H - .7) / 2, (EAST.z0 + EAST.z1) / 2, 0, -Math.PI / 2, 0); }
  for (let i = 0, n = 4; i <= n; i++) { const x = SOUTH.x0 + (SOUTH.x1 - SOUTH.x0) * i / n; box(glulam, .085, H - .7 - POOL.y, .18, x, (H - .7 + POOL.y) / 2, R.z1 + .1); }
  for (let i = 0, n = 2; i <= n; i++) { const z = EAST.z0 + (EAST.z1 - EAST.z0) * i / n; box(glulam, .18, H - .7, .085, R.x1 - .1, (H - .7) / 2, z); }
  box(steel, SOUTH.x1 - SOUTH.x0, .06, .3, (SOUTH.x0 + SOUTH.x1) / 2, H - .73, R.z1 + .1); box(steel, .3, .06, EAST.z1 - EAST.z0, R.x1 - .1, H - .73, (EAST.z0 + EAST.z1) / 2);
  box(steel, .3, .06, EAST.z1 - EAST.z0, R.x1 - .1, .03, (EAST.z0 + EAST.z1) / 2);
  info([southWin, eastWin], { model: act => windowCard(act), eyebrow: 'THE WINDOWS', title: 'Two real places, one room.', sub: 'Eidfjord to the south · Gaustatoppen to the east', text: 'Real terrain heights, shaded in code.' });
  obstacles.push({ box: [R.x1 - .7, R.x1 + .5, R.z1 - .5, R.z0 + .5] });

  // ------------------------------------------------------------ SWIM: a cold lap pool along the fjord glass, its edge at the fjord's waterline
  const P = POOL, PL = P.x1 - P.x0, PW = P.z1 - P.z0, PX = (P.x0 + P.x1) / 2, PZ = (P.z0 + P.z1) / 2;
  const tileC = canvas(512, 512, (g, w, h) => { g.fillStyle = '#0e1a20'; g.fillRect(0, 0, w, h); const r = rng(33); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { const v = r() * 10; g.fillStyle = `rgb(${24 + v},${44 + v},${52 + v})`; g.fillRect(x + 2, y + 2, 28, 28); } });
  const tiles = new THREE.MeshStandardMaterial({ map: tex(tileC, true, [PL / 1.2, 1.4 / 1.2]), roughness: .35 });
  const caust = { t: { value: 0 } };
  const basinFloor = new THREE.MeshStandardMaterial({ map: tex(tileC, true, [PL / 1.2, PW / 1.2]), roughness: .4 });
  basinFloor.onBeforeCompile = sh => { sh.uniforms.uT = caust.t;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWc;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWc = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWc; uniform float uT;').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec2 p = vWc.xz * 2.2; float c = 0.; for (int i = 0; i < 3; i++) { p += vec2(sin(p.y * 1.7 + uT * .9), cos(p.x * 1.3 - uT * .7)) * .35; c += abs(sin(p.x) * sin(p.y)); }
        float lane = smoothstep(.12, .1, abs(vWc.z - ${PZ.toFixed(2)})) * (1. - step(${(P.x1 - 1.5).toFixed(2)}, vWc.x)) * step(${(P.x0 + 1.5).toFixed(2)}, vWc.x);
        totalEmissiveRadiance += vec3(.55, .8, .9) * pow(c / 3., 3.) * .5; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.02), lane); }`); };
  put(basinFloor, new THREE.PlaneGeometry(PL, PW), PX, -1.5, PZ, -Math.PI / 2, 0, 0);
  for (const [w, x, z, ry] of [[PL, PX, P.z1, Math.PI], [PW, P.x0, PZ, Math.PI / 2], [PW, P.x1, PZ, -Math.PI / 2]]) put(tiles, new THREE.PlaneGeometry(w, 1.4), x, -.8, z, 0, ry, 0);
  const waterN = canvas(256, 256, (g, w, h) => { const im = g.createImageData(w, h), r = rng(37), hs = new Float32Array(w * h);
    for (let k = 0; k < 7; k++) { const fx = 1 + Math.floor(r() * 6), fy = 1 + Math.floor(r() * 6), ph = r() * 6; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) hs[y * w + x] += Math.sin((x * fx + y * fy) / w * Math.PI * 2 + ph) / (k + 1); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, dx = hs[y * w + (x + 1) % w] - hs[i], dy = hs[((y + 1) % h) * w + x] - hs[i]; im.data[i * 4] = 128 - dx * 90; im.data[i * 4 + 1] = 128 - dy * 90; im.data[i * 4 + 2] = 255; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); });
  const nTex = tex(waterN, false, [PL / 3, PW / 3]), nTex2 = tex(waterN, false, [PL / 1.7, PW / 1.7]);
  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(PL, PW), E(new THREE.MeshPhysicalMaterial({ color: '#1d4a55', roughness: .03, metalness: 0, transparent: true, opacity: .74, normalMap: nTex, normalScale: new THREE.Vector2(.18, .18), clearcoat: 1, clearcoatNormalMap: nTex2, clearcoatNormalScale: new THREE.Vector2(.1, .1), envMapIntensity: 1.4, depthWrite: false })));
  poolWater.rotation.x = -Math.PI / 2; poolWater.position.set(PX, P.y, PZ); poolWater.renderOrder = 2; group.add(poolWater);
  put(granite, new RoundedBoxGeometry(PL + .6, .1, .36, 2, .03), PX, -.04, P.z1 - .18);                    // coping on the room side
  for (const x of [P.x0 - .18, P.x1 + .18]) put(granite, new RoundedBoxGeometry(.36, .1, PW, 2, .03), x, -.04, PZ);
  box(ledCold, PL, .015, .02, PX, -.1, P.z1 - .01);                                                          // a light line under the coping lip
  info(poolWater, { model: act => swimCard(act), eyebrow: 'SWIM · THE COLD', title: 'Swim into the fjord.', sub: 'A 21 m cold lap pool · interpretation', text: 'Race-day water has been about 13–17 °C.' });
  obstacles.push({ box: [P.x0 - .4, P.x1 + .4, R.z1 - .5, P.z1 - .05] });
  // the ferry ramp at the head of the pool: a steel plate over the water, hazard edge, rails
  { const x = P.x0 + .55; put(steel, new THREE.BoxGeometry(1.1, .06, PW - .1), x, .14, PZ, 0, 0, -.12); put(hazard, new THREE.BoxGeometry(.06, .062, PW - .1), x + .55, .075, PZ, 0, 0, -.12);
    for (const s of [-1, 1]) { put(brushed, new THREE.CylinderGeometry(.022, .022, 1.0, 10), x - .4, .65, PZ + s * (PW / 2 - .12)); put(brushed, new THREE.CylinderGeometry(.02, .02, .9, 10), x, 1.12, PZ + s * (PW / 2 - .12), 0, 0, Math.PI / 2); }
    const jump = lettering(1.6, .4, g => { g.fillStyle = 'rgba(236,240,245,.85)'; g.font = `700 .16px ${FONT}`; g.letterSpacing = '.03px'; g.fillText('THE JUMP', .05, .2); g.letterSpacing = '0px'; g.fillStyle = 'rgba(236,240,245,.5)'; g.font = `500 .07px ${FONT}`; g.fillText('3.8 KM TO EIDFJORD', .05, .32); }, 1024);
    jump.rotation.x = -Math.PI / 2; jump.position.set(P.x0 + .3, .012, P.z1 - .75); group.add(jump);
    info(jump, { model: act => swimCard(act), eyebrow: 'SWIM · THE START', title: 'It starts with a jump.', sub: 'From a car ferry into the Hardangerfjord', text: 'The ramp is set dressing; the jump is a sourced fact.' }); }
  // water temperature post at the ramp
  { const x = P.x0 + 1.6, z = P.z1 - .55, c = canvas(256, 768, (g, w, h) => { g.fillStyle = '#0e1217'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(230,236,244,.9)'; g.font = `700 30px ${FONT}`; g.fillText('WATER', 28, 56); g.font = `500 20px ${FONT}`; g.fillStyle = 'rgba(230,236,244,.6)'; g.fillText('RACE DAY, RECENT YEARS', 28, 86);
      const Y = c => 700 - (c - 5) / 20 * 560; g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(110, Y(25), 36, Y(5) - Y(25));
      g.fillStyle = '#6fb2cc'; g.fillRect(110, Y(17), 36, Y(13) - Y(17)); g.fillStyle = 'rgba(230,236,244,.85)'; g.font = `600 22px ${FONT}`;
      for (let k = 5; k <= 25; k += 5) { g.fillRect(150, Y(k) - 1, 18, 2); g.fillText(`${k}°`, 176, Y(k) + 8); }
      g.font = `800 40px ${FONT}`; g.fillStyle = '#9fd3ea'; g.fillText('13–17 °C', 28, 740); });
    box(steel, .05, 1.5, .05, x, .75, z); const p = new THREE.Mesh(new THREE.PlaneGeometry(.32, .96), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false })); p.position.set(x, 1.15, z + .03); group.add(p);
    info(p, { model: act => swimCard(act), eyebrow: 'SWIM · WATER', title: '55–62 °F on race day.', sub: 'About 13–17 °C in recent years (Slowtwitch)', text: 'A sourced range, not a forecast.' }); }
  // a long oak bench along the pool, towels folded on it
  box(oak, 5.2, .08, .48, 16.0, .44, -14.55); for (const x of [13.8, 18.2]) box(steel, .06, .42, .4, x, .21, -14.55);
  const towelMat = new THREE.MeshPhysicalMaterial({ color: '#e9e6df', roughness: 1, sheen: 1, sheenRoughness: .8, sheenColor: new THREE.Color('#ffffff') });
  for (let i = 0; i < 3; i++) put(towelMat, new RoundedBoxGeometry(.42, .07, .34, 3, .03), 14.6 + i * .55, .52 + (i === 1 ? .06 : 0), -14.55, 0, (i - 1) * .1, 0);
  obstacles.push({ box: [13.3, 18.7, -14.85, -14.25] });

  // ------------------------------------------------------------ the ridge: the course profile as a stacked contour model
  // One slate slab per 100 m of height, each cut to where the profile stands above its top; an oak slab every 500 m to
  // read by; slabs narrow as they rise. A light line traces the true profile just above the steps.
  const strata = { t: { value: 0 } };
  const slate = E(new THREE.MeshStandardMaterial({ color: '#2f3236', roughness: .62, metalness: .05, bumpMap: graniteBump, bumpScale: .8, envMapIntensity: .6 }));
  const slateLight = E(new THREE.MeshStandardMaterial({ color: '#3f4348', roughness: .66, metalness: .05, bumpMap: graniteBump, bumpScale: .8, envMapIntensity: .6 }));
  const elevAt = (leg, x) => { const L = LEGS[leg]; if (x <= L.x1) return heightAt(leg, Math.max(0, (x - L.x0) / (L.x1 - L.x0) * L.km)); const u = Math.min(1, (x - L.x1) / L.back); return heightAt(leg, L.km) * (1 - Math.pow(u, 2.2)); };
  const crests = [], STEP = .02, LAYER = 100, T = LAYER * VSCALE;
  for (const leg of ['bike', 'run']) {
    const L = LEGS[leg], x1 = L.x1 + (L.back || 0), crest = [];
    for (let x = L.x0; x <= x1 + 1e-6; x += STEP * 4) crest.push(new THREE.Vector3(x, yOf(elevAt(leg, x)) + .012, SZ));
    crests.push(crest);
    for (let k = 0; k * LAYER < SUMMIT_M; k++) {
      const top = (k + 1) * LAYER, depth = .82 - k * .024, mat = (k + 1) % 5 === 0 ? oak : k % 2 ? slate : slateLight;
      let start = null;
      for (let x = L.x0; x <= x1 + STEP; x += STEP) {
        const on = x <= x1 && elevAt(leg, x) >= top;
        if (on && start === null) start = x;
        if (!on && start !== null) { const len = x - start; if (len > .03) put(mat, new RoundedBoxGeometry(len, T - .004, depth, 1, .006), start + len / 2, BASE + k * T + T / 2, SZ); start = null; }
      }
    }
    put(oak, new RoundedBoxGeometry(x1 - L.x0 + .1, BASE, .90, 1, .01), (L.x0 + x1) / 2, BASE / 2, SZ);   // oak plinth
    const pick = new THREE.Mesh(new THREE.BoxGeometry(x1 - L.x0, 1.6, 1.5), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); pick.position.set((L.x0 + x1) / 2, .8, SZ); group.add(pick);
    info(pick, { model: act => profileCard(leg, act), eyebrow: leg === 'bike' ? 'THE PROFILE · BIKE' : 'THE PROFILE · RUN', title: leg === 'bike' ? '180 km over the plateau.' : '42.2 km, then up.', sub: 'Anchors sourced · line between them interpreted', text: 'One slab per 100 m of height.' });
    obstacles.push({ box: [L.x0 - .15, x1 + .15, SZ - .85, SZ + .85] });
  }
  // a light line under the plinth lip, so the model floats a little
  box(ledWarm, LEGS.run.x1 + LEGS.run.back - LEGS.bike.x0, .01, .01, (LEGS.bike.x0 + LEGS.run.x1 + LEGS.run.back) / 2, .012, SZ + .455);
  // the light line along the crest: cold over the bike, warm over the run, a pulse that travels to the summit
  const lineMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: strata.t },
    vertexShader: 'varying float vX;void main(){vX=(modelMatrix*vec4(position,1.)).x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float t;varying float vX;void main(){float u=(vX-${LEGS.bike.x0.toFixed(1)})/${(LEGS.run.x1 - LEGS.bike.x0).toFixed(1)};
      vec3 c=mix(vec3(.75,.88,1.),vec3(1.,.66,.32),smoothstep(.55,.66,u));float pulse=exp(-pow((fract(t/14.)*1.15-u)*30.,2.));
      gl_FragColor=vec4(c*(.5+pulse*2.2),1.);}` });
  crests.forEach(c => { const pts = c.filter(p => p.x <= LEGS.run.x1 + .01); group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal', .1), pts.length, .011, 6, false), lineMat)); });
  // anchor pins and labels (anchors only; the line between is drawn)
  facts.profile.anchors.filter(a => a.leg !== 'swim').forEach(a => {
    const x = xOf(a.leg, a.km), top = yOf(heightAt(a.leg, a.km));
    put(brushed, new THREE.CylinderGeometry(.008, .008, .55, 6), x, top + .27, SZ); put(ledWarm, new THREE.SphereGeometry(.024, 10, 8), x, top + .55, SZ);
    for (const s of lite ? [1] : [-1, 1]) { const lab = lettering(1.5, .3, g => { g.fillStyle = 'rgba(236,240,245,.92)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.012px'; g.fillText(a.label, .02, .13);
        g.fillStyle = 'rgba(236,240,245,.5)'; g.font = `500 .052px ${FONT}`; g.fillText(`${a.leg.toUpperCase()} · KM ${a.km}`, .02, .22); }, 1024);
      lab.rotation.y = s > 0 ? 0 : Math.PI; lab.position.set(x + s * .75, top + .68, SZ + s * .02); group.add(lab); }
  });
  for (const [leg, text] of [['bike', 'BIKE · 180 KM'], ['run', 'RUN · 42.2 KM']]) { const L = LEGS[leg];
    for (const s of lite ? [1] : [-1, 1]) { const t = lettering(2.4, .2, g => { g.fillStyle = 'rgba(232,238,245,.75)'; g.font = `700 .1px ${FONT}`; g.letterSpacing = '.03px'; g.fillText(text, .02, .14); }, 1024);
      t.rotation.x = -Math.PI / 2; t.rotation.z = s > 0 ? 0 : Math.PI; t.position.set(L.x0 + 1.4, .052, SZ + s * .95); group.add(t); } }
  { const top = yOf(SUMMIT_M), sx = LEGS.run.x1;                         // a small cairn on the summit
    for (let i = 0; i < 6; i++) { const s = .065 - i * .007; put(granite, rock(s, .6), sx + (rand() - .5) * .04, top + .02 + i * .055, SZ + (rand() - .5) * .04, 0, rand() * 6); } }
  { const t = lettering(.9, .4, g => { g.textAlign = 'center'; g.fillStyle = 'rgba(232,238,245,.8)'; g.font = `700 .18px ${FONT}`; g.fillText('T2', .45, .26); }, 512);
    t.rotation.x = -Math.PI / 2; t.position.set((LEGS.bike.x1 + LEGS.run.x0) / 2, .055, SZ); group.add(t); }

  // ------------------------------------------------------------ SWIM kit on the north wall: wetsuit, caps, socks, gloves (unbranded studies)
  const suitShape = (sleeve = 1, legs = true) => { const s = new THREE.Shape(); s.moveTo(-.12, .74); s.lineTo(-.3, .66); s.lineTo(-.3 - .1 * sleeve, .38 - .5 * (sleeve - 1)); s.lineTo(-.22 - .08 * sleeve, .34 - .5 * (sleeve - 1)); s.lineTo(-.24, .5); s.lineTo(-.2, 0);
    if (legs) { s.lineTo(-.24, -.9); s.lineTo(-.06, -.9); s.lineTo(0, -.12); s.lineTo(.06, -.9); s.lineTo(.24, -.9); } else { s.quadraticCurveTo(0, -.03, .2, 0); }
    s.lineTo(.2, 0); s.lineTo(.24, .5); s.lineTo(.22 + .08 * sleeve, .34 - .5 * (sleeve - 1)); s.lineTo(.3 + .1 * sleeve, .38 - .5 * (sleeve - 1)); s.lineTo(.3, .66); s.lineTo(.12, .74); s.quadraticCurveTo(0, .64, -.12, .74); return s; };
  const garment = (shape, mat, x, y, z, ry = Math.PI) => { const g = new THREE.ExtrudeGeometry(shape, { depth: .04, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 3, curveSegments: 8 });
    const m = new THREE.Mesh(g, mat); m.rotation.y = ry; m.position.set(x, y, z); m.castShadow = !lite; group.add(m); return m; };
  const rackX = 11.1, rackZ = R.z0 - .14;
  box(brushed, 3.4, .03, .03, rackX, 3.0, rackZ - .1);
  const wetsuit = garment(suitShape(2.2, true), neoprene, rackX - .9, 2.2, rackZ - .14);
  put(brushed, new THREE.TorusGeometry(.14, .008, 6, 24, Math.PI), rackX - .9, 2.98, rackZ - .12);
  put(neoprene, new THREE.SphereGeometry(.12, 20, 12, 0, 6.28, 0, 1.6), rackX + .2, 2.45, rackZ - .16, -Math.PI / 2, 0, 0, 1, 1, .8);
  put(neoprene, new THREE.SphereGeometry(.105, 20, 12, 0, 6.28, 0, 1.6), rackX + .2, 2.1, rackZ - .16, -Math.PI / 2, 0, 0, 1, 1, .8);
  for (const s of [-1, 1]) { put(neoprene, new RoundedBoxGeometry(.1, .26, .14, 3, .04), rackX + .8 + s * .08, 2.3, rackZ - .14); put(neoprene, new RoundedBoxGeometry(.1, .08, .26, 3, .035), rackX + .8 + s * .08, 2.14, rackZ - .21); }
  for (const s of [-1, 1]) put(neoprene, new RoundedBoxGeometry(.11, .22, .035, 3, .015), rackX + 1.25 + s * .07, 2.55, rackZ - .14);
  const rackLab = lettering(2.8, .5, g => { g.fillStyle = 'rgba(232,236,242,.9)'; g.font = `600 .12px ${FONT}`; g.letterSpacing = '.03px'; g.fillText('SWIM · THE COLD', .05, .2); g.letterSpacing = '0px'; g.fillStyle = 'rgba(232,236,242,.6)'; g.font = `500 .07px ${FONT}`; g.fillText('WETSUIT · TWO CAPS · SOCKS · GLOVES — UNBRANDED STUDIES', .05, .36); }, 1536);
  rackLab.rotation.y = Math.PI; rackLab.position.set(rackX + 1.4, 1.0, R.z0 - .1); group.add(rackLab);
  info(wetsuit, { model: act => swimCard(act), eyebrow: 'SWIM · THE KIT', title: 'Dressed for cold water.', sub: 'Unbranded neoprene studies', text: 'What you test in training, not on race day.' });

  // ------------------------------------------------------------ BIKE: the climbing trainer, its fan and screen, the work stand
  const bikeItem = decor.items.find(d => d.id === 'climb-bikes'), trainerAt = bikeItem.at[0], standAt = bikeItem.at[1];
  const deck = E(new THREE.MeshPhysicalMaterial({ color: '#16181b', roughness: .5, metalness: .1, clearcoat: .4, clearcoatRoughness: .3 }));
  box(deck, 3.6, .05, 2.0, trainerAt[0] + .4, .025, trainerAt[2]);
  obstacles.push({ box: [trainerAt[0] - 1.5, trainerAt[0] + 2.3, trainerAt[2] - 1.05, trainerAt[2] + 1.05] });
  if (ctx.contactShadow) { const cs = ctx.contactShadow(2.0, .55); cs.position.set(trainerAt[0], .056, trainerAt[2]); group.add(cs); }
  const screen = (draw, x, z, rec) => { const c = canvas(1280, 640, draw), m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .95), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false }));
    m.rotation.y = -Math.PI / 2; m.position.set(x - .03, 1.55, z); group.add(m); box(steel, .05, 1.03, 1.98, x, 1.55, z); box(steel, .06, 1.05, .06, x + .02, .52, z); box(steel, .5, .03, .5, x + .02, .015, z);
    info(m, rec); obstacles.push({ c: [x, z], r: .45 }); return m; };
  screen((g, w, h) => { g.fillStyle = '#070a0e'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(230,236,244,.92)'; g.font = `700 44px ${FONT}`; g.letterSpacing = '4px'; g.fillText('LONG RIDE · CLIMB, RECOVER, CLIMB', 60, 90);
      g.fillStyle = 'rgba(230,236,244,.5)'; g.font = `500 22px ${FONT}`; g.letterSpacing = '3px'; g.fillText('A KONA.M EXAMPLE SESSION · NOT COACHING ADVICE · NO RIDER DATA', 60, 130);
      const x0 = 60, x1 = w - 60, y0 = h - 90, y1 = 190; g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; for (let k = 0; k <= 4; k++) { const y = y0 - (y0 - y1) * k / 4; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
      [[0, .08, .45], [.08, .2, .82], [.2, .26, .5], [.26, .38, .82], [.38, .44, .5], [.44, .56, .82], [.56, .62, .5], [.62, .74, .82], [.74, .86, .55], [.86, 1, .4]].forEach(([a, b, v]) => { g.fillStyle = v > .7 ? 'rgba(255,170,90,.85)' : 'rgba(150,190,240,.55)'; g.fillRect(x0 + (x1 - x0) * a + 2, y0 - (y0 - y1) * v, (x1 - x0) * (b - a) - 4, (y0 - y1) * v); });
      g.fillStyle = 'rgba(230,236,244,.6)'; g.font = `500 22px ${FONT}`; ['0 h', '1 h', '2 h', '3 h', '4 h', '5 h'].forEach((t, k) => g.fillText(t, x0 + (x1 - x0) * k / 5 - (k === 5 ? 40 : 0), y0 + 40)); },
    trainerAt[0] + 2.6, trainerAt[2], { model: act => bikeCard(act), eyebrow: 'BIKE · THE LONG RIDE', title: 'Climb, recover, climb.', sub: 'A KONA.m example session', text: 'Not coaching advice and not anyone’s data.' });
  { const [x, , z] = standAt; box(steel, .5, .03, .5, x - .35, .015, z); put(steel, new THREE.CylinderGeometry(.022, .026, 1.05, 12), x - .35, .54, z); put(brushed, new THREE.CylinderGeometry(.018, .018, .32, 10), x - .27, 1.06, z, 0, 0, Math.PI / 2.6);
    box(steel, .4, .03, .26, x - .35, .62, z + .2); for (let i = 0; i < 5; i++) put(brushed, new THREE.CylinderGeometry(.008, .008, .16, 6), x - .5 + i * .07, .645, z + .2, Math.PI / 2, 0, 0);
    obstacles.push({ box: [x - 1.1, x + 1.1, z - .55, z + .55] }); }

  // ------------------------------------------------------------ RUN: the incline treadmill facing the mountain, its screen
  const tread = decor.items.find(d => d.id === 'hill-treadmill').at[0];
  box(deck, 2.9, .05, 1.5, tread[0], .025, tread[2]);
  obstacles.push({ box: [tread[0] - 1.5, tread[0] + 1.5, tread[2] - .8, tread[2] + .8] });
  const treadStand = new THREE.Mesh(new THREE.BoxGeometry(2.4, .3, .9), new THREE.MeshStandardMaterial({ color: '#111418', roughness: .5, metalness: .5 })); treadStand.position.set(tread[0], .15, tread[2]); group.add(treadStand);
  const runScreen = screen((g, w, h) => { g.fillStyle = '#0b0807'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(244,236,226,.92)'; g.font = `700 44px ${FONT}`; g.letterSpacing = '4px'; g.fillText('RUN · LONG FLAT, THEN UP', 60, 90);
      g.fillStyle = 'rgba(244,236,226,.5)'; g.font = `500 22px ${FONT}`; g.letterSpacing = '3px'; g.fillText('A KONA.M EXAMPLE SESSION · WALK THE STEEP PARTS · NOT COACHING ADVICE', 60, 130);
      const x0 = 60, x1 = w - 60, y0 = h - 90, y1 = 200; g.strokeStyle = '#ffa868'; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x0, y0 - 30);
      g.lineTo(x0 + (x1 - x0) * .55, y0 - 34); for (let k = 0; k < 5; k++) { const a = .55 + k * .09; g.lineTo(x0 + (x1 - x0) * (a + .06), y1 + 40 + k * 4); g.lineTo(x0 + (x1 - x0) * (a + .09), y0 - 40); } g.stroke();
      g.fillStyle = 'rgba(244,236,226,.6)'; g.font = `500 22px ${FONT}`; g.fillText('EASY RUNNING FIRST', x0, y0 + 40); g.fillText('HILL REPEATS AT THE END', x0 + (x1 - x0) * .58, y0 + 40); },
    tread[0] + 2.4, tread[2] - 1.2, { model: act => runCard(act), eyebrow: 'RUN · THE HILL', title: 'Long and flat, then up.', sub: 'Incline treadmill · KONA.m example session', text: 'The run you train for is two runs.' });
  info(treadStand, runScreen.userData.info);

  // ------------------------------------------------------------ GEAR & ROUTINE on the north wall: the week, crew table and backpack, the two tops
  { const bx = 21.1, c = canvas(1600, 900, (g, w, h) => { g.fillStyle = '#ece9e2'; g.fillRect(0, 0, w, h); const r = rng(55);
      for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${r() * .03})`; g.fillRect(r() * w, r() * h, 2, 2); }
      g.fillStyle = '#1b1d21'; g.font = `800 52px ${FONT}`; g.letterSpacing = '4px'; g.fillText('A WEEK BUILT AROUND THE CLIMB', 70, 110);
      g.font = `500 24px ${FONT}`; g.letterSpacing = '3px'; g.fillStyle = 'rgba(27,29,33,.6)'; g.fillText('A KONA.M EXAMPLE TO READ, NOT A PLAN TO FOLLOW · NOT COACHING ADVICE', 70, 156);
      const days = [['MON', 'REST', 'walk · mobility'], ['TUE', 'COLD SWIM', 'open water, wetsuit on'], ['WED', 'HILL RUN', 'repeats, walk the top'], ['THU', 'STRENGTH', 'legs · core'], ['FRI', 'SWIM', 'technique'], ['SAT', 'LONG RIDE', 'climbs, eat on the bike'], ['SUN', 'RIDE → RUN', 'off the bike, uphill']];
      const cw = (w - 140) / 7; days.forEach(([d, t, s], k) => { const x = 70 + k * cw; g.fillStyle = k === 5 ? '#f0b27a' : k === 2 || k === 6 ? '#f3d2b4' : k === 1 || k === 4 ? '#bcd6e6' : '#d8d4cc'; g.fillRect(x + 6, 220, cw - 12, 560);
        g.fillStyle = '#1b1d21'; g.font = `800 34px ${FONT}`; g.letterSpacing = '3px'; g.fillText(d, x + 26, 280); g.font = `800 30px ${FONT}`; g.letterSpacing = '1px';
        t.split(' ').forEach((wd, i) => g.fillText(wd, x + 26, 420 + i * 40)); g.font = `italic 400 26px ${SERIF}`; g.fillStyle = 'rgba(27,29,33,.75)'; s.split(' · ').forEach((wd, i) => g.fillText(wd, x + 26, 560 + i * 34)); });
      g.fillStyle = 'rgba(27,29,33,.55)'; g.font = `500 22px ${FONT}`; g.letterSpacing = '2px'; g.fillText('COLD · CLIMB · CLIMB AGAIN · REST · REPEAT', 70, h - 60); });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.02), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .85, emissiveMap: tex(c), emissive: '#ffffff', emissiveIntensity: .1 }));
    board.rotation.y = Math.PI; board.position.set(bx, 2.65, R.z0 - .1); group.add(board); box(oak, 3.75, 2.17, .04, bx, 2.65, R.z0 - .07);
    info(board, { model: act => weekCard(act), eyebrow: 'THE ROUTINE', title: 'A week built around the climb.', sub: 'A KONA.m example, not a plan', text: 'Not coaching advice.' }); }
  const crew = { x: 24.9, z: R.z0 - .75 };
  box(oak, 2.6, .06, .8, crew.x, .86, crew.z); for (const dx of [-1.2, 1.2]) for (const dz of [-.32, .32]) box(steel, .04, .83, .04, crew.x + dx, .415, crew.z + dz);
  const bottleG = mergeGeometries([new THREE.CylinderGeometry(.037, .037, .2, 18).translate(0, .1, 0), new THREE.CylinderGeometry(.03, .037, .03, 18).translate(0, .215, 0)].map(g => g.toNonIndexed()));
  const bottles = new THREE.InstancedMesh(bottleG, E(new THREE.MeshPhysicalMaterial({ color: '#dfe6ec', roughness: .25, transparent: true, opacity: .85, clearcoat: .7 })), 8);
  for (let i = 0; i < 8; i++) { M4.makeTranslation(crew.x - 1.05 + (i % 4) * .1, .89, crew.z - .1 + (i >> 2) * .12); bottles.setMatrixAt(i, M4); } group.add(bottles);
  const boxC = canvas(256, 128, (g, w, h) => { g.fillStyle = '#c9b48e'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2219'; g.font = `700 26px ${FONT}`; g.fillText('CREW · BIKE 2', 16, 48); g.font = `500 18px ${FONT}`; g.fillText('food · gels · warm layer', 16, 84); });
  const crate = new THREE.MeshStandardMaterial({ map: tex(boxC), roughness: .9 });
  for (let i = 0; i < 3; i++) put(crate, new THREE.BoxGeometry(.36, .18, .26), crew.x - .3 + i * .2, .98 + (i === 1 ? .18 : 0), crew.z + (i === 1 ? 0 : .04 * i), 0, (i - 1) * .12, 0);
  put(new THREE.MeshStandardMaterial({ color: '#2b5e7a', roughness: .5 }), new RoundedBoxGeometry(.6, .42, .4, 3, .05), crew.x + .75, .21, crew.z + .05);
  put(new THREE.MeshStandardMaterial({ color: '#e7edf2', roughness: .4 }), new RoundedBoxGeometry(.62, .04, .42, 3, .02), crew.x + .75, .44, crew.z + .05);
  const pack = new THREE.Group(); pack.position.set(crew.x + .9, 1.75, R.z0 - .22); group.add(pack);
  { const bag = new THREE.MeshPhysicalMaterial({ color: '#2a3036', roughness: .7, sheen: .5, sheenColor: new THREE.Color('#5a6670') });
    const body = new THREE.Mesh(new RoundedBoxGeometry(.34, .5, .2, 4, .08), bag); pack.add(body);
    const pocket = new THREE.Mesh(new RoundedBoxGeometry(.26, .2, .07, 3, .03), bag); pocket.position.set(0, -.1, -.12); pack.add(pocket);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(.13, .012, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: '#d58a3a', roughness: .6 })); strap.position.set(0, .25, -.02); pack.add(strap);
    pack.traverse(o => { if (o.isMesh) o.castShadow = !lite; });
    put(brushed, new THREE.CylinderGeometry(.012, .012, .14, 8), crew.x + .9, 2.05, R.z0 - .12, Math.PI / 2, 0, 0);
    info(pack.children, { model: act => crewCard(act), eyebrow: 'THE CLIMB · BACKPACK', title: 'Packed for the mountain.', sub: 'Emergency food and clothing', text: 'Carried on the final climb.' }); }
  const shellMat = new THREE.MeshPhysicalMaterial({ color: '#3a4652', roughness: .5, sheen: .4, sheenColor: new THREE.Color('#9fb0c0'), clearcoat: .3 });
  const jacket = garment(suitShape(2.0, false), shellMat, crew.x - .55, 2.0, R.z0 - .14); jacket.scale.set(.85, .85, 1);
  const crewLab = lettering(2.6, .5, g => { g.fillStyle = 'rgba(232,236,242,.9)'; g.font = `600 .12px ${FONT}`; g.letterSpacing = '.03px'; g.fillText('THE CREW · THE BACKPACK', .05, .2); g.letterSpacing = '0px'; g.fillStyle = 'rgba(232,236,242,.6)'; g.font = `500 .07px ${FONT}`; g.fillText('AN UNSUPPORTED RACE: YOUR CREW IS THE AID STATION', .05, .36); }, 1536);
  crewLab.rotation.y = Math.PI; crewLab.position.set(crew.x + 1.3, 2.75, R.z0 - .1); group.add(crewLab);
  const crewPick = new THREE.Mesh(new THREE.BoxGeometry(2.6, .6, .8), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); crewPick.position.set(crew.x, 1.1, crew.z); group.add(crewPick);
  info([crewPick, jacket], { model: act => crewCard(act), eyebrow: 'THE CREW', title: 'Nobody does this alone.', sub: 'Crew table · layers for the plateau', text: 'A support crew is required.' });
  obstacles.push({ box: [crew.x - 1.4, crew.x + 1.4, crew.z - .5, R.z0] });
  { const nx = 32.35, ny = 2.0, nz = R.z0 - .08;
    box(new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: .9 }), 3.0, 2.8, .04, nx, 1.85, nz - .01); box(ledWarm, 2.8, .02, .03, nx, 3.2, nz - .05);
    const tee = suitShape(.55, false);
    const black = garment(tee, new THREE.MeshPhysicalMaterial({ color: '#111214', roughness: .85, sheen: .6, sheenColor: new THREE.Color('#555') }), nx - .6, ny, nz - .12);
    const white = garment(tee, new THREE.MeshPhysicalMaterial({ color: '#e9e8e4', roughness: .9, sheen: .4, sheenColor: new THREE.Color('#fff') }), nx + .6, ny, nz - .12);
    for (const m of [black, white]) m.scale.set(1, .9, 1);
    for (const x of [nx - .6, nx + .6]) put(brushed, new THREE.TorusGeometry(.14, .008, 6, 24, Math.PI), x, ny + .66, nz - .1);
    const lab = lettering(2.4, .34, g => { g.textAlign = 'center'; g.fillStyle = 'rgba(232,236,242,.88)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.02px'; g.fillText('SUMMIT', .6, .14); g.fillText('LOWER COURSE', 1.8, .14);
      g.fillStyle = 'rgba(232,236,242,.55)'; g.font = `500 .055px ${FONT}`; g.fillText('FIRST 160 AT 37 KM', .6, .24); g.fillText('SAME DISTANCE', 1.8, .24); }, 1024);
    lab.rotation.y = Math.PI; lab.position.set(nx, ny - .78, nz - .04); group.add(lab);
    info([black, white], { model: act => topsCard(act), eyebrow: 'THE FINISH', title: 'Black at the top. White below.', sub: 'Plain studies, no marks', text: 'Tap for how the course splits.' }); }

  // ------------------------------------------------------------ HEAT: a Nordic sauna in the corner, glowing through its glass, beside the cold pool
  const sauna = { x0: 30.95, x1: R.x1 - .32, z0: -14.75, z1: R.z1 + .32, h: 2.6 };
  { const charC = canvas(256, 512, (g, w, h) => { g.fillStyle = '#121110'; g.fillRect(0, 0, w, h); const r = rng(61); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, 0, 2, h);
      for (let y = 0; y < h; y += 6) { const v = 14 + r() * 26; g.fillStyle = `rgba(${v},${v - 2},${v - 4},.9)`; g.fillRect(x + 2 + r() * 26, y, 3 + r() * 6, 4 + r() * 4); } } });
    const charred = new THREE.MeshStandardMaterial({ map: tex(charC, true, [3, 1]), roughness: .95, color: '#ffffff' });
    const aspen = new THREE.MeshStandardMaterial({ map: tex(grainC('#cfa877', 63), true, [1, 1]), roughness: .7, color: '#ffffff' });
    const { x0, x1, z0, z1, h } = sauna, sx = (x0 + x1) / 2, sz = (z0 + z1) / 2, d = z0 - z1, w = x1 - x0;
    box(charred, .1, h, d, x0, h / 2, sz); box(charred, w + .1, .14, d + .1, sx, h + .07, sz);           // west wall and roof (the hall's walls close the rest)
    box(charred, .5, h, .1, x0 + .25, h / 2, z0); box(charred, .12, h, .1, x1 - .06, h / 2, z0); box(charred, w, .3, .1, sx, h - .15, z0);   // front frame
    box(charred, .06, h - .3, .08, x0 + 1.45, (h - .3) / 2, z0);                                                                             // door mullion
    put(new THREE.MeshPhysicalMaterial({ color: '#ffd9b0', roughness: .05, transparent: true, opacity: .16, depthWrite: false }), new THREE.PlaneGeometry(w - .6, h - .3), sx + .19, (h - .3) / 2, z0 - .01, 0, Math.PI, 0);
    for (const [y, dz, dd] of [[.45, .95, .55], [.9, .4, .55]]) { box(aspen, w - .2, .05, dd, sx + .05, y, z1 + dz); box(aspen, w - .2, y - .05, .04, sx + .05, (y - .05) / 2, z1 + dz - dd / 2 + .02); box(ledWarm, w - .3, .015, .02, sx + .05, y - .04, z1 + dz - dd / 2 + .06); }
    for (let i = 0; i < 12; i++) box(aspen, .08, .03, d - .2, x0 + .2 + i * (w - .3) / 11, .015, sz);                                      // slatted floor
    box(steel, .5, .6, .45, x0 + .55, .3, z0 - .55); for (let i = 0; i < 14; i++) put(granite, rock(.05 + rand() * .03, .7), x0 + .4 + rand() * .3, .64 + rand() * .06, z0 - .7 + rand() * .3, 0, rand() * 6);
    put(ledWarm, new THREE.BoxGeometry(.46, .02, .02), x0 + .55, .58, z0 - .32);
    const lining = new THREE.MeshStandardMaterial({ map: aspen.map, color: '#ffffff', emissiveMap: aspen.map, emissive: '#ff8a3c', emissiveIntensity: .9, roughness: .75 });
    put(lining, new THREE.PlaneGeometry(w - .2, h - .2), sx, h / 2, z1 + .06); put(lining, new THREE.PlaneGeometry(d - .2, h - .2), x1 - .06, h / 2, sz, 0, -Math.PI / 2, 0); put(lining, new THREE.PlaneGeometry(d - .2, h - .2), x0 + .06, h / 2, sz, 0, Math.PI / 2, 0);
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(w - .6, h - .3), new THREE.MeshBasicMaterial({ color: '#ff9d55', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false }));
    glowPlane.rotation.y = Math.PI; glowPlane.position.set(sx + .19, (h - .3) / 2, z0 + .02); group.add(glowPlane);
    const lab = lettering(1.6, .3, g => { g.fillStyle = 'rgba(236,232,226,.85)'; g.font = `600 .1px ${FONT}`; g.letterSpacing = '.03px'; g.fillText('HEAT · COLD · REPEAT', .02, .14); g.letterSpacing = '0px'; g.fillStyle = 'rgba(236,232,226,.5)'; g.font = `500 .055px ${FONT}`; g.fillText('A NORDIC HABIT · NOT RACE OR MEDICAL ADVICE', .02, .24); }, 1024);
    lab.rotation.y = Math.PI; lab.position.set(x0 + .9, 2.0, z0 - .07); group.add(lab);
    info(glowPlane, { model: act => saunaCard(act), eyebrow: 'RECOVERY · HEAT', title: 'Heat, then the cold pool.', sub: 'A sauna beside the cold water', text: 'A Nordic habit, not race or medical advice.' });
    obstacles.push({ box: [x0 - .2, x1 + .3, z1 - .3, z0 + .2] }); }

  // ------------------------------------------------------------ the pace clock over the head of the pool, sweeping real seconds
  const paceHand = new THREE.Group(), paceSlow = new THREE.Group();
  { const c = canvas(512, 512, (g, w) => { const C = w / 2; g.fillStyle = '#f2f1ec'; g.beginPath(); g.arc(C, C, C - 4, 0, 7); g.fill(); g.fillStyle = '#16181b';
      for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2, r0 = k % 5 ? .86 : .8; g.save(); g.translate(C + Math.sin(a) * C * (r0 + .93) / 2, C - Math.cos(a) * C * (r0 + .93) / 2); g.rotate(a); g.fillRect(-(k % 5 ? 2 : 5), -C * (.93 - r0) / 2, k % 5 ? 4 : 10, C * (.93 - r0)); g.restore(); }
      g.font = `700 38px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let k = 5; k <= 60; k += 5) { const a = k / 60 * Math.PI * 2; g.fillText(String(k), C + Math.sin(a) * C * .64, C - Math.cos(a) * C * .64); }
      g.font = `600 18px ${FONT}`; g.fillStyle = 'rgba(22,24,27,.55)'; g.fillText('PACE', C, C + C * .3); });
    const clock = new THREE.Group(); clock.position.set(R.x0 + .36, 2.7, (POOL.z0 + POOL.z1) / 2); clock.rotation.y = Math.PI / 2; group.add(clock);
    const face = new THREE.Mesh(new THREE.CircleGeometry(.55, 64), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .5 })); clock.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.56, .035, 10, 64), steel); clock.add(rim);
    const red = new THREE.Mesh(new THREE.BoxGeometry(.012, .5, .008).translate(0, .2, .02), new THREE.MeshBasicMaterial({ color: '#d4202a' })); paceHand.add(red);
    const blk = new THREE.Mesh(new THREE.BoxGeometry(.018, .36, .008).translate(0, .14, .015), new THREE.MeshBasicMaterial({ color: '#16181b' })); paceSlow.add(blk);
    clock.add(paceHand); if (!lite) clock.add(paceSlow);                 // phones: the sweep hand only (mesh budget) clock.add(new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .03, 16).rotateX(Math.PI / 2).translate(0, 0, .03), steel));
    info(face, { model: act => swimCard(act), eyebrow: 'SWIM · THE CLOCK', title: 'Every lap on the clock.', sub: 'A swim pace clock, running in real seconds', text: 'Interval training, read off the wall.' }); }

  // ------------------------------------------------------------ the clutter of real training: swim gear, wheels and helmet, a strength corner, poles and a lamp
  { box(oak, 3.2, .04, .38, 11.1, .55, R.z0 - .26); for (const x of [9.6, 12.6]) box(steel, .03, .55, .34, x, .275, R.z0 - .26);
    const foam = [new THREE.MeshStandardMaterial({ color: '#2f5f78', roughness: .8 }), new THREE.MeshStandardMaterial({ color: '#c9ccc8', roughness: .8 }), new THREE.MeshStandardMaterial({ color: '#d9a84a', roughness: .8 })];
    for (let i = 0; i < 5; i++) put(foam[i % 3], new RoundedBoxGeometry(.3, .035, .44, 2, .015), 9.95, .59 + i * .036, R.z0 - .26, 0, (rand() - .5) * .1, 0);
    for (let i = 0; i < 3; i++) { put(foam[1], new THREE.CapsuleGeometry(.055, .1, 4, 10), 10.6 + i * .16, .64, R.z0 - .2, Math.PI / 2, 0, 0); put(foam[0], new THREE.CapsuleGeometry(.05, .08, 4, 10), 10.6 + i * .16, .64, R.z0 - .33, Math.PI / 2, 0, 0); }
    for (const dx of [0, .14]) { put(neoprene, new RoundedBoxGeometry(.12, .03, .52, 2, .012), 11.6 + dx, .585, R.z0 - .26, 0, .05, 0); put(neoprene, new RoundedBoxGeometry(.11, .07, .14, 2, .02), 11.6 + dx, .62, R.z0 - .12); }
    put(foam[1], new THREE.SphereGeometry(.06, 12, 8), 12.25, .6, R.z0 - .26, 0, 0, 0, 1.6, .8, 1); }
  { const spokeC = canvas(256, 256, (g, w) => { const C = w / 2; g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(205,210,215,.9)'; g.lineWidth = 1.2; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, o = (k % 2 ? 1 : -1) * .12; g.beginPath(); g.moveTo(C + Math.cos(a + o) * 12, C + Math.sin(a + o) * 12); g.lineTo(C + Math.cos(a) * (C - 2), C + Math.sin(a) * (C - 2)); g.stroke(); } });
    const spokes = new THREE.MeshBasicMaterial({ map: tex(spokeC), transparent: true, depthWrite: false, side: THREE.DoubleSide }), tyre = new THREE.MeshStandardMaterial({ color: '#141414', roughness: .85 }), rim = new THREE.MeshStandardMaterial({ color: '#1b1d20', roughness: .35, metalness: .4 });
    for (let i = 0; i < 3; i++) { const x = 14.4 + i * .82, y = 2.55 + (i % 2) * .12, z = R.z0 - .16;
      put(rim, new THREE.TorusGeometry(.3, i === 1 ? .045 : .022, 8, 48), x, y, z); put(tyre, new THREE.TorusGeometry(.33, .014, 6, 48), x, y, z); put(steel, new THREE.CylinderGeometry(.025, .025, .1, 12), x, y, z, Math.PI / 2, 0, 0);
      put(spokes, new THREE.CircleGeometry(.3, 32), x, y, z); put(brushed, new THREE.CylinderGeometry(.008, .008, .16, 6), x, y + .34, z + .06, Math.PI / 2, 0, 0); }
    const shellH = new THREE.MeshPhysicalMaterial({ color: '#d6d8da', roughness: .3, clearcoat: 1 });
    put(shellH, new THREE.SphereGeometry(.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 17.15, 2.3, R.z0 - .2, 0, 0, 0, 1, .82, 1.25);
    put(steel, new THREE.SphereGeometry(.15, 24, 12, 0, Math.PI * 2, Math.PI / 2, .25), 17.15, 2.3, R.z0 - .2, 0, 0, 0, 1, .82, 1.25);
    const wl = lettering(2.6, .3, g => { g.fillStyle = 'rgba(232,236,242,.8)'; g.font = `600 .09px ${FONT}`; g.letterSpacing = '.03px'; g.fillText('BIKE · SPARE WHEELS · HELMET', .02, .16); }, 1536);
    wl.rotation.y = Math.PI; wl.position.set(16.0, 1.9, R.z0 - .1); group.add(wl); }
  { const mat = new THREE.MeshStandardMaterial({ color: '#1a1c1e', roughness: .95 }), iron = new THREE.MeshStandardMaterial({ color: '#202225', roughness: .55, metalness: .6 });
    box(mat, 3.4, .02, 1.5, 31.7, .01, -5.9);
    [[30.4, .14], [30.75, .16], [31.1, .18], [31.5, .2]].forEach(([x, r]) => { put(iron, new THREE.SphereGeometry(r, 20, 14), x, r * .9, -6.25); put(iron, new THREE.TorusGeometry(r * .55, r * .14, 8, 20, Math.PI), x, r * 1.6, -6.25); });
    put(oak, new RoundedBoxGeometry(.75, .6, .5, 2, .02), 32.6, .3, -6.1, 0, .2, 0);
    for (let i = 0; i < 2; i++) put(new THREE.MeshStandardMaterial({ color: i ? '#3c4a55' : '#7a3b2e', roughness: .9 }), new THREE.CylinderGeometry(.075, .075, .9, 18), 33.2, .075, -5.5 + i * .2, 0, 0, Math.PI / 2);
    obstacles.push({ box: [30.0, 33.6, -6.7, -5.1] }); }
  { const [x, , z] = decor.items.find(d => d.id === 'hill-treadmill').at[0];
    for (const s of [-1, 1]) put(brushed, new THREE.CylinderGeometry(.009, .006, 1.25, 6), x + 2.25 + s * .05, .6, z - 1.2 - .25, .12 * s, 0, .22);
    put(steel, new THREE.TorusGeometry(.06, .012, 6, 16), x + 2.42, 1.0, z - 1.2, 0, Math.PI / 2, 0); put(ledWarm, new THREE.CylinderGeometry(.02, .02, .025, 12), x + 2.42, .96, z - 1.25, Math.PI / 2, 0, 0); }

  // ------------------------------------------------------------ environmental type, high on the slat wall; the terrain credit over the glass
  const big = lettering(16, 1.3, g => { g.fillStyle = 'rgba(245,240,232,.85)'; g.font = `200 .78px ${FONT}`; g.letterSpacing = '.12px'; g.fillText('FJORD TO SUMMIT', .1, .9);
    g.letterSpacing = '.04px'; g.fillStyle = 'rgba(245,240,232,.5)'; g.font = `500 .16px ${FONT}`; g.fillText('COLD · CLIMB · CLIMB AGAIN · SUMMIT', 8.4, .6); g.fillText('A NORSEMAN TRAINING ROOM · AN INDEPENDENT KONA.M CONCEPT', 8.4, .88); }, 4096);
  big.rotation.y = Math.PI; big.position.set(R.x0 + 8.6, 6.3, R.z0 - .14); group.add(big);
  const credit = lettering(9, .3, g => { g.fillStyle = 'rgba(240,240,236,.6)'; g.font = `500 .075px ${FONT}`; g.letterSpacing = '.02px';
    g.fillText('WINDOWS: REAL TERRAIN · EIDFJORD (SOUTH) AND GAUSTATOPPEN (EAST) AT 1 : 10 · SHADED IN CODE · NORWAY TERRAIN DATA © KARTVERKET, CC BY 4.0', .05, .18); }, 4096);
  credit.position.set(SOUTH.x0 + 4.6, H - .5, R.z1 + .32); group.add(credit);

  // ------------------------------------------------------------ atmosphere: vapour off the cold pool, dust in the sun
  const vapour = motes({ n: lite ? 50 : 140, box: [P.x0, P.x1, 0, 1.4, P.z0 + .2, P.z1], color: '#dbeaf3', size: .07, rise: .1, sway: .12, opacity: .22, seed: 41 });
  group.add(vapour.points);
  const dust = motes({ n: lite ? 40 : 120, box: [26, R.x1 - .5, .3, 5.5, -13.5, -5], color: '#ffe2bd', size: .025, rise: .02, sway: .25, opacity: .5, seed: 47 });
  group.add(dust.points);
  for (let i = 0; i < 8; i++) { const s = .06 + rand() * .1; put(granite, rock(s, .55), LEGS.bike.x0 + rand() * 20, s * .25, SZ + (rand() < .5 ? -1 : 1) * (.85 + rand() * .3), 0, rand() * 6); }

  flush(true);

  // ------------------------------------------------------------ hall-side sign over the door
  const sign = lettering(4.6, .9, g => { g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('FJORD TO SUMMIT · A NORSEMAN TRAINING ROOM', 0, .28);
    g.fillStyle = '#3b6f8f'; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Cold, then climb, then climb.', 0, .69); }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ light: a low dawn sun through the east glass, sky from the south glass and the skylight
  if (!rectLib) { RectAreaLightUniformsLib.init(); rectLib = true; }
  const sun = new THREE.DirectionalLight('#ffc994', lite ? 2.2 : 7.5);
  sun.target.position.set(22, 0, -10); sun.position.copy(sun.target.position).addScaledVector(SUN, 45); group.add(sun, sun.target);
  if (!lite) { sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 13; sc.bottom = -13; sc.near = 5; sc.far = 90; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -.00025; sun.shadow.normalBias = .02; }
  const skyS = new THREE.RectAreaLight('#9fbde4', lite ? 2.4 : 1.5, SOUTH.x1 - SOUTH.x0, 5); skyS.position.set((SOUTH.x0 + SOUTH.x1) / 2, 3.4, R.z1 + .2); skyS.lookAt((SOUTH.x0 + SOUTH.x1) / 2, 1.8, R.z0); group.add(skyS);
  // Practical light is faked, not computed: every real light here is paid by every lit material in the museum, so the
  // stations get additive floor pools and wall washes (two draws in all) instead of spot and point lights.
  const glowT = tex(canvas(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const washT = tex(canvas(128, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, 0, 4, w / 2, 30, h); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.5, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const poolM = new THREE.MeshBasicMaterial({ map: glowT, color: '#ffe6c4', transparent: true, opacity: lite ? .4 : .36, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const washM = new THREE.MeshBasicMaterial({ map: washT, color: '#ffe2bd', transparent: true, opacity: lite ? .52 : .48, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const [x, z, w, d] of [[rackX, R.z0 - 1.1, 3.6, 2.2], [21.1, R.z0 - 1.3, 4.2, 2.4], [crew.x, crew.z - .2, 3.0, 2.0], [32.35, R.z0 - 1.0, 3.2, 2.0], [trainerAt[0] + .4, trainerAt[2], 3.8, 2.4], [tread[0], tread[2], 3.4, 2.0], [sauna.x0 + 1.8, sauna.z0 - .9, 3.6, 2.2]])
    put(poolM, new THREE.PlaneGeometry(w, d), x, .006, z, -Math.PI / 2, 0, 0);
  for (const [x, w] of [[rackX, 3.4], [16.0, 3.6], [21.1, 4.2], [crew.x + .4, 3.2], [32.35, 3.2]]) put(washM, new THREE.PlaneGeometry(w, 4.2), x, H - 3.4, R.z0 - .11, 0, Math.PI, 0);
  if (!lite) for (let i = 0; i < 3; i++) box(ledWarm, .06, .02, .06, rackX - 1 + i, H - .9, R.z0 - .9);   // the fittings the washes imply (desktop: mesh budget)
  flush(false);

  // shafts of sun through each east bay: prisms swept along the sun, fading with distance and broken by drifting dust
  const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, uniforms: { t: strata.t, k: { value: lite ? .05 : .085 } },
    vertexShader: 'attribute float along;varying float vA;varying vec3 vW,vN,vV;void main(){vA=along;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float t,k;varying float vA;varying vec3 vW,vN,vV;
      float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
      float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){float fall=pow(1.-vA,1.5)*smoothstep(.1,.28,vA);float streak=.45+.55*smoothstep(.2,.9,sin(vW.z*7.+vW.y*1.3)*.5+.5);float rim=pow(abs(dot(vN,vV)),.8);
        float dust=.65+.35*n(vW*1.3+vec3(t*.05,t*.02,0.));gl_FragColor=vec4(vec3(1.,.82,.6)*k*fall*rim*dust*streak,1.);}` });
  { const geos = [], n = 4, back = SUN.clone().multiplyScalar(-24);
    for (let i = 0; i < n; i++) { const za = EAST.z0 + (EAST.z1 - EAST.z0) * i / n + .1, zb = EAST.z0 + (EAST.z1 - EAST.z0) * (i + 1) / n - .1, x = R.x1 - .14;
      const g = new THREE.BoxGeometry(1, 1, 1), p = g.attributes.position, along = new Float32Array(p.count);
      for (let k = 0; k < p.count; k++) { const u = p.getX(k) + .5, y = p.getY(k) + .5, z = p.getZ(k) + .5; along[k] = u;
        p.setXYZ(k, x + back.x * u, .15 + (H - 1.0) * y + back.y * u, za + (zb - za) * z + back.z * u); }
      g.setAttribute('along', new THREE.BufferAttribute(along, 1)); g.computeVertexNormals(); geos.push(g); }
    if (!lite) { const beams = new THREE.Mesh(mergeGeometries(geos), beamMat); beams.renderOrder = 3; beams.frustumCulled = false; group.add(beams); } }

  // ------------------------------------------------------------ the landscape behind the glass (portal scene)
  const L = portal.scene, TIME = { value: 0 };
  const NEAR = { eid: lite ? 380 : 700, gau: lite ? 300 : 520, trees: 16000, liteTrees: 3200 };   // instanced stands out to here (scene metres)
  const SUN_P = new THREE.Vector3(-.6, .16, .62).normalize();              // low dawn sun behind the visitor's right shoulder: alpenglow on the faces
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: SUN_P }, t: TIME, clouds: { value: 1 } },
    vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader: `uniform vec3 sun;uniform float t,clouds;varying vec3 vD;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<6;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
      void main(){float hgt=max(vD.y,0.);float s=max(dot(vD,sun),0.);float anti=max(dot(vD,-vec3(sun.x,0.,sun.z)/length(sun.xz)),0.);
        vec3 zen=vec3(.09,.17,.34),hor=vec3(.68,.72,.78),warm=vec3(1.,.66,.40);
        vec3 c=mix(hor,zen,pow(hgt,.5));c=mix(c,warm,pow(s,5.)*(1.-hgt)*.9);
        // opposite the low sun: the Earth's shadow (blue-grey) on the horizon, the Belt of Venus (rose) just above it
        float belt=smoothstep(.02,.07,vD.y)*(1.-smoothstep(.1,.24,vD.y)), shadowB=1.-smoothstep(.0,.05,vD.y);
        c=mix(c,vec3(.93,.70,.70),belt*(.35+.5*anti));c=mix(c,vec3(.42,.48,.60),shadowB*(.3+.5*anti)*step(0.,vD.y));
        if(clouds>.5&&vD.y>0.){vec2 uv=vD.xz/(vD.y+.05)*.5+vec2(t*.005,t*.002);float d=fbm(uv*1.2),d2=fbm(uv*3.1+7.);
          float cov=smoothstep(.46,.72,d)*smoothstep(0.,.14,vD.y);float thick=smoothstep(.6,.9,d);
          vec3 base=mix(vec3(.30,.32,.38),vec3(.52,.50,.56),d2);                 // cloud bodies: cool grey
          vec3 rim=mix(vec3(1.,.62,.52),vec3(1.,.84,.62),pow(s,2.));              // edges and undersides lit by the low sun
          vec3 cc=mix(rim*(.75+.25*anti),base,thick*.85);c=mix(c,cc,cov*.92);}
        c+=vec3(1.,.86,.62)*pow(s,1200.)*14.+vec3(1.,.72,.46)*pow(s,24.)*.45;
        c=mix(c,vec3(.30,.34,.38),smoothstep(0.,-.18,vD.y));gl_FragColor=vec4(c,1.);}` });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(5200, 48, 24), skyMat); skyDome.frustumCulled = false; skyDome.renderOrder = -1; L.add(skyDome);
  L.fog = null;                                                          // aerial perspective (engine/terrain-portal.js) does the air
  L.add(new THREE.HemisphereLight('#a9bede', '#253139', .42));
  const pSun = new THREE.DirectionalLight('#ffd9b0', 2.8); pSun.target.position.set(200, 0, -200); pSun.position.copy(SUN_P).multiplyScalar(2400).add(pSun.target.position); L.add(pSun, pSun.target);
  const keepSouth = [new THREE.Plane(new THREE.Vector3(0, 0, -1), R.z1 - .05), new THREE.Plane(new THREE.Vector3(-1, 0, -1).normalize(), (R.x1 + R.z1) / Math.SQRT2)];
  const keepEast = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -(R.x1 - .05)), new THREE.Plane(new THREE.Vector3(1, 0, 1).normalize(), -(R.x1 + R.z1) / Math.SQRT2)];
  if (renderer) { const pm = new THREE.PMREMGenerator(renderer), sk = new THREE.Scene(), m = skyMat.clone(); m.uniforms.clouds.value = 0; sk.add(new THREE.Mesh(skyDome.geometry, m)); L.environment = pm.fromScene(sk, 0, 1, 6000).texture; L.environmentIntensity = .4; pm.dispose(); }
  // the fjord: cold water at the pool's own level. On desktop a true mirror, so the valley walls stand in it.
  const fjordN = tex(canvas(512, 512, (g, w, h) => { const im = g.createImageData(w, h), r = rng(71), hs = new Float32Array(w * h);      // gentle ripples: many small, slightly anisotropic waves
    for (let k = 0; k < 24; k++) { const fx = Math.round(1 + r() * 12), fy = Math.round((r() - .5) * 8), ph = r() * 6.283, amp = 1 / (1 + k * .35); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) hs[y * w + x] += Math.sin((x * fx + y * fy) / w * 6.283 + ph) * amp; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, dx = hs[y * w + (x + 1) % w] - hs[i], dy = hs[((y + 1) % h) * w + x] - hs[i]; im.data[i * 4] = 128 - dx * 40; im.data[i * 4 + 1] = 128 - dy * 40; im.data[i * 4 + 2] = 255; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); }), false, [1, 1]); fjordN.wrapS = fjordN.wrapT = THREE.RepeatWrapping;
  const fjordShape = new THREE.Shape([[-5000, -R.z1 + .05], [R.x1, -R.z1 + .05], [5000, -R.z1 + 5000 - R.x1], [5000, 7000], [-5000, 7000]].map(([x, y]) => new THREE.Vector2(x, y)));
  let fjord;
  if (!lite) { fjord = new Water(new THREE.ShapeGeometry(fjordShape), { textureWidth: 1024, textureHeight: 1024, waterNormals: fjordN, sunDirection: SUN_P.clone(), sunColor: 0xffd2a0, waterColor: 0x0a2b2e, distortionScale: .75, fog: true });
    fjord.material.uniforms.size.value = 2.6; aerialWater(fjord);
    // cold Norwegian water: the mirrored scene a little darker, less saturated and pulled toward blue-green
    fjord.material.fragmentShader = fjord.material.fragmentShader.replace('float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );',
      'reflectionSample = mix(vec3(dot(reflectionSample, vec3(.299, .587, .114))), reflectionSample, .55) * vec3(.6, .74, .8);\n\t\t\t\t\tfloat theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );')
      .replace('sunColor * diffuseLight * 0.3', 'sunColor * diffuseLight * 0.025'); }   // no warm 'sun diffuse' on deep water: that read as brown mud
  else { const fN = tex(waterN, false, [260, 260]); fjord = new THREE.Mesh(new THREE.ShapeGeometry(fjordShape), new THREE.MeshStandardMaterial({ color: '#08161c', roughness: .22, metalness: 0, envMapIntensity: .2, normalMap: fN, normalScale: new THREE.Vector2(.5, .5) })); }
  fjord.rotation.x = -Math.PI / 2; fjord.position.set(0, POOL.y - .01, 0); L.add(fjord);
  // a car ferry working the fjord, decks lit (interpretation)
  const ferry = new THREE.Group(); { const hull = new THREE.MeshStandardMaterial({ color: '#1d2a35', roughness: .6 }), top = new THREE.MeshStandardMaterial({ color: '#e8e8e4', roughness: .6 }), lamp = new THREE.MeshBasicMaterial({ color: '#ffd59a', toneMapped: false });
    const m = (g, mat, x, y, z) => { const o = new THREE.Mesh(g, mat); o.position.set(x, y, z); ferry.add(o); };
    m(new THREE.BoxGeometry(2.0, .9, 10), hull, 0, .2, 0); m(new THREE.BoxGeometry(1.9, .7, 6.5), top, 0, 1.0, -.4); m(new THREE.BoxGeometry(1.4, .45, 2), top, 0, 1.55, -.9); m(new THREE.BoxGeometry(.2, .9, .2), hull, 0, 2.2, -.9);
    for (let i = 0; i < 9; i++) m(new THREE.BoxGeometry(.05, .05, .05), lamp, (i % 2 ? -1 : 1) * .96, 1.05, -3.2 + i * .75); }
  ferry.position.set(30, POOL.y, -300); L.add(ferry);
  // low cloud lying in the valleys
  const mists = [];
  { const mt = mistTex(51);
    for (let i = 0; i < (lite ? 4 : 10); i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, color: '#e9eef3', transparent: true, opacity: .5 + rand() * .25, depthWrite: false }));
      const south = i % 3 !== 2; sp.scale.set(south ? 300 + rand() * 360 : 500 + rand() * 400, south ? 40 + rand() * 50 : 30 + rand() * 20, 1);   // valley cloud in the fjord; in the east only far beyond, low
      sp.position.set(south ? -120 + rand() * 260 : 900 + rand() * 700, south ? 18 + rand() * 60 : -20 + rand() * 20, south ? -150 - rand() * 600 : (rand() < .5 ? -1 : 1) * (350 + rand() * 300)); sp.material.opacity *= south ? 1 : .3; L.add(sp); mists.push(sp); } }
  // Trees: four silhouettes per species, instanced. 1 : 10, so a 2–3 m model is a 20–30 m tree.
  const lean = g => { g.deleteAttribute('uv'); return g; };
  const conifer = (tiers, trunk = .4, sides = 5, skew = 0) => mergeGeometries(tiers.map(([r, h, y], i) => lean(new THREE.ConeGeometry(r, h, sides, 1).translate(skew * i * .03, y, 0).toNonIndexed()))
    .concat([lean(new THREE.CylinderGeometry(.04, .055, trunk, 4).translate(0, trunk / 2, 0).toNonIndexed())]));
  const crown = (parts, trunk = .6) => mergeGeometries(parts.map(([r, sx, sy, x, y]) => lean(new THREE.IcosahedronGeometry(r, 0).scale(sx, sy, sx).translate(x, y, 0).toNonIndexed()))
    .concat([lean(new THREE.CylinderGeometry(.028, .04, trunk, 4).translate(0, trunk / 2, 0).toNonIndexed())]));
  const SPRUCE = [conifer([[.34, 1.0, .62], [.27, .9, 1.18], [.19, .8, 1.72], [.1, .55, 2.18]]),          // tall and narrow
    conifer([[.52, .9, .5], [.4, .8, .95], [.26, .7, 1.36]], .35),                                          // broad
    conifer([[.28, .7, .42], [.19, .6, .78]], .25),                                                          // young
    conifer([[.36, .8, .7], [.3, .7, 1.2], [.16, .6, 1.62]], .75, 4, 1)];                                    // old, wind-bent, a bare trunk below
  // Birch: a pale trunk and several small leaf clumps, darker underneath (vertex colours; instances only vary brightness).
  const tint = (g, f) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) c.set(f(p.getX(i), p.getY(i), p.getZ(i)), i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const birchTree = (h, n, spread, seed, droop = 1) => { const r = rng(seed), parts = [];
    parts.push(tint(lean(new THREE.CylinderGeometry(.02, .034, h, 5).translate(0, h / 2, 0).toNonIndexed()), (x, y) => { const k = .34 + .05 * Math.sin(y * 31); return [k, k * .98, k * .93]; }));
    for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1), y = h * (.36 + .58 * t), rad = (.24 - .09 * t) * (.8 + r() * .4), a = r() * 6.283, off = spread * (1 - .6 * t) * (.4 + r() * .6), cy = y;
      parts.push(tint(lean(new THREE.IcosahedronGeometry(rad, 0).scale(1, .8 * droop, 1).translate(Math.cos(a) * off, cy, Math.sin(a) * off).toNonIndexed()),
        (x, yy) => { const u = Math.max(0, Math.min(1, (yy - cy + rad) / (2 * rad))); return [.04 + .06 * u, .075 + .1 * u, .028 + .03 * u]; })); }
    return mergeGeometries(parts); };
  const BIRCH = [birchTree(1.7, 9, .16, 11), birchTree(1.4, 8, .22, 12), birchTree(1.0, 5, .12, 13), birchTree(2.0, 10, .15, 14, 1.25)];

  let terrainReady = false;
  async function loadTerrain() {
    const base = NORSEMAN_TERRAIN.dir;
    const sites = await Promise.all(NORSEMAN_TERRAIN.sites.map(async id => { const [meta, buf] = await Promise.all([fetch(base + id + '.json').then(r => r.json()), fetch(base + id + '.bin').then(r => r.arrayBuffer())]); return { id, meta, heights: new Uint16Array(buf) }; }));
    for (const { id, meta, heights } of sites) {
      const v = VIEWS[id], view = { ...v.view }; if (view.e0 === null) view.e0 = terrainHeightAt(meta, heights, v.lat, v.lon);
      const g = terrainGeometry(meta, heights, { lat: v.lat, lon: v.lon, view, step: lite ? 3 : 1, sun: SUN_P });
      if (id === 'eidfjord') { const p = g.attributes.position, e = g.attributes.elev; for (let i = 0; i < p.count; i++) if (e.getX(i) < .6) p.setY(i, POOL.y - .6); p.needsUpdate = true; g.computeVertexNormals(); }   // the shore slopes gently under the water: no cliff seam
      const keep = id === 'eidfjord' ? keepSouth : keepEast, layer = id === 'eidfjord' ? 0 : 1;   // layer 1: not drawn in the fjord's mirror
      const t = new THREE.Mesh(g, terrainMaterial({ clippingPlanes: keep, snowline: v.snowline, treeline: v.treeline, time: TIME, sun: SUN_P, alpen: v.alpen, near: [view.x, view.z, id === 'eidfjord' ? NEAR.eid : NEAR.gau] })); t.layers.set(layer); L.add(t);
      // forest: stands, not singles. Cluster centres fall on gentle ground below a ragged treeline; each stand fills
      // its patch of grid with jittered trees whose density falls with height and slope. Beyond NEAR the terrain
      // shader's canopy band carries the forest.
      const pos = g.attributes.position, el = g.attributes.elev, nor = g.attributes.normal, lit = g.attributes.sunlit;
      const m = Math.round(Math.sqrt(pos.count)), near = id === 'eidfjord' ? NEAR.eid : NEAR.gau, vx = view.x, vz = view.z;
      const at = (fx, fy) => { const i = Math.min(m - 2, Math.max(0, Math.floor(fx))), j = Math.min(m - 2, Math.max(0, Math.floor(fy))), u = fx - i, w = fy - j, k = [j * m + i, j * m + i + 1, (j + 1) * m + i, (j + 1) * m + i + 1];
        const mix = attr => (attr.getX(k[0]) * (1 - u) + attr.getX(k[1]) * u) * (1 - w) + (attr.getX(k[2]) * (1 - u) + attr.getX(k[3]) * u) * w;
        const mixC = c => (pos.getComponent(k[0], c) * (1 - u) + pos.getComponent(k[1], c) * u) * (1 - w) + (pos.getComponent(k[2], c) * (1 - u) + pos.getComponent(k[3], c) * u) * w;
        return { x: mixC(0), y: mixC(1), z: mixC(2), e: mix(el), up: mix({ getX: q => nor.getY(q) }), lit: mix(lit) }; };
      const spr = [[], [], [], []], bir = [[], [], [], []], budget = Math.round((lite ? NEAR.liteTrees : NEAR.trees) * (id === 'eidfjord' ? 1 : .45));
      let placed = 0;
      for (let tries = 0; placed < budget && tries < 120000; tries++) {
        const cx = rand() * (m - 1), cy = rand() * (m - 1), c = at(cx, cy), d = Math.hypot(c.x - vx, c.z - vz);
        if (d < 14 || d > near || c.e < 2 || c.up < .6 || keep.some(pl => pl.distanceToPoint(V.set(c.x, 0, c.z)) < 0)) continue;
        const tl = v.treeline + (noise1(cx * .3, Math.floor(cy * .3)) - .5) * 160, dens = Math.pow(Math.max(0, 1 - c.e / tl), .7);
        if (rand() > dens) continue;
        const r = 1.0 + rand() * 2.4, n = Math.round(14 + rand() * 48 * dens);                                   // stand radius in grid cells
        const shore = c.e < 160 && id === 'eidfjord';
        for (let t = 0; t < n && placed < budget; t++) {
          const a = rand() * 6.283, q = Math.sqrt(rand()) * r, p = at(cx + Math.cos(a) * q, cy + Math.sin(a) * q);
          if (p.e < 2 || p.up < .56 || p.e > tl - rand() * 80 || keep.some(pl => pl.distanceToPoint(V.set(p.x, 0, p.z)) < 0)) continue;
          const isBirch = rand() < (shore ? .08 : .03), list = isBirch ? bir : spr;
          const hs = (1 - .45 * p.e / tl) * (.6 + rand() * .7);                                                  // smaller toward the treeline
          list[Math.floor(rand() * 4)].push([p.x, p.y, p.z, hs, p.lit]); placed++;
        }
      }
      { const band = id === 'eidfjord' ? [4, 260] : [v.treeline - 220, v.treeline + 20], want = Math.round((lite ? 450 : 1900) * (id === 'eidfjord' ? 1 : .6));
        let nb = 0;
        for (let tries = 0; nb < want && tries < 60000; tries++) {
          const cx = rand() * (m - 1), cy = rand() * (m - 1), c = at(cx, cy), d = Math.hypot(c.x - vx, c.z - vz);
          if (d < 14 || d > near || c.e < band[0] || c.e > band[1] || c.up < .66 || keep.some(pl => pl.distanceToPoint(V.set(c.x, 0, c.z)) < 0)) continue;
          const r = .5 + rand() * .9, n = 6 + Math.round(rand() * 12);
          for (let t = 0; t < n && nb < want; t++) { const a = rand() * 6.283, q = Math.sqrt(rand()) * r, p = at(cx + Math.cos(a) * q * 1.6, cy + Math.sin(a) * q);   // drifts: longer than wide
            if (p.e < band[0] - 2 || p.up < .6) continue; bir[Math.floor(rand() * 4)].push([p.x, p.y, p.z, .7 + rand() * .55, p.lit]); nb++; } } }
      const up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
      [[spr, SPRUCE, .4, .38, .034], [bir, BIRCH, 0, 0, 1]].forEach(([lists, geos, hue, sat, light], si) => lists.forEach((list, vi) => {
        if (!list.length) return;
        const tree = new THREE.InstancedMesh(geos[vi], withAerial(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95, clippingPlanes: keep, vertexColors: si === 1 })), list.length);
        list.forEach(([x, y, z, s, l], i) => { M4.compose(V.set(x, y - .1, z), Q.setFromAxisAngle(up, rand() * 6.283), S.set(s * (.85 + rand() * .3), s * (.85 + rand() * .45), s * (.85 + rand() * .3))); tree.setMatrixAt(i, M4);
          if (si === 1) { const k = (.75 + rand() * .45) * (.5 + .5 * l); tree.setColorAt(i, col.setRGB(k, k * (.96 + rand() * .08), k * .92)); }   // birch: brightness only; hue lives in the vertex colours
          else tree.setColorAt(i, col.setHSL(hue + (rand() - .5) * .05, sat + rand() * .12, (light + rand() * .03) * (.5 + .5 * l))); });
        tree.layers.set(layer); L.add(tree);
      }));
    }
    terrainReady = true; envDirty = 3;
  }

  // ------------------------------------------------------------ bikes: KONA.m atlas road-triathlon study, instanced ×2 (trainer, stand)
  const bikeSpot = { kind: 'beast', pos: new THREE.Vector3(trainerAt[0], 0, trainerAt[2]), rotY: Math.PI / 2, bike: null };
  const arrivalShot = () => decor.shots[coarse && innerHeight > innerWidth ? 'heroPortrait' : 'hero'];
  Object.defineProperties(bikeSpot, {
    view: { get() { const s = arrivalShot(); return new THREE.Vector3(s[0], 0, s[1]); } },
    face: { get() { const s = arrivalShot(); return new THREE.Vector3(s[3], s[4], s[5]); } },
  });
  const BIKE_COL = ['#24384a', '#c9ced3'];
  [trainerAt, standAt].forEach(([x, y, z], i) => { const pb = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, .7), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); pb.position.set(x, y + .6, z); group.add(pb);
    info(pb, { model: act => bikeCard(act), eyebrow: i ? 'BIKE · THE WORK STAND' : 'BIKE · THE CLIMBING TRAINER', title: i ? 'Gearing for the climbs.' : 'The long ride, indoors.', sub: 'KONA.m road-triathlon study · unbranded', text: 'Not any athlete’s or brand’s bike.' }); });
  bikeSpot.info = infos.find(r => r.eyebrow === 'BIKE · THE CLIMBING TRAINER');
  const decorHooks = {
    materialFor(item, src, name) {
      let m;
      if (item.kind === 'glb') { m = src.clone(); if (item.tint) m.color?.multiplyScalar(item.tint); m.envMapIntensity = .35; return E(m); }
      if (/paint|disc_face/.test(name)) m = new THREE.MeshPhysicalMaterial({ name, color: '#ffffff', roughness: .32, metalness: .3, clearcoat: 1, clearcoatRoughness: .05 });
      else if (/carbon|rim/.test(name)) m = new THREE.MeshPhysicalMaterial({ name, color: '#0f1013', roughness: .34, metalness: .25, clearcoat: .9, clearcoatRoughness: .1 });
      else if (/rubber/.test(name)) m = new THREE.MeshPhysicalMaterial({ name, color: '#151515', roughness: .86, sheen: .35, sheenRoughness: .7, sheenColor: new THREE.Color('#3a3a3a') });
      else if (/saddle|tape/.test(name)) m = new THREE.MeshPhysicalMaterial({ name, color: '#121212', roughness: .7, sheen: .5, sheenColor: new THREE.Color('#444') });
      else if (/chrome/.test(name)) m = new THREE.MeshStandardMaterial({ name, color: '#d9dce0', roughness: .1, metalness: 1 });
      else m = new THREE.MeshStandardMaterial({ name, color: /steel/.test(name) ? '#a7acb2' : '#7d838a', roughness: /steel/.test(name) ? .28 : .34, metalness: 1 });
      E(m); m.envMapIntensity = 1; return m;
    },
    colors(item) { return item.kind === 'bike' ? (i, name) => new THREE.Color(/paint|disc_face/.test(name) ? BIKE_COL[i] : '#ffffff') : null; },
    placed(item, { info: b }) {
      envDirty = 2;
      if (item.id === 'hill-treadmill') { treadStand.visible = false; return; }
      if (item.kind !== 'bike') return;
      bikeSpot.bike = group;
      const [x, y, z] = trainerAt, rot = v => new THREE.Vector3(v.z, v.y, -v.x), rear = rot(b.rear), front = rot(b.front);   // yaw 90: bike forward = +x
      const ax = x + rear.x, az = z + rear.z, ay = y + rear.y;
      for (const s of [-1, 1]) { put(steel, new THREE.CylinderGeometry(.018, .018, .62, 10), ax, .26, az + s * .1, 0, 0, s * .55); put(steel, new THREE.CylinderGeometry(.012, .012, ay - .06, 8), ax, (ay + .06) / 2, az + s * .085); }
      put(steel, new THREE.CylinderGeometry(.075, .075, .07, 28), ax - .36, .135, az, Math.PI / 2, 0, 0);
      put(new THREE.MeshStandardMaterial({ color: '#16181b', roughness: .7 }), new RoundedBoxGeometry(.34, y - .06, .26, 2, .02), x + front.x, .06 + (y - .06) / 2, z + front.z);
      flush(true);
    },
  };

  // ------------------------------------------------------------ local reflections
  let envDirty = 1;
  const envCap = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(21, 1.8, -10), lite, mats: envMats, hidePoints: true });

  // ------------------------------------------------------------ cards
  const disclaimer = { cls: 'G', text: 'An independent KONA.m concept inspired by the Norseman Xtreme Triathlon. Not affiliated with, endorsed by or sponsored by the race or its organisers. No official logo, mark or photography is used.' };
  const terrainNote = { cls: 'P', text: 'Window terrain heights: Terrain Tiles (Mapzen/Tilezen, AWS Open Data); Norway terrain data © Kartverket, CC BY 4.0.' };
  const interp = text => ({ cls: 'I', text });
  const back = act => ({ label: 'Back to the room', primary: true, onClick: () => act.close() });
  const card = (eyebrow, title, kicker, lede, list, act, more = []) => ({ kind: 'beast', eyebrow, title, kicker, lede, facts: [...list, disclaimer], actions: [back(act), ...more] });
  const nav = act => [{ label: 'Swim →', onClick: () => ctx.renderCard?.(swimCard(act)) }, { label: 'Bike →', onClick: () => ctx.renderCard?.(bikeCard(act)) }, { label: 'Run →', onClick: () => ctx.renderCard?.(runCard(act)) }];
  function focus(name, act) {
    const shot = decor.shots[name];
    act.close();
    ctx.focusRoom?.({ x: shot[0], z: shot[1], target: { x: shot[3], y: shot[4], z: shot[5] } });
  }
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'AN INDEPENDENT ROOM · FJORD TO SUMMIT', title: 'Train for the fjord and the mountain.', kicker: 'Cold water · long climbs · a run that ends uphill',
      lede: 'A cold fjord. A long climb. A mountain finish. The room turns the journey into a place to explore: water at the window, a route carved in stone, and bikes ready for the climb.',
      facts: [fact('start'), fact('field'), interp('The ridge is drawn from sourced anchor heights; the shape between them and the horizontal spacing are KONA.m interpretation.'), terrainNote, disclaimer],
      actions: [{ label: 'By the water', primary: true, onClick: () => focus('fjord', act) }, { label: 'Along the climb', onClick: () => focus('spine', act) }, { label: 'Toward the summit', onClick: () => focus('mountain', act) }, { label: 'About the landscape', onClick: () => ctx.renderCard?.(windowCard(act)) }] };
  }
  function windowCard(act) {
    return card('THE WINDOWS', 'Two real places, one room.', 'Eidfjord to the south · Gaustatoppen to the east · 1 : 10',
      'Through the south glass: the head of the Hardangerfjord at Eidfjord, where the swim comes ashore, seen from the water. Through the east glass: Gaustatoppen from about 2.5 km to the west-south-west, where the run ends. The shapes of the land are real elevation data, built at one tenth scale.',
      [fact('start'), fact('summit'), terrainNote, interp('Shading, snow, forest, mist, the sun and the ferry are painted by KONA.m code. The two views are arranged around one room: the real distance between them, and the sun’s true position, are not shown.')], act, nav(act));
  }
  function swimCard(act) {
    return card('SWIM · THE COLD', 'It starts with a jump.', 'Ferry ramp · 3.8 km · cold water', 'The pool runs out toward the fjord at the fjord’s own waterline. Train the cold as well as the distance: a wetsuit you have swum in, two caps, socks and gloves where the rules allow, and a plan for the first minutes in cold water.',
      [fact('start'), fact('swim'), fact('water'), interp('The pool, the ramp, the kit list and the advice to practise cold-water starts are KONA.m interpretation, not race rules or coaching.')], act, nav(act).slice(1));
  }
  function bikeCard(act) {
    return card('BIKE · THE CLIMBS', 'Climb, recover, climb.', '180 km · a long climb first, then the plateau', 'Training here is long rides with long climbs in them, and learning to eat and stay warm on the bike. The bike on the trainer and the one on the stand are KONA.m road-triathlon studies with a fjord-slate and a granite finish.',
      [fact('bike'), fact('bike_climbing'), fact('t2'), interp('The session on the screen is a KONA.m example, not coaching advice and not anyone’s data. The bikes are unbranded atlas studies, not any athlete’s or brand’s equipment.')], act, [nav(act)[0], nav(act)[2]]);
  }
  function runCard(act) {
    return card('RUN · THE MOUNTAIN', 'Long and flat, then up.', '42.2 km · the climb begins around 25 km', 'Two runs in one: a long flat one, then a climb where most people walk. Train both: easy running when tired, then hill repeats and fast walking with a pack. The treadmill faces the real mountain.',
      [fact('run'), fact('cut'), fact('summit'), interp('The treadmill is the Beast Cave’s generated study, reused. The session on the screen is a KONA.m example, not coaching advice.')], act, nav(act).slice(0, 2));
  }
  function crewCard(act) {
    return card('THE CREW · THE BACKPACK', 'Nobody does this alone.', 'Crew table · layers · the summit pack', 'The race is unsupported: your crew drives the course with your food, drink and warm clothes, and climbs the last part with you. Train with them too: who hands what, where, and when.',
      [fact('crew'), fact('backpack'), interp('The table, the crate labels and the layers are KONA.m set dressing, not a mandatory kit list.')], act);
  }
  function weekCard(act) {
    return card('THE ROUTINE · AN EXAMPLE', 'A week built around the climb.', 'Cold swim · hill run · long ride with climbs · ride then run', 'One way a week can lean toward this course: cold water, climbing on the bike, running uphill off the bike, and a real rest day. An example to read, not a plan to follow.',
      [interp('Entirely KONA.m editorial. Not coaching, medical or training advice; build any plan with a qualified coach.')], act);
  }
  function saunaCard(act) {
    return card('RECOVERY · HEAT AND COLD', 'Heat, then the cold pool.', 'A sauna beside the cold water', 'Many Nordic athletes move between heat and cold. Here the sauna sits a few steps from the cold pool and the fjord glass. A KONA.m interpretation of the setting, not a protocol.',
      [interp('The sauna is set dressing. It is not a race requirement, a training protocol or medical advice; heat and cold exposure carry risks — ask a qualified professional.')], act);
  }
  function topsCard(act) {
    return card('THE FINISH', 'Black at the top. White below.', 'Same distance, two finishes', 'The course splits late in the run. The tops in the niche are plain KONA.m studies in the two colours, with no marks.', [fact('cut'), fact('shirts')], act);
  }
  function profileCard(leg, act) {
    const lines = leg === 'bike' ? [fact('bike'), fact('bike_climbing'), fact('t2')] : [fact('run'), fact('cut'), fact('summit')];
    return card(`THE PROFILE · ${leg.toUpperCase()}`, leg === 'bike' ? '180 km over the plateau.' : '42.2 km, then up.', 'Anchor heights sourced · the line between them drawn',
      `${facts.profile.rule} Pins on the ridge mark the anchors; each label says what it measures. The swim is the pool beside it.`, [...lines, interp('Vertical scale: 1,880 m = 1.65 m of stone. Horizontal: each leg gets its own stretch of the hall, so the run looks longer than it is next to the bike.')], act, nav(act));
  }

  return {
    group, floor, sign, bikeSpot, infos, mood: NORSEMAN_MOOD, ownBikes: true, introCard,
    async useAssets(loader) {
      if (this._assets) return; this._assets = true;
      const terrain = loadTerrain();
      // bikes, fan, treadmill from world/konam/rooms/norseman-training.decor.json. This bike study has no bike-lite.glb,
      // so bikes always load the full (172 KB) study; everything else follows the device's lite policy.
      const split = bike => ({ ...decor, items: decor.items.filter(d => (d.kind === 'bike') === bike) });
      await loadDecor(split(true), { group, loader, lite: false, hooks: decorHooks });
      await loadDecor(split(false), { group, loader, lite, hooks: decorHooks });
      await terrain;
    },
    setBike() { /* this room mounts its own instanced bikes in useAssets */ },
    get terrainReady() { return terrainReady; },
    get landscape() { return { scene: L, portal, fjord }; },         // inspection and evidence tooling
    update(t, reduce, dt = 1 / 60) {
      portal.frame();
      if (envDirty) { envDirty--; if (!envDirty) portal.capture(() => envCap.capture()); else if (envDirty === 1 && !envCap.texture) { portal.capture(() => envCap.capture()); envDirty = 0; } }
      const tt = reduce ? 0 : t;
      strata.t.value = tt; caust.t.value = tt;
      nTex.offset.set(tt * .012, tt * .007); nTex2.offset.set(-tt * .009, tt * .011); TIME.value = tt;
      { const sec = reduce ? 0 : (Date.now() / 1000) % 60; paceHand.rotation.z = -sec / 60 * Math.PI * 2; paceSlow.rotation.z = -((Date.now() / 60000) % 60) / 60 * Math.PI * 2; }
      if (fjord.material.uniforms?.time) fjord.material.uniforms.time.value = tt * .35;
      ferry.position.z = -470 + Math.sin(tt * .006) * 230; ferry.rotation.y = Math.cos(tt * .006) > 0 ? Math.PI : 0;
      if (!reduce) { vapour.step(t); dust.step(t); mists.forEach((m, i) => { m.position.x += Math.sin(t * .05 + i) * .02; }); }
      return { power: 0, heat: 0, riding: false };
    },
  };
}
