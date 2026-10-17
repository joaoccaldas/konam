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
import { createTerrainPortal, terrainGeometry, terrainHeightAt, terrainMaterial } from './engine/terrain-portal.js';
import { motes, lightShaft, mistTex } from './roomkit.js';

export const NORSEMAN_MOOD = Object.freeze({ exposure: 1.0, hemi: .22, sun: .0, fog: { near: 34, far: 150 }, fogColor: new THREE.Color('#aab4be') });
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
const SUMMIT_M = facts.facts.summit.value_m, VSCALE = 2.6 / SUMMIT_M, BASE = .14;    // 1,880 m → 2.6 m of stone
const yOf = m => BASE + m * VSCALE;
const xOf = (leg, km) => LEGS[leg].x0 + (LEGS[leg].x1 - LEGS[leg].x0) * km / LEGS[leg].km;
const heightAt = (leg, km) => { const p = LEGS[leg].pts; for (let i = 1; i < p.length; i++) if (km <= p[i][0]) { const [k0, m0] = p[i - 1], [k1, m1] = p[i]; return m0 + (m1 - m0) * (km - k0) / Math.max(1e-6, k1 - k0); } return p[p.length - 1][1]; };

// The two real views. Each viewpoint (lat/lon) is placed on a room point; map bearing `bearing` points out of its window.
const VIEWS = {
  eidfjord: { lat: 60.4660, lon: 7.0625, view: { x: 19.6, z: -11.0, y0: -.12, e0: 0, k: .1, bearing: 272, fwd: [0, -1], right: [-1, 0] }, snowline: 1450, treeline: 780 },
  gaustatoppen: { lat: 59.82677, lon: 8.6489, view: { x: 21.0, z: -9.4, y0: -.3, e0: null, k: .1, bearing: 0, fwd: [1, 0], right: [0, 1] }, snowline: 1700, treeline: 960 },
};

