// nor3-winter.js — NOR // 3 · KONA WINTER, a review room in the host world (same renderer, cards, mood and
// navigation as every other room; built on the review footprint, gated by ?reviewRoom=nor3-winter).
//
// A dark training lounge: wet black stone, three lit lanes, three athlete panels, and a glass wall where a
// Norwegian winter turns into a Kona sunset. Cold plunge on the left, fire on the right, a sofa to land on.
//
// Truth / rights: results come only from pitch/norwegian-trio/trio-facts-v1.json (sourced). Panel taglines are
// KONA.m editorial copy. The bikes are KONA.m's own unbranded tri study (blender/atlas_build.py), never
// presented as the athletes' equipment; no brand marks, no likeness. The window plate is generated imagery,
// recorded with provenance in world/konam/candidates/nor3-winter-asset-manifest-v1.json.
//
// Efficiency: all three bikes are one set of InstancedMeshes (one draw call per material for the whole trio,
// lane colour via instanceColor); static architecture is merged per material; snow, embers and flames animate
// on the GPU; reflections come from one local cube capture (re-taken only when the room changes).
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import trio from '../../pitch/norwegian-trio/trio-facts-v1.json' with { type: 'json' };
import { BROOM, BDOOR } from './beast-cave.js';
import { loadDecor } from './engine/decor.js';
import { localEnvCapture } from './engine/env-capture.js';
import decor from '../../world/konam/rooms/nor3-winter.decor.json' with { type: 'json' };

export const NOR3_MOOD = Object.freeze({ exposure: 1.0, hemi: .14, sun: .04, fog: { near: 10, far: 48 }, fogColor: new THREE.Color('#0a0d12') });
export const NOR3_ASSETS = Object.freeze({                             // bikes and props live in world/konam/rooms/nor3-winter.decor.json
  plate: 'assets/rooms/nor3-winter/kona-winter-plate-2048.webp',
  plateLite: 'assets/rooms/nor3-winter/kona-winter-plate-1024.webp',
});
export const NOR3_LANES = Object.freeze(trio.athletes.map(a => a.lane));

const rng = (seed = 0x4E0B3) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let rectLib = false;

// a tangent-space normal map from a height canvas (Sobel), so painted surfaces catch light like real ones
function normalFrom(src, strength = 2) {
  const w = src.width, h = src.height, s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), out = g.createImageData(w, h);
  const H = (x, y) => s[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    out.data[i] = (-dx / l * .5 + .5) * 255; out.data[i + 1] = (dy / l * .5 + .5) * 255; out.data[i + 2] = (1 / l * .5 + .5) * 255; out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true, repeat) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };

export function buildNor3Winter(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);       // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2;
  const GX = 33.0;                                                     // the glass wall; a snowy terrace lies beyond it
  const laneItem = decor.items.find(d => d.id === 'lane-bikes');        // lanes live in the decor manifest (lane 01 on the left as you walk in)
  const LANE_X = laneItem.at[0][0], LANES = laneItem.at.map(a => a[2]);                  // three stations across the room, bikes side-on
  const rand = rng();
  const infos = [], info = (mesh, rec) => { for (const m of [].concat(mesh)) { m.userData.info = rec; pickables.push(m); } infos.push(rec); return rec; };
  const envMats = [];                                                  // materials that take the local reflection capture
  const E = m => { envMats.push(m); return m; };

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
  const panelC = canvas(512, 512, (g, w, h) => { g.fillStyle = '#16191d'; g.fillRect(0, 0, w, h); const r = rng(7);
    for (let i = 0; i < 2600; i++) { const v = 18 + r() * 16; g.fillStyle = `rgba(${v},${v + 2},${v + 5},${.25 + r() * .3})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3); g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1; g.strokeRect(5, 5, w - 10, h - 10); });
  const wallMat = new THREE.MeshStandardMaterial({ map: tex(panelC, true, [RW / 1.6, R.h / 1.6]), color: '#8a9096', roughness: .82, metalness: .05, envMapIntensity: .25 });
  const sideWallMat = new THREE.MeshStandardMaterial({ map: tex(panelC, true, [RW / 1.6, R.h / 1.6]), color: '#8a9096', roughness: .82, metalness: .05, envMapIntensity: .25 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: .9, metalness: .1 });
  const steel = E(new THREE.MeshStandardMaterial({ color: '#15181b', roughness: .38, metalness: .85 }));
  const ledMat = new THREE.MeshBasicMaterial({ color: '#f2f6ff', toneMapped: false });
  const ledWarm = new THREE.MeshBasicMaterial({ color: '#ffb46a', toneMapped: false });
  const fabric = new THREE.MeshPhysicalMaterial({ color: '#16171a', roughness: .95, sheen: 1, sheenRoughness: .5, sheenColor: new THREE.Color('#3a3e45') });
  const oak = new THREE.MeshStandardMaterial({ color: '#2a1d15', roughness: .55, metalness: 0 });
  const stoneTop = E(new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: .28, metalness: .05, clearcoat: .6, clearcoatRoughness: .2 }));
  const snowMat = new THREE.MeshStandardMaterial({ color: '#e8eef4', roughness: .95, metalness: 0 });
  const basaltC = canvas(256, 256, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); const r = rng(11); for (let i = 0; i < 1600; i++) { const v = r() * 255; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.beginPath(); g.arc(r() * w, r() * h, .6 + r() * 2.4, 0, 7); g.fill(); } });
  const basaltBump = tex(basaltC, false); basaltBump.wrapS = basaltBump.wrapT = THREE.RepeatWrapping;
  const lava = new THREE.MeshStandardMaterial({ color: '#17161a', roughness: .95, metalness: 0, bumpMap: basaltBump, bumpScale: 2.2 });
  const rock = (s, flat = .65, seed = rand()) => { const g = new THREE.IcosahedronGeometry(s, lite ? 1 : 2), p = g.attributes.position, n = new THREE.Vector3();   // a rounded, lumpy stone
    const f = (x, y, z) => Math.sin(x * 7.1 + seed * 9) * Math.sin(y * 6.3 + seed * 5) * Math.sin(z * 5.7 + seed * 3) * .5 + Math.sin(x * 15 + y * 13 + seed * 20) * .12;
    for (let k = 0; k < p.count; k++) { n.set(p.getX(k), p.getY(k), p.getZ(k)).normalize(); const d = 1 + f(n.x, n.y, n.z) * .32; p.setXYZ(k, n.x * s * d * 1.15, n.y * s * d * flat, n.z * s * d); }
    g.computeVertexNormals(); return g; };

  // ------------------------------------------------------------ floor: wet black stone, large format, puddles that mirror
  const FT = 2.4, fH = canvas(1024, 1024, (g, w, h) => { g.fillStyle = '#7f7f7f'; g.fillRect(0, 0, w, h); const r = rng(3);
      for (let i = 0; i < 9000; i++) { const v = 100 + r() * 60; g.fillStyle = `rgba(${v},${v},${v},.25)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
      g.strokeStyle = '#3a3a3a'; g.lineWidth = 6; for (const p of [0, w / 2, w]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); } });
  const fCol = canvas(1024, 1024, (g, w, h) => { g.fillStyle = '#0f1013'; g.fillRect(0, 0, w, h); const r = rng(5);
      for (let k = 0; k < 4; k++) { const ox = (k % 2) * w / 2, oy = (k >> 1) * h / 2, v = 13 + r() * 6; g.fillStyle = `rgb(${v},${v + 1},${v + 3})`; g.fillRect(ox + 3, oy + 3, w / 2 - 6, h / 2 - 6); }
      g.lineCap = 'round'; for (let i = 0; i < 40; i++) { let x = r() * w, y = r() * h, a = r() * 6.28; g.strokeStyle = `rgba(90,96,104,${.05 + r() * .08})`; g.lineWidth = .5 + r() * 1.4; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 30; k++) { a += (r() - .5) * .6; x += Math.cos(a) * 10; y += Math.sin(a) * 10; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = '#050506'; g.lineWidth = 6; for (const p of [0, w / 2, w]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); } });
  const fRough = canvas(512, 512, (g, w, h) => { g.fillStyle = '#787878'; g.fillRect(0, 0, w, h); const r = rng(9);
      for (let i = 0; i < 18; i++) { const x = r() * w, y = r() * h, rr = 30 + r() * 110, gr = g.createRadialGradient(x, y, 2, x, y, rr); gr.addColorStop(0, 'rgba(40,40,40,.7)'); gr.addColorStop(.6, 'rgba(60,60,60,.35)'); gr.addColorStop(1, 'rgba(70,70,70,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr, rr * (.4 + r() * .5), r() * 3, 0, 7); g.fill(); }
      g.strokeStyle = '#b0b0b0'; g.lineWidth = 3; for (const p of [0, w / 2, w]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); } });
  const rep = [RW / FT, RD / FT];
  const floorMat = E(new THREE.MeshPhysicalMaterial({ map: tex(fCol, true, rep), roughnessMap: tex(fRough, false, rep), normalMap: normalFrom(fH, 1.4), normalScale: new THREE.Vector2(.35, .35),
    color: '#7d8187', roughness: .62, metalness: .0, clearcoat: .45, clearcoatRoughness: .22, envMapIntensity: .45 }));
  floorMat.normalMap.repeat.set(...rep); floorMat.roughnessMap.wrapS = floorMat.roughnessMap.wrapT = THREE.RepeatWrapping;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .16, RD), floorMat);
  floor.position.set(CX, -.074, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);

  // ------------------------------------------------------------ shell: panelled walls, black ceiling with light lines
  const wall = (mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m; };
  wall(sideWallMat, RW, R.h, .3, CX, R.h / 2, R.z0 + .15);
  wall(sideWallMat, RW, R.h, .3, CX, R.h / 2, R.z1 - .15);
  wall(wallMat, .3, R.h, RD, R.x1 + .15, R.h / 2, CZ);
  box(ceilMat, RW, .2, RD, CX, R.h + .1, CZ);
  // coffered ceiling: a raised field over the lanes framed by light, linear strips toward the side walls
  for (const z of [R.z0 - 1.0, R.z1 + 1.0]) { box(ceilMat, RW - 1.2, .25, .5, CX, R.h - .12, z); box(ledMat, RW - 1.6, .02, .06, CX, R.h - .25, z + (z > CZ ? -.22 : .22)); }
  for (const x of [20.8, 30.8]) box(ceilMat, .3, .16, RD - 2.6, x, R.h - .08, CZ);
  box(ledMat, .05, .02, RD - 3.2, 20.8, R.h - .17, CZ); box(ledMat, .05, .02, RD - 3.2, 30.8, R.h - .17, CZ);
  for (let x = 9.8; x < GX - .5; x += 2.2) for (const z of [R.z0 - .9, R.z1 + .9]) put(ledWarm, new THREE.CylinderGeometry(.07, .07, .02, 18), x, R.h - .01, z);
  // vertical light lines where the side walls meet the glass
  for (const z of [R.z0 - .32, R.z1 + .32]) box(ledMat, .04, R.h - .3, .04, GX - .25, R.h / 2, z);

  // ------------------------------------------------------------ the glass wall and the terrace beyond it
  const BAYS = [R.z0 - .05, -8.95, -12.75, R.z1 + .05];                 // mullions: three bays line up with the lanes
  for (const z of BAYS) box(steel, .16, R.h, .16, GX, R.h / 2, z);
  box(steel, .2, .14, RD, GX, .07, CZ); box(steel, .22, .9, RD, GX, R.h - .45, CZ);       // sill and header fascia
  for (let i = 0; i < 3; i++) { const z0 = BAYS[i], z1 = BAYS[i + 1]; box(steel, .06, .05, Math.abs(z0 - z1), GX, 1.0, (z0 + z1) / 2); }
  const glassMat = E(new THREE.MeshPhysicalMaterial({ color: '#cfe3ef', roughness: .04, metalness: 0, transparent: true, opacity: .1, envMapIntensity: 1.4, depthWrite: false }));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(RD, R.h - .9), glassMat); glass.rotation.y = -Math.PI / 2; glass.position.set(GX - .02, (R.h - .9) / 2, CZ); group.add(glass);
  obstacles.push({ box: [GX - .35, R.x1 + .5, R.z1 - .5, R.z0 + .5] });
  // terrace: snow on stone, a low parapet, then the view
  const snowC = canvas(512, 256, (g, w, h) => { g.fillStyle = '#dfe7ef'; g.fillRect(0, 0, w, h); const r = rng(21); for (let i = 0; i < 2400; i++) { const v = 200 + r() * 55; g.fillStyle = `rgba(${v},${v + 4},${v + 10},.6)`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); } });
  const terrace = new THREE.MeshStandardMaterial({ map: tex(snowC, true, [2, 6]), roughness: .9 });
  box(terrace, R.x1 - GX, .12, RD, (GX + R.x1) / 2, -.02, CZ);
  box(lava, .35, .62, RD, 34.2, .31, CZ); box(snowMat, .4, .06, RD, 34.2, .64, CZ);
  // the view: Norwegian winter on the left, a Kona sunset on the right (generated plate, see the asset manifest)
  const plateMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  const plateW = RD + 1.6, plateH = plateW * 576 / 1344;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(plateW, plateH), plateMat); plate.rotation.y = -Math.PI / 2; plate.position.set(R.x1 - .02, 1.95 - plateH * .03, CZ); group.add(plate);
  // a reflection of the view in the wet floor: the plate, flipped and faded, lying just above the stone
  const reflFade = tex(canvas(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, '#555'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), false);
  const reflMat = new THREE.MeshBasicMaterial({ color: '#6c7480', transparent: true, opacity: lite ? .16 : .2, alphaMap: reflFade, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(RD - .4, 9.5), reflMat); refl.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); refl.position.set(GX - .2 - 9.5 / 2, .009, CZ); group.add(refl);

  // snow falling past the glass: one Points draw, animated in the vertex shader
  const SN = lite ? 260 : 700, sp = new Float32Array(SN * 3), sr = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { sp[i * 3] = GX + .15 + rand() * (R.x1 - GX - .3); sp[i * 3 + 1] = rand() * 6; sp[i * 3 + 2] = R.z1 + rand() * RD; sr[i] = rand(); }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); snowGeo.setAttribute('seed', new THREE.BufferAttribute(sr, 1));
  const snowShader = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, px: { value: renderer?.getPixelRatio?.() || 1 } },
    vertexShader: `attribute float seed;uniform float t,px;varying float a;void main(){vec3 p=position;float sp=.35+seed*.45;p.y=mod(p.y-t*sp,6.0)-.2;p.z+=sin(t*.7+seed*40.)*.18;p.x+=cos(t*.5+seed*20.)*.06;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(18.+seed*26.)*px/-mv.z;a=.55+.45*seed;}`,
    fragmentShader: `varying float a;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vec3(.93,.96,1.),a*smoothstep(.5,.0,d));}` });
  const snow = new THREE.Points(snowGeo, snowShader); snow.frustumCulled = false; group.add(snow);

  // palms on the terrace: real geometry in front of the plate, so the view has depth when you move
  const leafC = canvas(128, 512, (g, w, h) => { g.fillStyle = '#3c5a35'; g.translate(w / 2, 0);
    g.beginPath(); g.moveTo(-2, 0); g.lineTo(2, 0); g.lineTo(1, h); g.lineTo(-1, h); g.fill();
    for (let i = 0; i < 46; i++) { const y = 10 + i * (h - 20) / 46, l = (w / 2 - 4) * Math.sin(Math.PI * (i + 2) / 50); g.fillStyle = i % 5 ? '#35502f' : '#e8eef2';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(s * l * .6, y + 8, s * l, y + 26); g.lineTo(s * l * .9, y + 30); g.quadraticCurveTo(s * l * .5, y + 13, 0, y + 6); g.fill(); } } });
  const leafMat = new THREE.MeshStandardMaterial({ map: tex(leafC), alphaTest: .5, side: THREE.DoubleSide, roughness: .8, color: '#7f8f86' });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#3b3128', roughness: .95, bumpMap: basaltBump, bumpScale: 3 });
  const palm = (x, z, h, lean) => {
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * .3, h * .45, lean * .1), new THREE.Vector3(lean, h, lean * .25)]);
    put(trunkMat, new THREE.TubeGeometry(path, 18, .11, 8), x, .04, z);
    const top = path.getPoint(1);
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + rand() * .3, len = 1.7 + rand() * .5, frond = new THREE.PlaneGeometry(.55, len, 1, 6);
      const p = frond.attributes.position; for (let k = 0; k < p.count; k++) { const v = Math.max(0, (p.getY(k) + len / 2) / len); p.setZ(k, -Math.pow(v, 1.6) * .9); p.setY(k, v * len); } frond.computeVertexNormals();
      put(leafMat, frond, x + top.x, .04 + top.y, z + top.z, -1.05 + rand() * .3, a, 0); }
  };
  palm(34.5, -5.2, 4.6, -.6); palm(34.7, -16.1, 4.1, -.4);
  // lava stones with snow caps along the terrace
  for (let i = 0; i < 10; i++) { const s = .16 + rand() * .22, g = rock(s, .6);
    const x = GX + .4 + rand() * .45, z = R.z1 + .5 + rand() * (RD - 1); put(lava, g, x, s * .3, z, 0, rand() * 6); put(snowMat, new THREE.SphereGeometry(s * .7, 10, 6, 0, 6.28, 0, 1.1), x, s * .55, z, 0, 0, 0, 1, .45, 1); }

  // ------------------------------------------------------------ the header: KONA.m / NOR // 3 · KONA WINTER
  const header = lettering(5.2, .8, g => {
    g.textAlign = 'center'; g.fillStyle = '#eef1f5'; g.font = `800 .36px ${FONT}`; g.letterSpacing = '.02px'; g.fillText('KONA.m', 2.6, .38);
    g.fillStyle = 'rgba(230,235,242,.82)'; g.font = `600 .17px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('NOR // 3 · KONA WINTER', 2.6, .68);
  }, 1536);
  header.rotation.y = -Math.PI / 2; header.position.set(GX - .14, R.h - .46, CZ); group.add(header);

  // ------------------------------------------------------------ athlete panels: one per lane, hung in front of the view
  const icon = (g, kind, x, y, s) => { g.strokeStyle = 'rgba(230,236,244,.85)'; g.lineWidth = s * .05; g.beginPath();
    if (kind === 'mountain') { g.moveTo(x - s, y + s * .5); g.lineTo(x - s * .35, y - s * .45); g.lineTo(x - s * .05, y); g.lineTo(x + s * .3, y - s * .55); g.lineTo(x + s, y + s * .5); g.moveTo(x - s * .5, y - s * .22); g.lineTo(x - s * .35, y - s * .1); g.lineTo(x - s * .2, y - s * .22); }
    else if (kind === 'wave') { for (let i = 0; i <= 40; i++) { const u = i / 40, a = Math.sin(u * Math.PI) * (.25 + .75 * Math.abs(Math.sin(u * 23))); g.lineTo(x - s + u * 2 * s, y + (i % 2 ? -1 : 1) * a * s * .5); } }
    else { for (const sx of [-1, 1]) { g.moveTo(x + sx * s * .15, y); g.ellipse(x + sx * s * .55, y, s * .4, s * .26, 0, Math.PI, Math.PI * 3); } g.moveTo(x - s * .15, y - s * .04); g.quadraticCurveTo(x, y - s * .14, x + s * .15, y - s * .04); }
    g.stroke(); };
  trio.athletes.forEach((a, i) => {
    const z = LANES[i], PW = 1.8, PH = 3.0, x = 31.2, y0 = 1.1;
    const c = canvas(640, 1070, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a1d22'); gr.addColorStop(1, '#0d0f12'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(240,244,250,.9)'; g.font = `600 52px ${FONT}`; g.letterSpacing = '4px'; g.fillText(`${a.lane} // ${a.name.split(' ')[0].toUpperCase()}`, 70, 150);
      g.fillText(a.name.split(' ').slice(1).join(' ').toUpperCase(), 70, 206);
      g.fillStyle = 'rgba(240,244,250,.18)'; g.fillRect(70, 252, w - 140, 2);
      g.fillStyle = 'rgba(225,231,240,.78)'; g.font = `500 42px ${FONT}`; g.letterSpacing = '5px'; a.panel.forEach((t, k) => g.fillText(t, 70, 350 + k * 64));
      icon(g, a.icon, w / 2, 640, 110);
      g.fillStyle = 'rgba(225,231,240,.32)'; g.font = `500 20px ${FONT}`; g.letterSpacing = '3px'; g.fillText('A KONA.M READING · NOT THE ATHLETE’S WORDS', 70, h - 70);
    });
    const pm = new THREE.MeshStandardMaterial({ map: tex(c), emissiveMap: tex(c), emissive: '#ffffff', emissiveIntensity: .55, roughness: .7, metalness: .1 });
    box(steel, .05, PH, PW, x + .005, y0 + PH / 2, z);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), pm); p.rotation.y = -Math.PI / 2; p.position.set(x - .022, y0 + PH / 2, z); group.add(p);
    box(ledMat, .03, PH - .3, .035, x - .04, y0 + PH / 2, z + PW / 2 - .16);
    for (const dz of [-PW / 2 + .2, PW / 2 - .2]) { box(steel, .03, y0, .03, x + .05, y0 / 2, z + dz); box(steel, .3, .015, .1, x + .05, .008, z + dz); }
    info(p, { model: act => laneCard(i, act), eyebrow: `LANE ${a.lane}`, title: a.name, sub: a.panel.join(' · '), text: 'Taglines are KONA.m editorial copy, not the athlete’s words.' });
    obstacles.push({ box: [x - .3, x + .3, z - PW / 2, z + PW / 2] });
  });

  // ------------------------------------------------------------ the three lanes: lit platforms, trainer, fan, towel, kit
  const deck = E(new THREE.MeshPhysicalMaterial({ color: '#0d0e10', roughness: .35, metalness: .2, clearcoat: .5, clearcoatRoughness: .25 }));
  const glowTex = tex(canvas(64, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), false);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: '#cfe0ff', transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const PX = 3.0, PZ = 3.1, PY = .08;
  const towels = [], laneInfo = [];
  LANES.forEach((z, i) => {
    box(deck, PX, PY, PZ, LANE_X, PY / 2, z);
    for (const [w, d, x, zz] of [[PX, .03, LANE_X, z - PZ / 2], [PX, .03, LANE_X, z + PZ / 2], [.03, PZ, LANE_X - PX / 2, z], [.03, PZ, LANE_X + PX / 2, z]]) box(ledMat, w, .025, d, x, PY + .005, zz);
    // light bleeding onto the wet floor around the edge (fake bloom, one plane per side)
    for (const [w, x, zz, ry] of [[PX, LANE_X, z - PZ / 2 - .14, 0], [PX, LANE_X, z + PZ / 2 + .14, 0], [PZ, LANE_X - PX / 2 - .14, z, Math.PI / 2], [PZ, LANE_X + PX / 2 + .14, z, Math.PI / 2]]) {
      put(glowMat, new THREE.PlaneGeometry(w + .2, .3), x, .006, zz, -Math.PI / 2, 0, ry); }
    obstacles.push({ box: [LANE_X - PX / 2, LANE_X + PX / 2, z - PZ / 2, z + PZ / 2] });
    if (ctx.contactShadow) { const cs = ctx.contactShadow(1.9, .55); cs.rotation.z = Math.PI / 2; cs.position.set(LANE_X, PY + .004, z); cs.material.opacity = .9; group.add(cs); }
    // wheel-on trainer frame under the rear axle (placed once the bike is measured) and a front riser block
    laneInfo.push({ z });
    // lane plate on the deck edge, facing the room
    const plateL = lettering(1.8, .16, g => { g.fillStyle = 'rgba(235,240,247,.85)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.012px'; g.fillText(`${trio.athletes[i].lane} // ${trio.athletes[i].name.toUpperCase()}`, .02, .11); }, 1024);
    plateL.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); plateL.position.set(LANE_X - PX / 2 + .2, PY + .004, z); group.add(plateL);
  });

  // towels on stands, slogans to the room (KONA.m copy), terry cloth with sheen and a woven normal map
  const SLOGANS = [['DISCIPLINE', 'FUELS', 'FREEDOM'], ['PROCESS', 'BEATS', 'NOISE'], ['SAME', 'CREW', 'MORE APÉROS']];
  const terryH = canvas(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(13); for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const v = 90 + r() * 120; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(x + 2, y + 2, 1.7, 0, 7); g.fill(); } });
  const terryN = normalFrom(terryH, 3); terryN.repeat.set(4, 8);
  const flag = (g, x, y, w) => { const h = w * 16 / 22; g.fillStyle = '#ba0c2f'; g.fillRect(x, y, w, h); g.fillStyle = '#fff'; g.fillRect(x + w * 6 / 22, y, w * 4 / 22, h); g.fillRect(x, y + h * 6 / 16, w, h * 4 / 16); g.fillStyle = '#00205b'; g.fillRect(x + w * 7 / 22, y, w * 2 / 22, h); g.fillRect(x, y + h * 7 / 16, w, h * 2 / 16); };
  const towelGeo = (() => { // one long cloth folded over a bar: front drop longer than the back, soft hem curl, gentle sway folds
    const W = .52, L = 1.62, g = new THREE.PlaneGeometry(W, L, 10, 48), p = g.attributes.position, bend = .62;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), v = (p.getY(k) + L / 2);   // 0 at the back hem → L at the front hem
      const fold = Math.sin(x * 9 + v * 3) * .008 + Math.sin(x * 17) * .004, r = .028;
      let y, z; if (v < bend) { y = -(bend - v); z = -r; } else if (v < bend + Math.PI * r) { const a = (v - bend) / r; y = Math.sin(a) * r; z = -Math.cos(a) * r; } else { y = -(v - bend - Math.PI * r); z = r + (v > L - .1 ? (v - (L - .1)) * .25 : 0); }
      p.setXYZ(k, x, y, z + fold); }
    g.computeVertexNormals(); return g; })();
  SLOGANS.forEach((s, i) => {
    const c = canvas(512, 1600, (g, w, h) => { g.fillStyle = '#e9e7e2'; g.fillRect(0, 0, w, h); const r = rng(30 + i);
      for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(0,0,0,${.02 + r() * .03})`; g.fillRect(0, y, w, 1); }
      g.fillStyle = '#26282c'; for (const yy of [h * .03, h * .96]) g.fillRect(0, yy, w, h * .012);
      g.save(); g.translate(0, h * .56); g.scale(1, -1);             // the front drop runs from the fold (canvas .56h) up to the hem (0): draw upside-down there
      g.textAlign = 'center'; g.fillStyle = '#1a1c20'; g.font = `800 64px ${FONT}`; g.letterSpacing = '4px'; s.forEach((t, k) => { g.font = `800 ${t.length > 9 ? 50 : 64}px ${FONT}`; g.fillText(t, w / 2, 170 + k * 84); });
      flag(g, w / 2 - 44, 450, 88); g.restore(); });
    const m = new THREE.MeshPhysicalMaterial({ map: tex(c), normalMap: terryN, normalScale: new THREE.Vector2(.6, .6), roughness: 1, sheen: 1, sheenRoughness: .8, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide });
    const t = new THREE.Mesh(towelGeo, m); t.castShadow = !lite;
    const z = LANES[i] - 1.05, x = LANE_X - 1.05, top = 1.12;
    t.rotation.y = -Math.PI / 2; t.position.set(x, top, z); group.add(t); towels.push(t);
    // the stand: a slim black frame
    box(steel, .03, top, .03, x, top / 2, z - .3); box(steel, .03, top, .03, x, top / 2, z + .3);
    put(steel, new THREE.CylinderGeometry(.016, .016, .66, 12), x, top, z, Math.PI / 2, 0, 0);
    box(steel, .32, .02, .03, x, .01, z - .3); box(steel, .32, .02, .03, x, .01, z + .3);
    info(t, { model: act => laneCard(i, act), eyebrow: `LANE ${trio.athletes[i].lane} · TOWEL`, title: s.join(' ').replace('APÉROS', 'apéros').toLowerCase().replace(/^./, c => c.toUpperCase()) + '.', sub: 'KONA.m copy on a towel', text: 'House slogans, not the athletes’ words.' });
  });

  // bottles and tablets on each lane (instanced: one draw per part for all three lanes)
  const bottleG = mergeGeometries([new THREE.CylinderGeometry(.037, .037, .2, 20).translate(0, .1, 0), new THREE.CylinderGeometry(.03, .037, .03, 20).translate(0, .215, 0)].map(g => g.toNonIndexed()));
  const bottles = new THREE.InstancedMesh(bottleG, E(new THREE.MeshPhysicalMaterial({ color: '#0e0f11', roughness: .35, clearcoat: .7 })), LANES.length * 2);
  const capG = new THREE.CylinderGeometry(.016, .02, .035, 14).translate(0, .245, 0), caps = new THREE.InstancedMesh(capG, new THREE.MeshStandardMaterial({ color: '#d6dade', roughness: .4, metalness: .6 }), LANES.length * 2);
  LANES.forEach((z, i) => [[LANE_X - .9, z + .9], [LANE_X - .75, z + 1.05]].forEach(([x, zz], k) => { M4.makeTranslation(x, PY, zz); bottles.setMatrixAt(i * 2 + k, M4); caps.setMatrixAt(i * 2 + k, M4); }));
  group.add(bottles, caps);
  const tabC = canvas(512, 340, (g, w, h) => { g.fillStyle = '#05070a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,200,255,.9)'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 60; i++) { const x = 30 + i * (w - 60) / 60, y = h * .62 - Math.sin(i * .35) * 30 - (i > 30 ? 40 : 0) + Math.sin(i * 2.3) * 6; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = 'rgba(230,236,245,.85)'; g.font = `700 54px ${FONT}`; g.fillText('— W', 30, 86); g.font = `500 20px ${FONT}`; g.fillStyle = 'rgba(230,236,245,.5)'; g.fillText('LANE READY · NO RIDER', 30, 120); });
  const tabMat = new THREE.MeshBasicMaterial({ map: tex(tabC), toneMapped: false });
  LANES.forEach(z => { const x = LANE_X + .95, zz = z + .95; box(steel, .03, 1.2, .03, x, .6 + PY, zz); box(steel, .36, .02, .36, x, PY + .01, zz);
    put(steel, new THREE.BoxGeometry(.02, .22, .32), x - .02, 1.3 + PY, zz, 0, 0, .25); put(tabMat, new THREE.PlaneGeometry(.3, .2), x - .032, 1.3 + PY - .003, zz, 0, -Math.PI / 2, .25); });

  // ------------------------------------------------------------ left: cold plunge, dumbbells, a TV of the fjord, the creed
  const tub = { x: 21.3, z: -15.4, r: 1.0 };
  put(lava, new THREE.CylinderGeometry(tub.r + .14, tub.r + .2, .82, 48, 1, true), tub.x, .41, tub.z);
  put(stoneTop, new THREE.TorusGeometry(tub.r + .07, .08, 10, 64), tub.x, .82, tub.z, Math.PI / 2);
  put(snowMat, new THREE.TorusGeometry(tub.r + .09, .05, 8, 48, 2.4), tub.x, .88, tub.z, Math.PI / 2, 0, 2.1, 1, 1, .5);
  const water = new THREE.Mesh(new THREE.CircleGeometry(tub.r, 64), new THREE.ShaderMaterial({ uniforms: { t: { value: 0 } }, transparent: false,
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float t;varying vec2 vU;float n(vec2 p){return sin(p.x*7.+t*.6)*sin(p.y*9.-t*.5)+sin((p.x+p.y)*13.+t*.9)*.5;}
      void main(){vec2 p=vU*4.;float c=n(p)*.5+.5;float r=length(vU-.5)*2.;vec3 deep=vec3(.02,.09,.12),hi=vec3(.35,.75,.85);
      vec3 col=mix(deep,hi,pow(c,6.)*.55+.12*(1.-r));col+=vec3(.6,.8,.9)*pow(smoothstep(.9,1.,r),3.)*.25;gl_FragColor=vec4(col,1.);}` }));
  water.rotation.x = -Math.PI / 2; water.position.set(tub.x, .74, tub.z); group.add(water);
  for (let i = 0; i < 7; i++) { const g = new THREE.BoxGeometry(.16 + rand() * .1, .08, .14 + rand() * .1); const a = rand() * 6.28, rr = rand() * .7;
    put(iceMat(), g, tub.x + Math.cos(a) * rr, .76, tub.z + Math.sin(a) * rr, rand() * .3, rand() * 3, rand() * .3); }
  const tubLabel = lettering(1.3, .32, g => { g.textAlign = 'center'; g.fillStyle = 'rgba(232,238,245,.86)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.02px'; g.fillText('COLD BODIES', .65, .13); g.fillText('WARMER MINDS', .65, .25); }, 1024);
  tubLabel.rotation.y = -Math.PI / 2 + .55; tubLabel.position.set(tub.x - tub.r - .12, .45, tub.z + .62); group.add(tubLabel);
  info(water, { model: act => plungeCard(act), eyebrow: 'THE COLD', title: 'Cold bodies, warmer minds.', sub: 'Plunge pool', text: 'Set dressing for a winter training room.' });
  obstacles.push({ c: [tub.x, tub.z], r: tub.r + .45 });
  // dumbbell rack along the left wall
  const dbN = 10, dbBell = new THREE.InstancedMesh(new THREE.CylinderGeometry(.075, .075, .07, 18).rotateZ(Math.PI / 2), E(new THREE.MeshStandardMaterial({ color: '#16181b', roughness: .45, metalness: .5 })), dbN * 2);
  const dbBar = new THREE.InstancedMesh(new THREE.CylinderGeometry(.018, .018, .32, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#9aa1a8', roughness: .3, metalness: 1 }), dbN);
  for (let i = 0; i < dbN; i++) { const x = 15.0 + (i % 5) * .44, y = i < 5 ? .62 : 1.02, z = R.z1 + .45, s = 1 + (i % 5) * .12;
    M4.compose(V.set(x, y, z), Q.identity(), S.set(1, s, s)); dbBar.setMatrixAt(i, M4); for (const k of [0, 1]) { M4.compose(V.set(x + (k ? .15 : -.15), y, z), Q.identity(), S.set(1, s, s)); dbBell.setMatrixAt(i * 2 + k, M4); } }
  group.add(dbBell, dbBar);
  for (const y of [.5, .9]) { box(steel, 2.4, .04, .32, 15.88, y, R.z1 + .45); }
  for (const x of [14.75, 17.0]) box(steel, .04, 1.0, .3, x, .5, R.z1 + .45);
  // TV: a crop of the window's fjord, as if the screen were looking at the same winter
  const tvMat = new THREE.MeshBasicMaterial({ color: '#c9d2dc' });
  const tv = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.3, .06), [steel, steel, steel, steel, tvMat, steel]); tv.position.set(18.0, 2.15, R.z1 + .06); group.add(tv);
  const creed = lettering(1.25, 2.4, g => { g.fillStyle = 'rgba(225,231,240,.78)'; g.font = `500 .12px ${FONT}`; g.letterSpacing = '.03px'; ['COLD', 'DISCIPLINE', 'CREATES', 'WARM', 'DESTINATIONS'].forEach((t, k) => g.fillText(t, .05, .25 + k * .22)); flag(g, .06, 1.42, .2); }, 1024);
  creed.position.set(13.9, 2.7, R.z1 + .02); group.add(creed);
  const hff = lettering(.8, .9, g => { g.fillStyle = '#111317'; g.fillRect(0, 0, .8, .9); g.fillStyle = 'rgba(225,231,240,.8)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.02px'; ['HIGHER', 'FASTER', 'FURTHER'].forEach((t, k) => g.fillText(t, .08, .28 + k * .17)); }, 512);
  hff.material.transparent = false; hff.position.set(19.75, 2.15, R.z1 + .03); group.add(hff);

  // ------------------------------------------------------------ the painting: front-page news, in oils, in a gold frame
  // Data-driven from trio.social (an unverified snapshot until a person confirms both profiles): the headline flips
  // between "overtakes" and "closing in" with the numbers, so the joke never states something the numbers don't.
  { const S = trio.social, k = S.kristian.followers, f = S.frodeno.followers, ahead = k > f, K = v => `${Math.round(v / 1000)}K`, gap = Math.abs(k - f);
    const PW2 = 4.2, PH2 = 2.55, px = 24.9, py = 2.75, pz = R.z1 + .05;
    const c = canvas(2048, 1244, (g, w, h) => {
      g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, w, h);                 // primed canvas
      const r = rng(77); for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, l = 6 + r() * 26; g.strokeStyle = `rgba(${120 + r() * 60},${100 + r() * 50},${70 + r() * 40},${.03 + r() * .05})`; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - .5) * 6); g.stroke(); }
      g.fillStyle = '#1b1a18'; g.textAlign = 'center';
      g.font = `italic 700 64px ${SERIF}`; g.fillText('The Fjord Times', w / 2, 112);
      g.font = `600 22px ${FONT}`; g.letterSpacing = '6px'; g.fillText(`SPECIAL EDITION · ${S.as_of.split('-').reverse().join(' · ')} · PRICE: ONE NEGATIVE SPLIT`, w / 2, 160); g.letterSpacing = '0px';
      g.fillRect(90, 182, w - 180, 4); g.fillRect(90, 192, w - 180, 1.5);
      g.fillStyle = '#b3122e'; g.font = `800 34px ${FONT}`; g.letterSpacing = '10px'; g.fillText('BREAKING', w / 2, 262); g.letterSpacing = '0px';
      g.fillStyle = '#141311'; g.font = `900 ${ahead ? 132 : 118}px ${SERIF}`;
      g.fillText(ahead ? 'BLUMMENFELT OVERTAKES' : 'BLUMMENFELT CLOSING IN', w / 2, 400); g.fillText(ahead ? 'FRODENO' : 'ON FRODENO', w / 2, 530);
      g.font = `italic 400 54px ${SERIF}`; g.fillText(ahead ? 'Not on the run. On Instagram.' : 'Not on the run. On Instagram. Gap to the leader: ' + K(gap) + '.', w / 2, 610);
      // the race graphic: two followers bars, a tiny bike riding each
      const bx = 230, bw = w - 460, top = 690, max = Math.max(k, f) * 1.08;
      [[S.kristian.handle, k, '#0b2a5c'], [S.frodeno.handle, f, '#3a3631']].forEach(([hd, v, col], i) => { const y = top + i * 120;
        g.fillStyle = 'rgba(20,20,18,.08)'; g.fillRect(bx, y, bw, 64); g.fillStyle = col; g.fillRect(bx, y, bw * v / max, 64);
        g.fillStyle = '#141311'; g.textAlign = 'left'; g.font = `700 40px ${FONT}`; g.fillText(hd, bx, y - 14); g.textAlign = 'right'; g.fillText(K(v), bx + bw, y - 14);
        const tx = bx + bw * v / max + 18, ty = y + 32; g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(tx, ty + 14, 14, 0, 7); g.arc(tx + 58, ty + 14, 14, 0, 7); g.moveTo(tx, ty + 14); g.lineTo(tx + 24, ty - 10); g.lineTo(tx + 58, ty + 14); g.moveTo(tx + 24, ty - 10); g.lineTo(tx + 48, ty - 12); g.stroke(); });
      g.textAlign = 'center'; g.fillStyle = '#1b1a18'; g.font = `400 36px ${SERIF}`;
      g.fillText(ahead ? 'Experts confirm: the follower count has no draft-legal rule.' : 'Experts expect a negative split. Frodeno is said to be “calmly watching the bike leg”.', w / 2, 1000);
      g.font = `italic 400 30px ${SERIF}`; g.fillText('Meanwhile in Norway: the Instagram was done before breakfast, and then the second session.', w / 2, 1050);
      g.fillStyle = 'rgba(27,26,24,.6)'; g.font = `500 20px ${FONT}`; g.letterSpacing = '2px';
      g.fillText(`A KONA.M JOKE, NOT NEWS · FOLLOWER COUNTS: PUBLIC-PROFILE SNAPSHOT, ${S.as_of}, ${S.status === 'verified' ? 'VERIFIED' : 'TO BE CONFIRMED'} · NO QUOTES ARE THE ATHLETES’`, w / 2, h - 60);
    });
    const pm2 = new THREE.MeshStandardMaterial({ map: tex(c), roughness: .78, emissiveMap: tex(c), emissive: '#ffffff', emissiveIntensity: .05, bumpMap: tex(c, false), bumpScale: .4 });
    const pt = new THREE.Mesh(new THREE.PlaneGeometry(PW2, PH2), pm2); pt.position.set(px, py, pz + .06); group.add(pt);
    // gold frame: four bevelled mouldings (merged) and a picture light
    const gold = E(new THREE.MeshPhysicalMaterial({ color: '#b08a43', roughness: .32, metalness: .9, clearcoat: .3 }));
    const fw = .16; for (const [w2, h2, x2, y2] of [[PW2 + 2 * fw, fw, px, py + PH2 / 2 + fw / 2], [PW2 + 2 * fw, fw, px, py - PH2 / 2 - fw / 2], [fw, PH2, px - PW2 / 2 - fw / 2, py], [fw, PH2, px + PW2 / 2 + fw / 2, py]]) {
      put(gold, new RoundedBoxGeometry(w2, h2, .09, 3, .03), x2, y2, pz + .05); put(gold, new RoundedBoxGeometry(Math.max(.04, w2 - (w2 > h2 ? .06 : 0)), Math.max(.04, h2 - (h2 > w2 ? .06 : 0)), .03, 2, .01), x2, y2, pz + .1); }
    put(steel, new THREE.CylinderGeometry(.025, .025, 1.4, 12), px, py + PH2 / 2 + .32, pz + .32, 0, 0, Math.PI / 2);
    put(steel, new THREE.CylinderGeometry(.012, .012, .32, 8), px, py + PH2 / 2 + .24, pz + .18, Math.PI / 2.6, 0, 0);
    put(ledWarm, new THREE.BoxGeometry(1.3, .01, .03), px, py + PH2 / 2 + .3, pz + .33);
    const plight = new THREE.MeshBasicMaterial({ map: tex(canvas(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, 0, 8, w / 2, 40, h * .95); gr.addColorStop(0, 'rgba(255,214,160,.85)'); gr.addColorStop(.55, 'rgba(255,200,140,.22)'); gr.addColorStop(1, 'rgba(255,190,130,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); })), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .32 });
    put(plight, new THREE.PlaneGeometry(PW2 + 1.0, PH2 + 1.0), px, py + .2, pz + .075, 0, 0, 0);
    info(pt, { model: act => newsCard(act), eyebrow: 'THE FJORD TIMES', title: ahead ? 'Blummenfelt overtakes Frodeno.' : 'Blummenfelt closing in on Frodeno.', sub: 'On Instagram', text: 'A KONA.m joke, not news.' });
    var newsCard = act => ({ kind: 'beast', eyebrow: 'THE FJORD TIMES · A KONA.M JOKE', title: ahead ? 'Blummenfelt overtakes Frodeno (on Instagram).' : 'Blummenfelt closing in on Frodeno (on Instagram).',
      kicker: `${S.kristian.handle} ${K(k)} · ${S.frodeno.handle} ${K(f)}`,
      lede: ahead ? 'The only race where nobody checks the drafting.' : `Gap to the leader: ${K(gap)}. Same tactic as always: patience, then a negative split.`,
      facts: [{ cls: S.status === 'verified' ? 'P' : 'I', text: `Follower counts from public-profile snapshots on ${S.as_of}. ${S.method}` }, { cls: 'G', text: 'An affectionate KONA.m joke. No quotes are the athletes’ words; no rivalry is claimed.' }, disclaimer],
      actions: [{ label: 'Back to the room', primary: true, onClick: () => act.close() }] });
  }

  // ------------------------------------------------------------ right: fire, the kit, the monolith, the cabinet
  const fire = { x: 21.1, z: -5.7 };
  put(stoneTop, new THREE.CylinderGeometry(.98, 1.04, .06, 40), fire.x, .03, fire.z);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, s = .17 + rand() * .05; put(lava, rock(s, .7), fire.x + Math.cos(a) * .8, .12, fire.z + Math.sin(a) * .8, 0, -a, 0); }
  for (let i = 0; i < 13; i++) { const a = (i + .5) / 13 * Math.PI * 2, s = .14 + rand() * .04; put(lava, rock(s, .7), fire.x + Math.cos(a) * .78, .3, fire.z + Math.sin(a) * .78, 0, -a, 0); }
  put(new THREE.MeshStandardMaterial({ color: '#1a1210', roughness: 1 }), new THREE.CylinderGeometry(.66, .66, .1, 32), fire.x, .12, fire.z);
  for (let i = 0; i < 4; i++) put(oak, new THREE.CylinderGeometry(.05, .06, .7, 8), fire.x + Math.cos(i * 1.6) * .08, .22, fire.z + Math.sin(i * 1.6) * .08, Math.PI / 2, i * 1.6, .25);
  const flameMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float t;varying vec2 vU;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      void main(){vec2 u=vU;float y=u.y;float w=(1.-y)*.42;float x=abs(u.x-.5+ (n(vec2(u.y*3.,t*1.7))-.5)*.25*y);
      float body=smoothstep(w,w*.35,x)*smoothstep(1.,.15,y+n(vec2(u.x*6.,u.y*4.-t*3.))*.35);
      vec3 col=mix(vec3(1.,.35,.05),vec3(1.,.85,.45),smoothstep(.2,.9,body));gl_FragColor=vec4(col*body*1.6,body);}` });
  const flameMesh = new THREE.Mesh(mergeGeometries([0, 1, 2].map(i => new THREE.PlaneGeometry(.9, 1.1).rotateY(i * Math.PI / 3))), flameMat); flameMesh.position.set(fire.x, .72, fire.z); group.add(flameMesh); const flames = [flameMesh];
  const fireLight = new THREE.PointLight('#ff8a3c', lite ? 6 : 9, 9, 1.6); fireLight.position.set(fire.x, 1.0, fire.z); group.add(fireLight);
  const EN = lite ? 40 : 90, ep = new Float32Array(EN * 3), es = new Float32Array(EN);
  for (let i = 0; i < EN; i++) { ep[i * 3] = fire.x + (rand() - .5) * .8; ep[i * 3 + 1] = rand() * 2.4; ep[i * 3 + 2] = fire.z + (rand() - .5) * .8; es[i] = rand(); }
  const emG = new THREE.BufferGeometry(); emG.setAttribute('position', new THREE.BufferAttribute(ep, 3)); emG.setAttribute('seed', new THREE.BufferAttribute(es, 1));
  const emMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, px: snowShader.uniforms.px },
    vertexShader: `attribute float seed;uniform float t,px;varying float a;void main(){vec3 p=position;float k=mod(p.y+t*(.3+seed*.4),2.4);p.y=.4+k;p.x+=sin(t*2.+seed*30.)*.12*k;p.z+=cos(t*1.7+seed*20.)*.12*k;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(6.+seed*8.)*px/-mv.z;a=1.-k/2.4;}`,
    fragmentShader: 'varying float a;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(1.,.55,.18,a*(1.-d*2.));}' });
  const embers = new THREE.Points(emG, emMat); embers.frustumCulled = false; group.add(embers);
  info(flames, { model: act => fireCard(act), eyebrow: 'THE WARM', title: 'Some race. Some prepare. All belong.', sub: 'Fire pit', text: 'The other half of a winter training room.' });
  obstacles.push({ c: [fire.x, fire.z], r: 1.25 });
  // kit on the wall: a tri-suit in Norwegian colours on a hanger, a lei beside it, lit in a shadow-gap niche
  const nx = 24.2, ny = 2.35, nz = R.z0 - .06;
  box(new THREE.MeshStandardMaterial({ color: '#0a0b0d', roughness: .9 }), 1.5, 2.2, .04, nx, ny, nz - .01);
  box(ledWarm, 1.4, .02, .03, nx, ny + 1.06, nz - .05);
  const suitShape = new THREE.Shape(); { const s = suitShape; s.moveTo(-.12, .74); s.lineTo(-.3, .66); s.lineTo(-.4, .38); s.lineTo(-.3, .34); s.lineTo(-.24, .5); s.lineTo(-.2, 0); s.lineTo(-.24, -.45); s.lineTo(-.06, -.45); s.lineTo(0, -.12); s.lineTo(.06, -.45); s.lineTo(.24, -.45); s.lineTo(.2, 0); s.lineTo(.24, .5); s.lineTo(.3, .34); s.lineTo(.4, .38); s.lineTo(.3, .66); s.lineTo(.12, .74); s.quadraticCurveTo(0, .64, -.12, .74); }
  const suitC = canvas(256, 512, (g, w, h) => { g.fillStyle = '#111215'; g.fillRect(0, 0, w, h); g.fillStyle = '#ba0c2f'; g.fillRect(0, h * .3, w, h * .12); g.fillStyle = '#fff'; g.fillRect(0, h * .42, w, h * .025); g.fillStyle = '#00205b'; g.fillRect(0, h * .445, w, h * .05);
    g.fillStyle = '#e9edf2'; g.font = `800 34px ${FONT}`; g.textAlign = 'center'; g.fillText('KONA.', w / 2, h * .25); flag(g, w / 2 - 22, h * .55, 44); });
  const suitG = new THREE.ExtrudeGeometry(suitShape, { depth: .05, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 3, curveSegments: 8 });
  { const p = suitG.attributes.position, uv = suitG.attributes.uv; for (let k = 0; k < p.count; k++) uv.setXY(k, (p.getX(k) + .4) / .8, (p.getY(k) + .45) / 1.2); }
  const suit = new THREE.Mesh(suitG, new THREE.MeshPhysicalMaterial({ map: tex(suitC), roughness: .45, sheen: .6, sheenColor: new THREE.Color('#9aa'), clearcoat: .2 }));
  suit.rotation.y = Math.PI; suit.position.set(nx + .15, ny - .05, nz - .12); group.add(suit);
  put(steel, new THREE.TorusGeometry(.14, .008, 6, 24, Math.PI), nx + .15, ny + .74, nz - .1, 0, 0, 0);
  const lei = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.028, 0), new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: .8 }), 44);
  for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2; M4.makeTranslation(nx - .45 + Math.sin(a) * .16, ny + .2 - (1 - Math.cos(a)) * .26, nz - .1); lei.setMatrixAt(i, M4); } group.add(lei);
  const note = lettering(.42, .56, g => { g.fillStyle = '#ece9e2'; g.fillRect(0, 0, .42, .56); g.fillStyle = '#23252a'; g.font = `italic 400 .045px ${SERIF}`; ['Same race.', 'Some prepare.', 'All belong.'].forEach((t, k) => g.fillText(t, .04, .12 + k * .07)); g.font = `500 .022px ${FONT}`; g.fillStyle = 'rgba(30,30,30,.55)'; g.fillText('— KONA.m', .04, .46); }, 512);
  note.material.transparent = false; note.rotation.y = Math.PI; note.position.set(nx + .95, ny - .55, nz - .03); group.add(note);
  const sph = lettering(1.3, 1.9, g => { g.fillStyle = 'rgba(225,231,240,.78)'; g.font = `500 .13px ${FONT}`; g.letterSpacing = '.03px'; ['SAME', 'PEOPLE', 'HIGHER', 'PLACES'].forEach((t, k) => g.fillText(t, .06, .3 + k * .24)); }, 1024);
  sph.rotation.y = Math.PI; sph.position.set(31.9, 3.3, R.z0 - .02); group.add(sph);
  info(suit, { model: act => kitCard(act), eyebrow: 'THE KIT', title: 'Same people. Higher places.', sub: 'A KONA.m tri-suit study', text: 'Not any athlete’s or team’s race kit.' });
  // the monolith by the glass: lava stone, engraved, snow on its shoulders
  const monoC = canvas(512, 1024, (g, w, h) => { g.drawImage(basaltC, 0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.fillStyle = 'rgba(220,226,234,.82)';
    g.font = `700 64px ${FONT}`; g.letterSpacing = '8px'; g.fillText('KONA', w / 2, 300); g.font = `500 36px ${FONT}`; g.letterSpacing = '6px'; ['FURTHER', 'THAN', 'WINTER'].forEach((t, k) => g.fillText(t, w / 2, 410 + k * 58)); });
  const mono = new THREE.Mesh(new THREE.BoxGeometry(.55, 2.3, 1.05, 1, 6, 2), [lava, lava, lava, lava, lava, lava]);
  mono.material[1] = new THREE.MeshStandardMaterial({ map: tex(monoC), roughness: .9, bumpMap: basaltBump, bumpScale: 1.5 });
  { const p = mono.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) * (1 + Math.sin(y * 3) * .06)); p.setZ(k, p.getZ(k) * (1 - Math.max(0, y - .8) * .25)); } mono.geometry.computeVertexNormals(); }
  mono.position.set(32.15, 1.15, -5.15); mono.rotation.y = -.35; mono.castShadow = !lite; group.add(mono);
  put(snowMat, new THREE.SphereGeometry(.3, 12, 6, 0, 6.28, 0, 1.0), 32.15, 2.28, -5.15, 0, 0, 0, 1, .3, 1.6);
  info(mono, { model: act => konaCard(act), eyebrow: 'THE LINE', title: 'Kona: further than winter.', sub: 'Lava stone, engraved', text: 'Where the room is pointing.' });
  obstacles.push({ c: [32.15, -5.15], r: .8 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(.85, .9, .6), [steel, steel, steel, steel, steel, steel]);
  const cabC = canvas(256, 256, (g, w, h) => { g.fillStyle = '#111316'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(225,231,240,.8)'; g.textAlign = 'center'; g.font = `600 20px ${FONT}`; g.letterSpacing = '3px'; ['RACE', 'OR', 'SPECTATE', '', 'GOOD COMPANY'].forEach((t, k) => g.fillText(t, w / 2, 70 + k * 30)); });
  cab.material[1] = new THREE.MeshStandardMaterial({ map: tex(cabC), roughness: .6 }); cab.position.set(28.4, .45, -4.75); cab.rotation.y = .35; group.add(cab);
  obstacles.push({ c: [28.4, -4.75], r: .6 });

  // ------------------------------------------------------------ lounge: sofa, blanket, table, the still life
  const so = { x: 16.9, z: CZ, L: 3.6 };
  put(fabric, new RoundedBoxGeometry(.95, .42, so.L, 3, .08), so.x, .25, so.z);
  put(fabric, new RoundedBoxGeometry(.28, .62, so.L, 3, .1), so.x - .38, .72, so.z, 0, 0, -.12);
  for (const s of [-1, 1]) put(fabric, new RoundedBoxGeometry(.95, .6, .26, 3, .1), so.x, .38, so.z + s * (so.L / 2 - .1));
  for (let k = 0; k < 3; k++) { put(fabric, new RoundedBoxGeometry(.82, .16, so.L / 3 - .04, 3, .07), so.x + .04, .53, so.z - so.L / 3 + k * so.L / 3);
    put(fabric, new RoundedBoxGeometry(.2, .46, so.L / 3 - .08, 4, .09), so.x - .22, .82, so.z - so.L / 3 + k * so.L / 3, 0, 0, -.18); }
  obstacles.push({ box: [so.x - .55, so.x + .55, so.z - so.L / 2, so.z + so.L / 2] });
  // a fur blanket thrown over the right arm: KONA.m palm mark and two small flags
  const furH = canvas(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(17); g.lineCap = 'round'; for (let i = 0; i < 5000; i++) { const x = r() * w, y = r() * h, v = 60 + r() * 150; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 6, y + 4 + r() * 6); g.stroke(); } });
  const blC = canvas(512, 512, (g, w, h) => { g.fillStyle = '#18191c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(235,238,242,.85)'; g.textAlign = 'center'; g.font = `800 54px ${FONT}`; g.fillText('KONA.m', w / 2, 330);
    g.strokeStyle = 'rgba(235,238,242,.85)'; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, 270); g.quadraticCurveTo(w / 2 + 6, 220, w / 2 - 4, 170); for (let i = 0; i < 7; i++) { const a = -2.6 + i * .45; g.moveTo(w / 2 - 4, 170); g.quadraticCurveTo(w / 2 - 4 + Math.cos(a) * 40, 170 + Math.sin(a) * 30 - 10, w / 2 - 4 + Math.cos(a) * 70, 170 + Math.sin(a) * 30 + 20); } g.stroke();
    flag(g, w / 2 - 90, 370, 56); flag(g, w / 2 + 34, 370, 56); });
  const blG = new THREE.PlaneGeometry(1.0, 1.5, 24, 40); { const p = blG.attributes.position, seatY = .64, back = so.x - .2, edge = so.x + .44;
    for (let k = 0; k < p.count; k++) { const w = p.getX(k), v = (p.getY(k) + .75) / 1.5 * 1.5, run = edge - back, fold = Math.sin(w * 11 + v * 4) * .018 + Math.sin(w * 23) * .006;
      let x, y; if (v < run) { x = back + v; y = seatY + Math.sin(v * 9) * .015; } else { const a = Math.min(1, (v - run) / .1); x = edge + .05 * a + (v - run) * .04; y = seatY - (v - run) * (.6 + .4 * a); }
      p.setXYZ(k, x + fold * .3, y + fold, so.z + .75 + w); } blG.computeVertexNormals(); }
  const blanket = new THREE.Mesh(blG, new THREE.MeshPhysicalMaterial({ map: tex(blC), normalMap: normalFrom(furH, 4), roughness: 1, sheen: 1, sheenRoughness: .9, sheenColor: new THREE.Color('#8a8f98'), side: THREE.DoubleSide }));
  blanket.castShadow = !lite; group.add(blanket);
  // coffee table: a slab of dark stone floating on a warm underglow
  const ta = { x: 18.85, z: CZ };
  box(stoneTop, 1.05, .1, 2.0, ta.x, .42, ta.z); box(new THREE.MeshStandardMaterial({ color: '#0a0b0d', roughness: .8 }), .8, .37, 1.7, ta.x, .185, ta.z);
  box(ledWarm, .82, .015, 1.72, ta.x, .365, ta.z);
  const warmGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), new THREE.MeshBasicMaterial({ map: tex(canvas(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,170,90,.8)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); })), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 }));
  warmGlow.rotation.x = -Math.PI / 2; warmGlow.position.set(ta.x, .007, ta.z); group.add(warmGlow);
  obstacles.push({ box: [ta.x - .65, ta.x + .65, ta.z - 1.1, ta.z + 1.1] });
  const top = .47;
  // books, spines to the sofa: TRAIN · ANALYZE · RECOVER · REPEAT
  ['TRAIN', 'ANALYZE', 'RECOVER', 'REPEAT'].forEach((t, k) => {
    const c = canvas(512, 96, (g, w, h) => { g.fillStyle = ['#1c1e22', '#24262a', '#17191c', '#202226'][k]; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(232,236,242,.85)'; g.font = `700 46px ${FONT}`; g.letterSpacing = '6px'; g.fillText(t, 40, 64); });
    const spine = new THREE.MeshStandardMaterial({ map: tex(c), roughness: .7 }), pages = new THREE.MeshStandardMaterial({ color: '#d9d4c9', roughness: .9 }), cover = new THREE.MeshStandardMaterial({ color: '#1b1d20', roughness: .7 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(.24, .055, .62), [pages, spine, cover, cover, pages, pages]);
    b.position.set(ta.x - .22, top + .03 + k * .057, ta.z - .55 + (k % 2) * .02); b.rotation.y = (k - 1.5) * .05; group.add(b); });
  // candle in a glass, a KONA.m bottle, a mug, the notebook and pen, two lava stones, a frosted plant
  const candleGlass = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .12, 24, 1, true), E(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .05, transparent: true, opacity: .25, side: THREE.DoubleSide }))); candleGlass.position.set(ta.x - .2, top + .06, ta.z - .1); group.add(candleGlass);
  put(new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: .9 }), new THREE.CylinderGeometry(.05, .05, .07, 20), ta.x - .2, top + .035, ta.z - .1);
  const candleFlame = new THREE.Mesh(new THREE.PlaneGeometry(.04, .08), flameMat); candleFlame.position.set(ta.x - .2, top + .11, ta.z - .1); group.add(candleFlame);
  const candleLight = lite ? null : new THREE.PointLight('#ffb36a', .9, 2.5, 2); if (candleLight) { candleLight.position.set(ta.x - .2, top + .2, ta.z - .1); group.add(candleLight); }
  const btlC = canvas(256, 128, (g, w, h) => { g.fillStyle = '#0e0f11'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(232,236,242,.85)'; g.font = `800 30px ${FONT}`; g.textAlign = 'center'; g.fillText('KONA.m', w * .25, 72); });
  const btl = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .26, 24), E(new THREE.MeshPhysicalMaterial({ map: tex(btlC), roughness: .4, clearcoat: .8 }))); btl.position.set(ta.x - .1, top + .13, ta.z + .2); btl.rotation.y = Math.PI * .9; group.add(btl);
  const mugC = canvas(256, 128, (g, w, h) => { g.fillStyle = '#121316'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(232,236,242,.85)'; g.font = `700 18px ${FONT}`; g.textAlign = 'center'; ['GOOD', 'ATHLETES', 'BETTER', 'HUMANS'].forEach((t, k) => g.fillText(t, w * .25, 32 + k * 22)); });
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(.048, .044, .1, 28), E(new THREE.MeshPhysicalMaterial({ map: tex(mugC), roughness: .3, clearcoat: 1 }))); mug.position.set(ta.x - .05, top + .05, ta.z + .48); mug.rotation.y = Math.PI * .95; group.add(mug);
  put(mug.material, new THREE.TorusGeometry(.03, .009, 8, 16), ta.x - .05, top + .05, ta.z + .53, 0, Math.PI / 2, 0);
  const nb = lettering(.36, .26, g => { g.fillStyle = '#ecebe6'; g.fillRect(0, 0, .36, .26); g.fillStyle = '#26282d'; g.font = `italic 400 .03px ${SERIF}`; ['Cold today', 'Faster tomorrow', 'Kona always'].forEach((t, k) => g.fillText(t, .04, .07 + k * .05)); }, 512);
  nb.material.transparent = false; nb.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 + .12); nb.position.set(ta.x + .15, top + .012, ta.z + .02); group.add(nb);
  put(new THREE.MeshStandardMaterial({ color: '#d7d9dc', roughness: .4 }), new THREE.BoxGeometry(.36, .012, .26), ta.x + .15, top + .004, ta.z + .02, 0, .12, 0);
  put(steel, new THREE.CylinderGeometry(.006, .006, .16, 8), ta.x + .3, top + .016, ta.z + .1, Math.PI / 2, .3, 0);
  for (let i = 0; i < 2; i++) { const g = rock(.05 + i * .02, .6); put(lava, g, ta.x + .3 - i * .12, top + .03, ta.z - .35 + i * .1); }
  const potX = 15.6, potZ = CZ + 2.5;
  put(lava, new THREE.CylinderGeometry(.22, .18, .4, 24), potX, .2, potZ);
  const frost = new THREE.InstancedMesh(new THREE.PlaneGeometry(.06, .5, 1, 4).translate(0, .25, 0), new THREE.MeshStandardMaterial({ color: '#c9d4d8', roughness: .9, side: THREE.DoubleSide }), 38);
  for (let i = 0; i < 38; i++) { const a = rand() * 6.28; M4.compose(V.set(potX + Math.cos(a) * .05, .38, potZ + Math.sin(a) * .05), Q.setFromEuler(EU.set(Math.cos(a) * (.4 + rand() * .5), a, Math.sin(a) * (.4 + rand() * .5))), S.set(1, .7 + rand() * .6, 1)); frost.setMatrixAt(i, M4); }
  group.add(frost);
  info(nb, { model: act => loungeCard(act), eyebrow: 'THE LOUNGE', title: 'Cold today. Faster tomorrow. Kona always.', sub: 'Train · analyze · recover · repeat', text: 'Somewhere to land between sessions.' });

  // scattered lava stones and snow drifts on the floor near the glass
  for (let i = 0; i < 16; i++) { const s = .07 + rand() * .14, g = rock(s, .55);   // stones gather by the fire, the tub and along the walls, never in the walking line
    const side = i % 4, x = side === 0 ? fire.x + 1.0 + rand() * .9 : side === 1 ? tub.x + .9 + rand() * 1.0 : 18 + rand() * 13, z = side === 0 ? fire.z - .3 - rand() * .6 : side === 1 ? tub.z + .6 + rand() * .8 : side === 2 ? R.z0 - .35 - rand() * .4 : R.z1 + .35 + rand() * .4;
    put(lava, g, x, s * .25, z, 0, rand() * 6); }
  const driftC = canvas(256, 256, (g, w, h) => { const r = rng(41); for (let i = 0; i < 60; i++) { const x = w / 2 + (r() - .5) * w * .7, y = h / 2 + (r() - .5) * h * .5, rr = 10 + r() * 40, gr = g.createRadialGradient(x, y, 1, x, y, rr); gr.addColorStop(0, 'rgba(240,245,250,.9)'); gr.addColorStop(1, 'rgba(240,245,250,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
  const driftMat = new THREE.MeshStandardMaterial({ map: tex(driftC), transparent: true, depthWrite: false, roughness: .9 });
  for (const [x, z, s] of [[GX - .6, -6.2, 1.6], [GX - .5, -16.4, 1.4], [GX - .7, -12.75, 1.0], [tub.x + .2, tub.z + 1.15, 1.2]]) put(driftMat, new THREE.PlaneGeometry(s, s * .7), x, .008, z, -Math.PI / 2, 0, 0);

  // smoked-oak slats on both side walls through the lounge and lanes, and a warm painted wash under each downlight
  const slatAt = []; for (let x = 13.5; x < 31.5; x += .14) { if (x > 20.4 && (x < 22.4 || x > 27.4)) slatAt.push([x, R.z1 + .03]); if (x < 23.2 || x > 25.6) slatAt.push([x, R.z0 - .03]); }   // clear of the TV, creed and kit niche
  const slat = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, R.h - .5, .05), oak, slatAt.length);
  slatAt.forEach(([x, z], k) => { M4.makeTranslation(x, (R.h - .5) / 2, z); slat.setMatrixAt(k, M4); }); slat.receiveShadow = true; group.add(slat);
  const washT = tex(canvas(128, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, 0, 4, w / 2, 30, h); gr.addColorStop(0, 'rgba(255,190,130,.9)'); gr.addColorStop(.5, 'rgba(255,170,110,.25)'); gr.addColorStop(1, 'rgba(255,160,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const washM = new THREE.MeshBasicMaterial({ map: washT, transparent: true, opacity: lite ? .35 : .45, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let x = 14.2; x < 31.5; x += 2.2) for (const [z, ry] of [[R.z0 - .08, Math.PI], [R.z1 + .08, 0]]) put(washM, new THREE.PlaneGeometry(1.6, 3.2), x, R.h - 1.7, z, 0, ry, 0);

  flush(true);

  // ------------------------------------------------------------ hall-side sign over the door
  const sign = lettering(4.6, .9, g => {
    g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('NOR // 3 · KONA WINTER', 0, .28);
    g.fillStyle = '#3b6f8f'; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Three lanes. One island.', 0, .69);
  }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ light: the window does most of the work
  if (!rectLib) { RectAreaLightUniformsLib.init(); rectLib = true; }
  const winCold = new THREE.RectAreaLight('#9fc2ff', lite ? 3.2 : 4.2, 6.2, 3.8); winCold.position.set(GX - .1, 2.4, -14.0); winCold.lookAt(GX - 5, 1.2, -14.0); group.add(winCold);
  const winWarm = new THREE.RectAreaLight('#ffb27a', lite ? 3.4 : 4.6, 6.2, 3.8); winWarm.position.set(GX - .1, 2.4, -7.6); winWarm.lookAt(GX - 5, 1.2, -7.6); group.add(winWarm);
  const fill = new THREE.PointLight('#aab6c8', lite ? 2 : 1.2, 20, 1.4); fill.position.set(13.5, R.h - .7, CZ); group.add(fill);
  LANES.forEach(z => { const s = new THREE.SpotLight('#f1f4ff', lite ? 30 : 40, 7, .5, .55, 1.3); s.position.set(LANE_X - .2, R.h - .3, z); s.target.position.set(LANE_X, .6, z); group.add(s, s.target); });
  // one shadow pass for the whole trio (instead of one per lane): a high, narrow-ish key over the lanes
  if (!lite) { const key = new THREE.SpotLight('#eef2ff', 18, 14, .78, .4, 1.1); key.position.set(LANE_X - 1.2, R.h - .1, CZ); key.target.position.set(LANE_X, 0, CZ);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .02; key.shadow.camera.near = 2; key.shadow.camera.far = 9; group.add(key, key.target); }

  // ------------------------------------------------------------ bikes: KONA.m's winter-lane tri study (Blender), instanced ×3
  const bikeSpot = { kind: 'beast', pos: new THREE.Vector3(LANE_X, 0, LANES[1]), rotY: 0, bike: null };
  const portrait = coarse && innerHeight > innerWidth;
  bikeSpot.view = portrait ? new THREE.Vector3(20.6, 0, CZ - 1.6) : new THREE.Vector3(15.0, 0, CZ);   // just past the table, the whole room in frame
  bikeSpot.face = new THREE.Vector3(27.5, 1.55, CZ);
  bikeSpot.info = infos[0];
  let pickBoxes = [];
  LANES.forEach((z, i) => { const pb = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.2, 1.9), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));   // the host skips invisible picks, so this draws nothing instead pb.position.set(LANE_X, .7, z); group.add(pb);
    info(pb, { model: act => laneCard(i, act), eyebrow: `LANE ${trio.athletes[i].lane}`, title: trio.athletes[i].name, sub: 'KONA.m winter-lane tri study · not the athlete’s bike', text: 'An empty lane.' }); pickBoxes.push(pb); });
  // Kona × Norway liveries, painted in the shader along the bike (no UVs needed): one material, three designs,
  // selected per instance through instanceColor.r (0 / .5 / 1).
  //  01 Fjord → Lava: navy fjord at the nose, a flag band across the down tube, lava cracks glowing at the tail.
  //  02 Snow → Sunset: pearl snow up front, a Kona sunset fading over the rear, flag pinstripes.
  //  03 Aurora: black with aurora ribbons flowing along the frame and a flag pinstripe.
  const livery = m => { m.onBeforeCompile = sh => {
      sh.uniforms.uLen = { value: bikeLen };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBikePos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBikePos = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vBikePos; uniform float uLen;
        float hsh(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
        float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(mix(hsh(i),hsh(i+vec3(1,0,0)),f.x),mix(hsh(i+vec3(0,1,0)),hsh(i+vec3(1,1,0)),f.x),f.y),mix(mix(hsh(i+vec3(0,0,1)),hsh(i+vec3(1,0,1)),f.x),mix(hsh(i+vec3(0,1,1)),hsh(i+vec3(1,1,1)),f.x),f.y),f.z);}
        vec3 flagBand(float d, vec3 base){ // red | white | blue | white | red, across the tube
          float a=abs(d); return a<.012?vec3(.0,.13,.36):a<.02?vec3(.95):a<.045?vec3(.73,.05,.18):base; }
        float laneGlow=0.;`).replace('#include <color_fragment>', `
        { float lane=vColor.r; float u=clamp(vBikePos.z/uLen+.5,0.,1.); float y=vBikePos.y; vec3 c;
          float n=vn(vBikePos*18.), flake=step(.93,hsh(floor(vBikePos*900.)))*.12;
          if(lane<.25){ c=mix(vec3(.10,.03,.02),vec3(.02,.07,.16),smoothstep(.15,.7,u)); c=mix(c,vec3(.04,.14,.30),smoothstep(.75,1.,u)*.6);
            float crack=smoothstep(.035,.0,abs(vn(vBikePos*vec3(7.,11.,7.))-.5))*smoothstep(.42,.05,u);   // thin lava veins toward the tail c=mix(c,vec3(1.,.36,.06),crack); laneGlow=crack*1.6;
            c=flagBand(vBikePos.z+y*.55-.05, c); }
          else if(lane<.75){ vec3 sun=mix(vec3(.98,.42,.18),vec3(.85,.30,.42),smoothstep(.0,.35,y)); c=mix(sun,vec3(.92,.93,.95),smoothstep(.2,.62,u));
            float ps=abs(fract((vBikePos.z+y*.55)*6.)-.5); c=mix(c,vec3(.73,.05,.18),smoothstep(.02,.0,abs(ps-.25))*.9*step(.55,u)); c=mix(c,vec3(0.,.13,.36),smoothstep(.02,.0,abs(ps-.3))*.9*step(.55,u)); }
          else { c=vec3(.015,.018,.025); float w=sin(vBikePos.z*9.+sin(y*7.)*1.6)*.5+.5, w2=sin(vBikePos.z*5.-y*11.+1.7)*.5+.5;
            c+=vec3(.05,.85,.55)*pow(w,12.)*.38+vec3(.25,.35,.95)*pow(w2,14.)*.32; laneGlow=pow(w,14.)*.25;
            c=mix(c,vec3(.73,.05,.18),smoothstep(.006,.0,abs(y-.62+vBikePos.z*.08))); }
          diffuseColor.rgb=c*(.92+n*.16)+flake; }`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += (vColor.r<.25 ? vec3(1.,.36,.06) : vec3(.1,.9,.6)) * laneGlow;`);
    }; m.customProgramCacheKey = () => 'nor3-livery'; return m; };
  let bikeLen = 1.75;
  const LANE_SEL = [0, .5, 1];
  const decorHooks = {
    materialFor(item, src, name) {
      let m;
      if (item.kind === 'glb') { m = src.clone(); if (item.tint) m.color?.multiplyScalar(item.tint); }
      else if (/paint|disc_face/.test(name)) m = livery(new THREE.MeshPhysicalMaterial({ name, color: '#ffffff', roughness: .3, metalness: .35, clearcoat: 1, clearcoatRoughness: .04 }));
      else if (/carbon|rim/.test(name)) m = new THREE.MeshPhysicalMaterial({ name, color: '#0f1013', roughness: .34, metalness: .25, clearcoat: .9, clearcoatRoughness: .1 });
      else if (/rubber/.test(name)) m = new THREE.MeshPhysicalMaterial({ name, color: '#151515', roughness: .86, sheen: .35, sheenRoughness: .7, sheenColor: new THREE.Color('#3a3a3a') });
      else if (/saddle|tape/.test(name)) m = new THREE.MeshPhysicalMaterial({ name, color: '#121212', roughness: .7, sheen: .5, sheenColor: new THREE.Color('#444') });
      else if (/chrome/.test(name)) m = new THREE.MeshStandardMaterial({ name, color: '#d9dce0', roughness: .1, metalness: 1 });
      else m = new THREE.MeshStandardMaterial({ name, color: /steel/.test(name) ? '#a7acb2' : '#7d838a', roughness: /steel/.test(name) ? .28 : .34, metalness: 1 });
      E(m); m.envMapIntensity = 1; return m;
    },
    colors(item) { return item.kind === 'bike' ? (i, name) => /paint|disc_face/.test(name) ? new THREE.Color(LANE_SEL[i], LANE_SEL[i], LANE_SEL[i]) : new THREE.Color(1, 1, 1) : null; },
    placed(item, { info }) {
      envDirty = 2;
      if (item.kind !== 'bike') return;
      bikeLen = info.length; bikeSpot.bike = group;
      // a wheel-on trainer at each rear axle and a riser under each front wheel
      item.at.forEach(([x, y, z]) => {
        const ax = x + info.rear.x, az = z + info.rear.z, ay = y + info.rear.y;
        for (const s of [-1, 1]) { put(steel, new THREE.CylinderGeometry(.018, .018, .62, 10), ax + s * .1, PY + .2, az, s * .55, 0, 0); put(steel, new THREE.CylinderGeometry(.012, .012, ay - PY, 8), ax + s * .085, (ay + PY) / 2, az); }
        put(steel, new THREE.CylinderGeometry(.075, .075, .07, 28), ax, PY + .075, az - .36, 0, 0, Math.PI / 2);
        put(new THREE.MeshStandardMaterial({ color: '#16181b', roughness: .7 }), new RoundedBoxGeometry(.26, .05, .34, 2, .02), x + info.front.x, PY + .025, z + info.front.z);
      });
      flush(true);
    },
  };

  // ------------------------------------------------------------ local reflections: one cube capture of this room
  let envDirty = 1;
  const env = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(CX + 4, 1.6, CZ), lite, mats: envMats, hidePoints: true });
  const captureEnv = () => env.capture();

  // ------------------------------------------------------------ cards
  const A = trio.athletes, disclaimer = { cls: 'G', text: 'An independent KONA.m room. Not affiliated with, endorsed by or sponsored by the athletes, their federation, teams or any brand. Taglines and slogans are KONA.m copy.' };
  const src = f => `${f.line} (${f.sources.map(u => u.includes('wikipedia') ? 'Wikipedia' : new URL(u).hostname).join(', ')})`;
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'AN INDEPENDENT ROOM · NOR // 3', title: 'Kona winter.', kicker: 'Three lanes. One island.',
      lede: 'A winter training room for three Norwegian triathletes: cold on one side, fire on the other, Kona through the glass. Three lanes stand ready with nobody on them yet.',
      facts: [{ cls: 'P', text: src(trio.kona_2022) }, disclaimer, { cls: 'G', text: 'The bikes are unbranded KONA.m tri studies in Kona × Norway liveries, not the athletes’ bikes. No likeness is used.' }],
      actions: [{ label: 'Walk to the lanes →', primary: true, onClick: () => act.close() }, ...A.map((a, i) => ({ label: `${a.lane} · ${a.name}`, onClick: () => ctx.renderCard?.(laneCard(i, act)) }))] };
  }
  function laneCard(i, act) {
    const a = A[i];
    return { kind: 'beast', eyebrow: `LANE ${a.lane} · NOR // 3`, title: a.name, kicker: a.panel.join(' · '),
      lede: ['Fjord to lava: navy at the nose, the flag across the down tube, Kona glowing at the tail.', 'Snow to sunset: pearl at the front, the Kona sky over the rear.', 'Aurora: northern lights running the length of the frame.'][i] + ' Same room, same tools, a different athlete.',
      facts: [...a.facts.map(f => ({ cls: 'P', text: src(f) })), ...(a.equipment ? [{ cls: 'P', text: `${src(a.equipment)} The bike in this lane is an unbranded KONA.m study in a Kona × Norway livery, not their bike.` }] : []), { cls: 'G', text: 'Panel taglines are a KONA.m reading, not the athlete’s words.' }, disclaimer],
      actions: [{ label: 'Back to the room', primary: true, onClick: () => act.close() }, ...A.filter((_, k) => k !== i).map(b => ({ label: `Lane ${b.lane} · ${b.name}`, onClick: () => ctx.renderCard?.(laneCard(A.indexOf(b), act)) }))] };
  }
  const simple = (eyebrow, title, lede) => act => ({ kind: 'beast', eyebrow, title, lede, facts: [disclaimer], actions: [{ label: 'Back to the room', primary: true, onClick: () => act.close() }] });
  const plungeCard = simple('THE COLD · NOR // 3', 'Cold bodies, warmer minds.', 'A plunge pool at the cold end of the room. Set dressing for a winter training room, not a description of anyone’s routine.');
  const fireCard = simple('THE WARM · NOR // 3', 'Some race. Some prepare. All belong.', 'The fire is the other half of the room: the people around the athletes, the long evenings, the company.');
  const kitCard = simple('THE KIT · NOR // 3', 'Same people. Higher places.', 'A KONA.m tri-suit study in Norwegian colours. Not any athlete’s, team’s or federation’s race kit.');
  const konaCard = act => ({ ...simple('THE LINE · NOR // 3', 'Kona: further than winter.', 'Lava stone by the glass, where the snow gives way to the island. The room points here.')(act), facts: [{ cls: 'P', text: src(trio.kona_2022) }, disclaimer] });
  const loungeCard = simple('THE LOUNGE · NOR // 3', 'Cold today. Faster tomorrow. Kona always.', 'Train, analyze, recover, repeat: four books on a table, a candle, somewhere to land between sessions.');

  // ------------------------------------------------------------ host interface (same shape as the Beast Cave)
  let plateSet = false;
  return {
    group, floor, sign, bikeSpot, infos, mood: NOR3_MOOD, ownBikes: true, introCard, laneCard,
    async useAssets(loader) {
      if (this._assets) return; this._assets = true;
      new THREE.TextureLoader().load(lite ? NOR3_ASSETS.plateLite : NOR3_ASSETS.plate, t => {
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; plateMat.map = t; plateMat.needsUpdate = true; reflMat.map = t; reflMat.needsUpdate = true;
        const tvt = t.clone(); tvt.repeat.set(.36, .6); tvt.offset.set(.04, .3); tvt.needsUpdate = true; tvMat.map = tvt; tvMat.needsUpdate = true; plateSet = true; envDirty = 2; });
      await loadDecor(decor, { group, loader, lite, hooks: decorHooks });   // bikes + fans from world/konam/rooms/nor3-winter.decor.json
    },
    setBike() { /* this room mounts its own LOD trio in useAssets; the canonical full bike is not loaded here */ },
    update(t, reduce, dt = 1 / 60) {
      if (envDirty) { envDirty--; if (!envDirty) captureEnv(); else if (envDirty === 1 && !env.texture) { captureEnv(); envDirty = 0; } }
      const tt = reduce ? 0 : t;
      snowShader.uniforms.t.value = tt; emMat.uniforms.t.value = tt; flameMat.uniforms.t.value = t; water.material.uniforms.t.value = tt;
      fireLight.intensity = (lite ? 6 : 9) * (.85 + Math.sin(t * 11) * .06 + Math.sin(t * 23.7) * .05 + Math.sin(t * 5.3) * .04);
      if (candleLight) candleLight.intensity = .9 * (.85 + Math.sin(t * 17) * .08 + Math.sin(t * 31) * .07);
      flameMesh.scale.y = 1 + Math.sin(t * 7) * .05;
      if (!reduce) towels.forEach((tw, i) => { tw.rotation.z = Math.sin(t * 1.3 + i) * .015; });
      return { power: 0, heat: 0, riding: false };
    },
  };
  function iceMat() { return iceMat.m ||= new THREE.MeshPhysicalMaterial({ color: '#dff4ff', roughness: .12, transparent: true, opacity: .8, clearcoat: 1, envMapIntensity: 1.2 }); }
}