export function buildNorsemanTraining(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);        // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2, H = 8.4;
  const SZ = -12.0;                                                     // the ridge's centre line
  const SOUTH = { x0: 8.3, x1: 30.4 }, EAST = { z0: -14.2, z1: -4.6 }, POOL = { x0: 9.1, x1: 30.2, z0: R.z1 + .04, z1: -15.3, y: -.12 };
  const SUN = new THREE.Vector3(1, .2, .55).normalize();               // toward the sun: low, through the east glass
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
  const floorMat = E(new THREE.MeshPhysicalMaterial({ map: tex(concreteC, true, [1, 1]), roughnessMap: tex(concreteR, false, [1, 1]), color: '#ffffff', roughness: .55, metalness: 0, clearcoat: .35, clearcoatRoughness: .3, envMapIntensity: .55 }));
  const wallConcrete = new THREE.MeshStandardMaterial({ map: tex(concreteC, true, [RW / 4, H / 4]), color: '#a7a39d', roughness: .88, envMapIntensity: .3 });
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
  for (let x = 9.4; x < R.x1 - .5; x += 3.2) { box(glulam, .24, .78, RD, x, H - .39, CZ); box(ledWarm, .05, .015, RD - 1.2, x, H - .785, CZ); }
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
  put(glass, new THREE.PlaneGeometry(SOUTH.x1 - SOUTH.x0, H - .7), (SOUTH.x0 + SOUTH.x1) / 2, (H - .7) / 2, R.z1 + .06);
  put(glass, new THREE.PlaneGeometry(EAST.z1 - EAST.z0, H - .7), R.x1 - .06, (H - .7) / 2, (EAST.z0 + EAST.z1) / 2, 0, -Math.PI / 2, 0);
  for (let i = 0, n = 8; i <= n; i++) { const x = SOUTH.x0 + (SOUTH.x1 - SOUTH.x0) * i / n; box(glulam, .12, H - .7 - POOL.y, .26, x, (H - .7 + POOL.y) / 2, R.z1 + .1); }
  for (let i = 0, n = 4; i <= n; i++) { const z = EAST.z0 + (EAST.z1 - EAST.z0) * i / n; box(glulam, .26, H - .7, .12, R.x1 - .1, (H - .7) / 2, z); }
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

  // ------------------------------------------------------------ the ridge: the course profile, sculpted in stone
  // Cross-sections sweep from base to crest; the crest follows the profile, the flanks are broken by noise like weathered rock.
  const strata = { t: { value: 0 } };
  const ridgeMat = E(new THREE.MeshStandardMaterial({ color: '#5a5d61', roughness: .8, metalness: .02, bumpMap: graniteBump, bumpScale: 1.4, envMapIntensity: .45 }));
  ridgeMat.onBeforeCompile = sh => {
    sh.uniforms.uT = strata.t;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform float uT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float m = (vW.y - ${BASE.toFixed(3)}) / ${VSCALE.toFixed(6)};
        float line = smoothstep(.9, 0., abs(mod(m + 100., 200.) - 100.) / 1.4) * step(20., m);
        float warm = smoothstep(${LEGS.bike.x0.toFixed(1)}, ${LEGS.run.x1.toFixed(1)}, vW.x);
        diffuseColor.rgb *= .82 + .18 * smoothstep(0., 2.6, vW.y);
        totalEmissiveRadiance += mix(vec3(.4,.65,1.), vec3(1.,.66,.34), warm) * line * .3; }`);
  };
  ridgeMat.customProgramCacheKey = () => 'norseman-strata';
  const ridgeGeo = leg => {
    const L = LEGS[leg], N = 160, M = 14, wB = 1.45, wT = .36, pos = [], uv = [], idx = [], crest = [];
    const total = L.x1 - L.x0 + (L.back || 0);
    for (let i = 0; i <= N; i++) {
      const xx = L.x0 + total * i / N, km = Math.min(L.km, (xx - L.x0) / (L.x1 - L.x0) * L.km);
      let y = yOf(heightAt(leg, km)); if (xx > L.x1) { const u = (xx - L.x1) / L.back; y = y * (1 - Math.pow(u, 2.2)); }
      y = Math.max(.02, y); crest.push(new THREE.Vector3(xx, y + .015, SZ));
      for (let j = 0; j <= M; j++) { const a = j / M * Math.PI, sa = Math.sin(a), wHere = wT + (wB - wT) * (1 - Math.pow(sa, .55));
        const rough = (noise1(xx * 2.3 + j * 1.7, j) - .5) * .09 * sa + (noise1(xx * 9.1, j * 3) - .5) * .025;
        pos.push(xx + (noise1(j * 5 + xx * 3, 7) - .5) * .03, y * Math.pow(sa, .3), SZ - Math.cos(a) * (wHere / 2 + rough)); uv.push(xx / 1.5, j / M * 1.2); }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    for (const i of [0, N]) { const c = pos.length / 3, x = pos[i * (M + 1) * 3]; pos.push(x, 0, SZ); uv.push(0, 0); for (let j = 0; j < M; j++) { const a = i * (M + 1) + j; idx.push(...(i ? [c, a, a + 1] : [c, a + 1, a])); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return { g, crest };
  };
  const crests = [];
  for (const leg of ['bike', 'run']) { const { g, crest } = ridgeGeo(leg), m = new THREE.Mesh(g, ridgeMat); m.castShadow = !lite; m.receiveShadow = true; group.add(m); crests.push(crest);
    info(m, { model: act => profileCard(leg, act), eyebrow: leg === 'bike' ? 'THE PROFILE · BIKE' : 'THE PROFILE · RUN', title: leg === 'bike' ? '180 km over the plateau.' : '42.2 km, then up.', sub: 'Anchors sourced · line between them interpreted', text: 'Tap for what is fact and what is drawn.' });
    obstacles.push({ box: [LEGS[leg].x0 - .15, LEGS[leg].x1 + (LEGS[leg].back || 0) + .15, SZ - .75, SZ + .75] }); }
  box(granite, LEGS.run.x1 + LEGS.run.back - LEGS.bike.x0 + .4, .05, 1.6, (LEGS.bike.x0 + LEGS.run.x1 + LEGS.run.back) / 2, .025, SZ);      // a low granite plinth under the ridge
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
    for (const s of [-1, 1]) { const lab = lettering(1.5, .3, g => { g.fillStyle = 'rgba(236,240,245,.92)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.012px'; g.fillText(a.label, .02, .13);
        g.fillStyle = 'rgba(236,240,245,.5)'; g.font = `500 .052px ${FONT}`; g.fillText(`${a.leg.toUpperCase()} · KM ${a.km}`, .02, .22); }, 1024);
      lab.rotation.y = s > 0 ? 0 : Math.PI; lab.position.set(x + s * .75, top + .68, SZ + s * .02); group.add(lab); }
  });
  for (const [leg, text] of [['bike', 'BIKE · 180 KM'], ['run', 'RUN · 42.2 KM']]) { const L = LEGS[leg];
    for (const s of [-1, 1]) { const t = lettering(2.4, .2, g => { g.fillStyle = 'rgba(232,238,245,.75)'; g.font = `700 .1px ${FONT}`; g.letterSpacing = '.03px'; g.fillText(text, .02, .14); }, 1024);
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
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.36, .18, .26), crate); b.position.set(crew.x - .3 + i * .2, .98 + (i === 1 ? .18 : 0), crew.z + (i === 1 ? 0 : .04 * i)); b.rotation.y = (i - 1) * .12; b.castShadow = !lite; group.add(b); }
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
  const sun = new THREE.DirectionalLight('#ffcf9c', lite ? 1.6 : 3.4);
  sun.target.position.set(24, 0, -10); sun.position.copy(sun.target.position).addScaledVector(SUN, 40); group.add(sun, sun.target);
  if (!lite) { sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 12; sc.bottom = -12; sc.near = 5; sc.far = 80; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; }
  const skyS = new THREE.RectAreaLight('#a9c4e6', lite ? 3.2 : 2.6, SOUTH.x1 - SOUTH.x0, 5); skyS.position.set((SOUTH.x0 + SOUTH.x1) / 2, 3.4, R.z1 + .2); skyS.lookAt((SOUTH.x0 + SOUTH.x1) / 2, 1.8, R.z0); group.add(skyS);
  const skyE = new THREE.RectAreaLight('#ffd9b4', lite ? 2.6 : 1.8, EAST.z1 - EAST.z0, 5); skyE.position.set(R.x1 - .2, 3.4, (EAST.z0 + EAST.z1) / 2); skyE.lookAt(R.x0, 1.8, (EAST.z0 + EAST.z1) / 2); group.add(skyE);
  const skyTop = new THREE.RectAreaLight('#c7d8ee', lite ? 2.2 : 1.6, SKY.x1 - SKY.x0, 1.2); skyTop.position.set((SKY.x0 + SKY.x1) / 2, H - .05, SZ); skyTop.lookAt((SKY.x0 + SKY.x1) / 2, 0, SZ); group.add(skyTop);
  const fill = new THREE.PointLight('#d8d2c8', lite ? 3 : 2, 30, 1.2); fill.position.set(18, H - 1.2, -7); group.add(fill);
  const spots = [[rackX, R.z0 - 1, '#f2ead8'], [21.1, R.z0 - 1.4, '#fff1dc'], ...(lite ? [] : [[crew.x, crew.z, '#fff1dc'], [32.35, R.z0 - 1.1, '#ffd9b0'], [trainerAt[0], trainerAt[2], '#f0f2ff']])];
  spots.forEach(([x, z, col]) => { const s = new THREE.SpotLight(col, lite ? 30 : 40, 9, .45, .6, 1.3); s.position.set(x, H - .9, z); s.target.position.set(x, .8, z); group.add(s, s.target); });
  if (!lite) for (const z of [-12.5, -9.6, -6.8]) { const shaft = lightShaft({ top: .9, bottom: 2.2, height: 16, color: '#ffd9a8', opacity: .045 });
    shaft.position.set(R.x1 - .2, 4.6, z); shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN); group.add(shaft); }

  // ------------------------------------------------------------ the landscape behind the glass (portal scene)
  const L = portal.scene;
  const SUN_P = new THREE.Vector3(.5, .2, .85).normalize();                // low, from the right of the mountain: side light on its face
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: SUN_P } },
    vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader: `uniform vec3 sun;varying vec3 vD;void main(){float h=max(vD.y,0.);float s=max(dot(vD,sun),0.);
      vec3 zen=vec3(.13,.24,.42),hor=vec3(.66,.74,.84),warm=vec3(1.,.72,.48);
      vec3 c=mix(hor,zen,pow(h,.45));c=mix(c,warm,pow(s,6.)*(1.-h)*.85);c+=vec3(1.,.85,.6)*pow(s,900.)*8.+vec3(1.,.7,.45)*pow(s,40.)*.35;
      c=mix(c,vec3(.35,.4,.45),smoothstep(0.,-.2,vD.y));gl_FragColor=vec4(c,1.);}` });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(5200, 32, 16), skyMat); skyDome.frustumCulled = false; skyDome.renderOrder = -1; L.add(skyDome);
  L.fog = new THREE.FogExp2('#aebbc6', lite ? .0004 : .00032);
  L.add(new THREE.HemisphereLight('#b9cde6', '#3a3326', .65));
  const pSun = new THREE.DirectionalLight('#ffd6a8', 4.2); pSun.target.position.set(200, 0, -200); pSun.position.copy(SUN_P).multiplyScalar(2000).add(pSun.target.position); L.add(pSun, pSun.target);
  if (!lite) { pSun.castShadow = true; const sc = pSun.shadow.camera; sc.left = -1700; sc.right = 1700; sc.top = 1700; sc.bottom = -1700; sc.near = 100; sc.far = 4500; pSun.shadow.mapSize.set(4096, 4096); pSun.shadow.bias = -.0006; pSun.shadow.normalBias = 2; }
  const keepSouth = [new THREE.Plane(new THREE.Vector3(0, 0, -1), R.z1 - .05), new THREE.Plane(new THREE.Vector3(-1, 0, -1).normalize(), (R.x1 + R.z1) / Math.SQRT2)];
  const keepEast = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -(R.x1 - .05)), new THREE.Plane(new THREE.Vector3(1, 0, 1).normalize(), -(R.x1 + R.z1) / Math.SQRT2)];
  // the fjord: one sheet of cold water at the pool's own level, reflecting the sky
  const fjordN = tex(waterN, false, [260, 260]);
  const fjord = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: '#08161c', roughness: .22, metalness: 0, envMapIntensity: .12, normalMap: fjordN, normalScale: new THREE.Vector2(.5, .5), clippingPlanes: keepSouth }));
  fjord.rotation.x = -Math.PI / 2; fjord.position.set(0, POOL.y - .01, 0); fjord.receiveShadow = !lite; L.add(fjord);
  if (renderer) { const pm = new THREE.PMREMGenerator(renderer), sk = new THREE.Scene(); sk.add(new THREE.Mesh(skyDome.geometry, skyMat)); L.environment = pm.fromScene(sk, 0, 1, 6000).texture; L.environmentIntensity = .45; pm.dispose(); }
  // a car ferry far down the fjord, decks lit for the start (interpretation)
  const ferry = new THREE.Group(); { const hull = new THREE.MeshStandardMaterial({ color: '#1d2a35', roughness: .6 }), top = new THREE.MeshStandardMaterial({ color: '#e8e8e4', roughness: .6 }), lamp = new THREE.MeshBasicMaterial({ color: '#ffd59a', toneMapped: false });
    const m = (g, mat, x, y, z) => { const o = new THREE.Mesh(g, mat); o.position.set(x, y, z); ferry.add(o); };
    m(new THREE.BoxGeometry(2.0, .9, 10), hull, 0, .2, 0); m(new THREE.BoxGeometry(1.9, .7, 6.5), top, 0, 1.0, -.4); m(new THREE.BoxGeometry(1.4, .45, 2), top, 0, 1.55, -.9); m(new THREE.BoxGeometry(.2, .9, .2), hull, 0, 2.2, -.9);
    for (let i = 0; i < 9; i++) m(new THREE.BoxGeometry(.05, .05, .05), lamp, (i % 2 ? -1 : 1) * .96, 1.05, -3.2 + i * .75); }
  ferry.position.set(26, POOL.y, -260); ferry.rotation.y = .1; L.add(ferry);
  const mists = [];
  { const mt = mistTex(51); mt.repeat.set(1, 1);
    for (let i = 0; i < (lite ? 3 : 6); i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, color: '#e6ecf2', transparent: true, opacity: .55, depthWrite: false }));
      sp.scale.set(420 + rand() * 300, 70 + rand() * 40, 1); const south = i % 2 === 0; sp.position.set(south ? -60 + rand() * 160 : 300 + rand() * 400, 25 + rand() * 50, south ? -200 - rand() * 500 : -120 + rand() * 260); L.add(sp); mists.push(sp); } }
  let terrainReady = false;
  async function loadTerrain() {
    const base = NORSEMAN_TERRAIN.dir;
    const sites = await Promise.all(NORSEMAN_TERRAIN.sites.map(async id => { const [meta, buf] = await Promise.all([fetch(base + id + '.json').then(r => r.json()), fetch(base + id + '.bin').then(r => r.arrayBuffer())]); return { id, meta, heights: new Uint16Array(buf) }; }));
    for (const { id, meta, heights } of sites) {
      const v = VIEWS[id], view = { ...v.view }; if (view.e0 === null) view.e0 = terrainHeightAt(meta, heights, v.lat, v.lon);
      const g = terrainGeometry(meta, heights, { lat: v.lat, lon: v.lon, view, step: lite ? 2 : 1 });
      if (id === 'eidfjord') { const p = g.attributes.position, e = g.attributes.elev; for (let i = 0; i < p.count; i++) if (e.getX(i) < .6) p.setY(i, POOL.y - 3); p.needsUpdate = true; g.computeVertexNormals(); }
      const keep = id === 'eidfjord' ? keepSouth : keepEast;
      const t = new THREE.Mesh(g, terrainMaterial({ clippingPlanes: keep, snowline: v.snowline, treeline: v.treeline })); t.castShadow = t.receiveShadow = !lite; L.add(t);
      // forest: instanced conifers on gentle ground below the treeline, within a few hundred metres of the glass (1 : 10)
      const pos = g.attributes.position, el = g.attributes.elev, nor = g.attributes.normal, want = lite ? 1400 : 5200, at = [];
      for (let tries = 0; at.length < want && tries < want * 40; tries++) { const i = Math.floor(rand() * pos.count), e = el.getX(i);
        if (e < 8 || e > v.treeline - 60 - rand() * 160 || nor.getY(i) < .82) continue; const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x - 21, z + 11);
        if (d < 20 || d > 900 || keep.some(pl => pl.distanceToPoint(V.set(x, 0, z)) < 0)) continue; at.push([x + (rand() - .5) * 6, pos.getY(i), z + (rand() - .5) * 6, .7 + rand() * .8]); }
      const tree = new THREE.InstancedMesh(new THREE.ConeGeometry(.42, 1.8, 6).translate(0, .9, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95, clippingPlanes: keep }), at.length);
      const up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
      at.forEach(([x, y, z, s], k) => { M4.compose(V.set(x, y - .1, z), Q.setFromAxisAngle(up, rand() * 6), S.set(s, s * (.9 + rand() * .5), s)); tree.setMatrixAt(k, M4); tree.setColorAt(k, col.setHSL(.28 + rand() * .06, .35, .07 + rand() * .05)); });
      tree.castShadow = !lite; tree.receiveShadow = !lite; L.add(tree);
    }
    terrainReady = true; portal.shadows(2); envDirty = 2;
  }

  // ------------------------------------------------------------ bikes: KONA.m atlas road-triathlon study, instanced ×2 (trainer, stand)
  const bikeSpot = { kind: 'beast', pos: new THREE.Vector3(trainerAt[0], 0, trainerAt[2]), rotY: Math.PI / 2, bike: null };
  const portrait = coarse && innerHeight > innerWidth;
  bikeSpot.view = portrait ? new THREE.Vector3(10.4, 0, -9.4) : new THREE.Vector3(9.2, 0, -9.0);    // just inside the door: the ridge, the pool, both windows
  bikeSpot.face = new THREE.Vector3(30, 1.6, -13.2);
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
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'AN INDEPENDENT ROOM · FJORD TO SUMMIT', title: 'Train for the fjord and the mountain.', kicker: 'Cold water · long climbs · a run that ends uphill',
      lede: 'A training hall between two real places: the head of the Hardangerfjord through the south glass, Gaustatoppen through the east. A cold lap pool runs out toward the fjord; the stone ridge down the middle is the course profile, climbing to a summit against the mountain. Around it, what you practise for each leg, and the people and kit that get you there.',
      facts: [fact('start'), fact('field'), interp('The ridge is drawn from sourced anchor heights; the shape between them and the horizontal spacing are KONA.m interpretation.'), terrainNote, disclaimer],
      actions: [{ label: 'Walk the profile →', primary: true, onClick: () => act.close() }, { label: 'The windows', onClick: () => ctx.renderCard?.(windowCard(act)) }, ...nav(act)] };
  }
  function windowCard(act) {
    return card('THE WINDOWS', 'Two real places, one room.', 'Eidfjord to the south · Gaustatoppen to the east · 1 : 10',
      'Through the south glass: the head of the Hardangerfjord at Eidfjord, where the swim comes ashore, seen from the water. Through the east glass: Gaustatoppen from about 3 km to the south, where the run ends. The shapes of the land are real elevation data, built at one tenth scale.',
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
  function topsCard(act) {
    return card('THE FINISH', 'Black at the top. White below.', 'Same distance, two finishes', 'The course splits late in the run. The tops in the niche are plain KONA.m studies in the two colours, with no marks.', [fact('cut'), fact('shirts')], act);
  }
  function profileCard(leg, act) {
    const lines = leg === 'bike' ? [fact('bike'), fact('bike_climbing'), fact('t2')] : [fact('run'), fact('cut'), fact('summit')];
    return card(`THE PROFILE · ${leg.toUpperCase()}`, leg === 'bike' ? '180 km over the plateau.' : '42.2 km, then up.', 'Anchor heights sourced · the line between them drawn',
      `${facts.profile.rule} Pins on the ridge mark the anchors; each label says what it measures. The swim is the pool beside it.`, [...lines, interp('Vertical scale: 1,880 m = 2.6 m of stone. Horizontal: each leg gets its own stretch of the hall, so the run looks longer than it is next to the bike.')], act, nav(act));
  }

  return {
    group, floor, sign, bikeSpot, infos, mood: NORSEMAN_MOOD, ownBikes: true, introCard,
    async useAssets(loader) {
      if (this._assets) return; this._assets = true;
      loadTerrain().catch(e => console.warn('norseman terrain', e?.message || e));
      // bikes, fan, treadmill from world/konam/rooms/norseman-training.decor.json. This bike study has no bike-lite.glb,
      // so bikes always load the full (172 KB) study; everything else follows the device's lite policy.
      const split = bike => ({ ...decor, items: decor.items.filter(d => (d.kind === 'bike') === bike) });
      await loadDecor(split(true), { group, loader, lite: false, hooks: decorHooks });
      await loadDecor(split(false), { group, loader, lite, hooks: decorHooks });
    },
    setBike() { /* this room mounts its own instanced bikes in useAssets */ },
    get terrainReady() { return terrainReady; },
    update(t, reduce, dt = 1 / 60) {
      portal.frame();
      if (envDirty) { envDirty--; if (!envDirty) envCap.capture(); else if (envDirty === 1 && !envCap.texture) { envCap.capture(); envDirty = 0; } }
      const tt = reduce ? 0 : t;
      strata.t.value = tt; caust.t.value = tt;
      nTex.offset.set(tt * .012, tt * .007); nTex2.offset.set(-tt * .009, tt * .011); fjordN.offset.set(tt * .004, -tt * .002);
      if (!reduce) { vapour.step(t); dust.step(t); mists.forEach((m, i) => { m.position.x += Math.sin(t * .05 + i) * .02; }); }
      return { power: 0, heat: 0, riding: false };
    },
  };
}
