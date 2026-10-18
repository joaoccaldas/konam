// decision-room.js — THE DECISION ROOM · "Before we choose, what changes?" (review room, ?reviewRoom=decision-room).
//
// A quiet stone-and-oak hall at dusk where a planning decision becomes a place. Down the middle, the profit bridge as
// stacked limestone slabs, one slab per €1,000: the plan's profit, the effect of units sold, of selling price, of
// cost per unit, and the profit that results. Three data plinths hold three scenarios; choosing one re-stacks the
// bridge. Along the south wall, three signal columns light the three warning rules of an FP&A metric monitor, and a
// lectern lets a visitor stress the plan until one of them turns red. Dusk comes in through a clerestory.
//
// Truth / rights: every figure is invented example data for one imaginary product (pitch/decision-room/
// finance-example-v1.json, copied from the portfolio's finance model and recomputed by the room's test). No company,
// employer or client data; the first card says so. Warning thresholds are the monitor's own. Plinths, columns, mirror,
// telescope and globe come from the shared procedural library (gaudi-nexus-visual@e8a89d7), optimised and validated
// through KONA's asset intake (world/konam/candidates/decision-room-asset-manifest-v1.json).
//
// Efficiency (the Norseman lessons): one shadowed dusk sun and one area light; all practical light is faked with
// additive pools and washes. Bridge slabs are three InstancedMeshes that re-stack on the GPU; plinths and columns are
// instanced; lamps are per-instance colours; statics are merged per material. The clerestory sky is a terrain-portal
// pane with a sky-only scene.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import data from '../../pitch/decision-room/finance-example-v1.json' with { type: 'json' };
import decor from '../../world/konam/rooms/decision-room.decor.json' with { type: 'json' };
import { BROOM, BDOOR } from './beast-cave.js';
import { bake, instance } from './engine/decor.js';
import { localEnvCapture } from './engine/env-capture.js';
import { createTerrainPortal } from './engine/terrain-portal.js';
import { motes } from './roomkit.js';

export const DECISION_MOOD = Object.freeze({ exposure: 1.0, hemi: .22, sun: 0, fog: { near: 40, far: 160 }, fogColor: new THREE.Color('#2a2622') });
export const DECISION_ASSETS = Object.freeze({ dir: 'assets/rooms/decision-room/' });

const rng = (seed = 0xD3C15) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true, repeat) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };
const eur = v => `${v < 0 ? '−' : ''}€${Math.abs(v).toLocaleString('en-GB')}`;
const signed = v => v === 0 ? '€0' : `${v > 0 ? '+' : '−'}€${Math.abs(v).toLocaleString('en-GB')}`;
let rectLib = false;

const SCEN = Object.fromEntries(data.scenarios.map(s => [s.id, s]));
const RULES = data.alerts.rules;
// the monitor's rules, applied to (possibly stressed) example inputs — mirrors sampleAlerts() in the finance model
export const breached = (rule, v) => rule.breach === 'below' ? v < rule.threshold : v > rule.threshold;

export function buildDecisionRoom(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);        // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2, H = 6.6;
  const SZ = -11.2, BARS = [13.4, 17.8, 22.2, 26.6, 31.0], BW = 2.0, BD = 1.1, T = .11, BASE = .16;   // the bridge: one slab per €1,000
  const CLER = { x0: 9.0, x1: 34.0, y0: 4.55, y1: 6.15 };
  const SUN = new THREE.Vector3(-.35, .28, -1).normalize();            // toward the low dusk sun, through the south clerestory
  const rand = rng();
  const infos = [], info = (mesh, rec) => { for (const m of [].concat(mesh)) { m.userData.info = rec; pickables.push(m); } infos.push(rec); return rec; };
  const envMats = [], E = m => { envMats.push(m); return m; };

  // ------------------------------------------------------------ merged statics
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

  // ------------------------------------------------------------ materials: limestone, oak, bronze
  const stoneC = (base, seed, joints = true) => canvas(1024, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h, rr = 40 + r() * 200, gr = g.createRadialGradient(x, y, 2, x, y, rr), v = r() < .5 ? 0 : 255; gr.addColorStop(0, `rgba(${v},${v},${v},${.03 + r() * .04})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    for (let i = 0; i < 14000; i++) { const v = 120 + r() * 110; g.fillStyle = `rgba(${v},${v - 6},${v - 16},${.06 + r() * .12})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(80,70,58,${.04 + r() * .06})`; g.lineWidth = .8; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - .5) * 60; y += r() * 30; g.lineTo(x, y); } g.stroke(); }   // fossil seams
    if (joints) { g.strokeStyle = 'rgba(60,52,44,.5)'; g.lineWidth = 3; for (let y = 0; y <= h; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 256) % 2 ? 256 : 0; x <= w; x += 512) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 256); g.stroke(); } } } });
  const limeWall = stoneC('#b9ab94', 5);
  const wallMat = new THREE.MeshStandardMaterial({ map: tex(limeWall, true, [RW / 4, H / 4]), bumpMap: tex(limeWall, false, [RW / 4, H / 4]), bumpScale: .8, color: '#a39886', roughness: .88, envMapIntensity: .3 });
  const slabC = stoneC('#cfc3ad', 9, false);
  const limestone = E(new THREE.MeshStandardMaterial({ map: tex(slabC, true, [1, .3]), color: '#fbf6ee', emissive: '#6b6458', emissiveMap: tex(slabC, true, [1, .3]), emissiveIntensity: .32, roughness: .6, envMapIntensity: .55 }));   // pale stone that holds its colour in dusk light
  const grainC = (base, seed) => canvas(256, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < 90; i++) { const x = r() * w; g.strokeStyle = `rgba(${r() < .5 ? '40,24,12' : '255,230,200'},${.04 + r() * .08})`; g.lineWidth = .6 + r() * 2.2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * .01 + i) * 5, y); g.stroke(); } });
  const oak = E(new THREE.MeshStandardMaterial({ map: tex(grainC('#8a6544', 21)), color: '#ffffff', roughness: .55, envMapIntensity: .45 }));
  const oakDark = E(new THREE.MeshStandardMaterial({ map: tex(grainC('#4d3524', 23)), color: '#ffffff', roughness: .5, envMapIntensity: .45 }));
  const plankC = canvas(1024, 1024, (g, w, h) => { const r = rng(31); for (let y = 0; y < h; y += 128) { let x = -r() * 400; while (x < w) { const L = 300 + r() * 500, v = r() * 22 - 11; g.fillStyle = `rgb(${118 + v},${84 + v},${56 + v})`; g.fillRect(x, y, L, 128); for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(50,30,15,${.05 + r() * .06})`; g.lineWidth = 1; const yy = y + r() * 128; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + L * .3, yy + (r() - .5) * 8, x + L * .7, yy + (r() - .5) * 8, x + L, yy); g.stroke(); } g.fillStyle = 'rgba(30,18,10,.6)'; g.fillRect(x, y, 3, 128); x += L; } g.fillStyle = 'rgba(30,18,10,.55)'; g.fillRect(0, y, w, 3); } });
  const floorMat = E(new THREE.MeshPhysicalMaterial({ map: tex(plankC, true, [RW / 6, RD / 6]), color: '#d9cbb8', roughness: .52, clearcoat: .45, clearcoatRoughness: .2, envMapIntensity: .6 }));
  const bronze = E(new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: .32, metalness: 1 }));
  const blackSteel = E(new THREE.MeshStandardMaterial({ color: '#1a1a1b', roughness: .4, metalness: .8 }));
  const lampWarm = new THREE.MeshBasicMaterial({ color: '#ffd29a', toneMapped: false });

  // ------------------------------------------------------------ floor, walls, coffered oak ceiling
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .16, RD), floorMat); floor.position.set(CX, -.074, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);
  box(limestone, BARS[4] - BARS[0] + BW + 1.6, .02, BD + 1.8, (BARS[0] + BARS[4]) / 2, .01, SZ);                     // a limestone runway under the bridge
  const slab = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); m.castShadow = !lite; m.receiveShadow = true; group.add(m); return m; };
  slab(RW + .6, H, .3, CX, H / 2, R.z0 + .15);                                                  // north
  slab(.3, H, RD, R.x1 + .15, H / 2, CZ);                                                        // east
  slab(.3, H, BDOOR.z0 - R.z1, R.x0 + .15, H / 2, (R.z1 + BDOOR.z0) / 2);                        // west, around the door
  slab(.3, H, R.z0 - BDOOR.z1, R.x0 + .15, H / 2, (BDOOR.z1 + R.z0) / 2);
  slab(.3, H - BDOOR.h, BDOOR.z1 - BDOOR.z0, R.x0 + .15, BDOOR.h + (H - BDOOR.h) / 2, (BDOOR.z0 + BDOOR.z1) / 2);
  slab(RW + .6, CLER.y0, .3, CX, CLER.y0 / 2, R.z1 - .12);   // inner face 3 cm inside the footprint: the Breitling room's north wall is coplanar with ours                                       // south, below the clerestory
  slab(RW + .6, H - CLER.y1, .3, CX, (H + CLER.y1) / 2, R.z1 - .12);
  slab(CLER.x0 - R.x0, CLER.y1 - CLER.y0, .3, (R.x0 + CLER.x0) / 2, (CLER.y0 + CLER.y1) / 2, R.z1 - .12);
  slab(R.x1 - CLER.x1, CLER.y1 - CLER.y0, .3, (CLER.x1 + R.x1) / 2, (CLER.y0 + CLER.y1) / 2, R.z1 - .12);
  box(oakDark, RW, .2, RD, CX, H + .1, CZ);
  for (let x = R.x0 + 1.6; x < R.x1 - .5; x += 2.8) box(oak, .16, .42, RD, x, H - .21, CZ);              // coffers
  for (let z = R.z1 + 1.4; z < R.z0 - .4; z += 2.8) box(oak, RW, .3, .14, CX, H - .15, z);
  box(oak, RW, .1, .3, CX, .05, R.z0 - .15); box(oak, RW, .1, .3, CX, .05, R.z1 + .15);                  // skirting

  // ------------------------------------------------------------ the clerestory: a dusk sky through a portal pane (sky-only scene)
  const portal = createTerrainPortal({ renderer, lite });
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: SUN }, t: { value: 0 } },
    vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader: `uniform vec3 sun;uniform float t;varying vec3 vD;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+1.7;a*=.5;}return s;}
      void main(){float y=max(vD.y,0.),s=max(dot(vD,sun),0.);
        vec3 c=mix(vec3(1.,.55,.28),vec3(.42,.38,.55),smoothstep(.0,.22,y));c=mix(c,vec3(.07,.09,.2),smoothstep(.2,.75,y));
        c+=vec3(1.,.5,.22)*pow(s,8.)*.9*(1.-y);
        if(vD.y>0.){vec2 uv=vD.xz/(vD.y+.08)*.6+vec2(t*.004,0.);float d=fbm(uv*1.4);float cov=smoothstep(.52,.78,d)*smoothstep(0.,.1,vD.y);
          vec3 cc=mix(vec3(.25,.2,.28),vec3(1.,.55,.38),pow(s,2.)*.8+.15*(1.-y));c=mix(c,cc,cov*.8);}
        gl_FragColor=vec4(c,1.);}` });
  portal.scene.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat), { frustumCulled: false }));
  const pane = portal.windowMaterial({ top: '#1c2140', mid: '#6a5470', bottom: '#e08a52' });
  const cler = pane.attach(new THREE.Mesh(new THREE.PlaneGeometry(CLER.x1 - CLER.x0, CLER.y1 - CLER.y0), pane.material)); cler.position.set((CLER.x0 + CLER.x1) / 2, (CLER.y0 + CLER.y1) / 2, R.z1 + .01); group.add(cler);
  for (let x = CLER.x0; x <= CLER.x1 + .01; x += (CLER.x1 - CLER.x0) / 10) box(bronze, .06, CLER.y1 - CLER.y0, .1, x, (CLER.y0 + CLER.y1) / 2, R.z1 + .06);
  box(bronze, CLER.x1 - CLER.x0, .05, .14, (CLER.x0 + CLER.x1) / 2, CLER.y0, R.z1 + .08);

  // ------------------------------------------------------------ the bridge: three instanced slab pools that re-stack per scenario
  const CAP = { stone: 40, gain: 24, loss: 24 };
  const slabGeo = new RoundedBoxGeometry(BW, T - .012, BD, 2, .012);                     // a visible joint between every €1,000
  const lossMat = E(new THREE.MeshPhysicalMaterial({ color: '#2b2a2c', roughness: .25, metalness: .1, transparent: true, opacity: .55, clearcoat: 1, depthWrite: false }));
  const pools = Object.fromEntries(Object.entries({ stone: limestone, gain: oak, loss: lossMat }).map(([k, mat]) => {
    const im = new THREE.InstancedMesh(slabGeo, mat, CAP[k]); im.castShadow = k !== 'loss' && !lite; im.receiveShadow = true; im.frustumCulled = false; group.add(im);
    for (let i = 0; i < CAP[k]; i++) { im.setMatrixAt(i, M4.makeScale(0, 0, 0)); im.setColorAt(i, new THREE.Color().setScalar(i % 5 === 4 ? .82 : 1)); }   // hidden until placed; every fifth slab a shade darker (€5,000 courses)
    const cur = Array.from({ length: CAP[k] }, () => ({ x: CX, y: -1, s: 0 })), tgt = cur.map(c => ({ ...c }));
    return [k, { im, cur, tgt }];
  }));
  const conn = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .012, .05), bronze, 4); conn.frustumCulled = false; group.add(conn);
  const connCur = Array.from({ length: 4 }, () => ({ y: BASE })), connTgt = connCur.map(c => ({ ...c }));
  for (const x of BARS) { put(oakDark, new RoundedBoxGeometry(BW + .3, BASE, BD + .3, 1, .02), x, BASE / 2, SZ); }
  // labels: one canvas per bar, redrawn when the scenario changes, on the plinth's two long faces
  const labels = BARS.map((x, i) => { const c = document.createElement('canvas'); c.width = 768; c.height = 256; const t = tex(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(BW + .2, (BW + .2) / 3), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
    m.position.set(x, BASE + .002, SZ + BD / 2 + .62); m.rotation.x = -Math.PI / 2; group.add(m);
    return { c, t, m }; });
  let current = 'plan';
  function layout(id) {
    const s = SCEN[id], k = v => Math.round(v / 1000), steps = [k(s.volumeEffect), k(s.priceEffect), k(s.costEffect)], use = { stone: 0, gain: 0, loss: 0 };
    const place = (pool, x, i) => { const p = pools[pool], n = use[pool]++; if (n >= CAP[pool]) return; Object.assign(p.tgt[n], { x, y: BASE + i * T + T / 2, s: 1 }); };
    const plan = k(SCEN.plan.profit);
    for (let i = 0; i < plan; i++) place('stone', BARS[0], i);
    let run = plan; const tops = [plan];
    steps.forEach((d, j) => { const x = BARS[j + 1]; if (d > 0) for (let i = run; i < run + d; i++) place('gain', x, i); else for (let i = run + d; i < run; i++) place('loss', x, i); run += d; tops.push(run); });
    const res = k(s.profit); for (let i = 0; i < res; i++) place('stone', BARS[4], i);
    for (const [pool, p] of Object.entries(pools)) for (let n = use[pool]; n < CAP[pool]; n++) Object.assign(p.tgt[n], { s: 0 });
    tops.forEach((top, j) => { connTgt[j].y = BASE + top * T + .006; });
    // labels
    const L = [['THE PLAN', eur(SCEN.plan.profit), 'profit before any change'], ['UNITS SOLD', signed(s.volumeEffect), `${s.units.toLocaleString('en-GB')} units`], ['SELLING PRICE', signed(s.priceEffect), `€${s.price} each`], ['COST PER UNIT', signed(s.costEffect), `€${s.cost} each`], ['NEW PROFIT', eur(s.profit), s.change ? `${signed(s.change)} against the plan` : 'unchanged']];
    labels.forEach(({ c, t }, i) => { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.fillStyle = 'rgba(28,24,20,.82)'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = 'rgba(236,228,214,.7)'; g.font = `600 30px ${FONT}`; g.letterSpacing = '5px'; g.fillText(L[i][0], 36, 64);
      const v = i === 0 || i === 4 ? 0 : [s.volumeEffect, s.priceEffect, s.costEffect][i - 1];
      g.fillStyle = v > 0 ? '#e7c48d' : v < 0 ? '#d98c7e' : '#f2ebdf'; g.font = `700 92px ${SERIF}`; g.letterSpacing = '0px'; g.fillText(L[i][1], 32, 170);
      g.fillStyle = 'rgba(236,228,214,.55)'; g.font = `500 26px ${FONT}`; g.fillText(L[i][2], 36, 222); t.needsUpdate = true; });
    plinthScreens.forEach(p => p.draw(p.id === id));
    current = id; envDirty = Math.max(envDirty, 40);
  }
  info(Object.values(pools).map(p => p.im), { model: act => bridgeCard(act), eyebrow: 'THE PROFIT BRIDGE', title: 'One slab per €1,000.', sub: 'Plan · units · price · cost · new profit', text: 'Tap a plinth to change the scenario.' });

  // ------------------------------------------------------------ header type on the north wall
  const head = lettering(16, 1.6, g => { g.fillStyle = 'rgba(246,238,224,.86)'; g.font = `italic 300 .7px ${SERIF}`; g.fillText('Before we choose, what changes?', .1, .85);
    g.fillStyle = 'rgba(246,238,224,.5)'; g.font = `500 .15px ${FONT}`; g.letterSpacing = '.05px'; g.fillText('THE DECISION ROOM · ONE INVENTED PRODUCT · EVERY FIGURE IS EXAMPLE DATA', .14, 1.32); }, 4096);
  head.rotation.y = Math.PI; head.position.set(R.x0 + 9.3, 4.4, R.z0 - .17); group.add(head);

  // ------------------------------------------------------------ scenario plinths (shared library), screens drawn per scenario
  const PL = decor.items.find(d => d.id === 'scenario-plinths'), COL = decor.items.find(d => d.id === 'signal-columns');
  const plinthScreens = [];
  const scenOrder = ['volume', 'price', 'cost'];
  function screenFor(id, x, z, ry, face) {
    const c = document.createElement('canvas'); c.width = 768; c.height = 432; const t = tex(c);
    // the plinth's own screen lies flat under its glass; a standing display tilted toward the walkway is what a visitor reads
    const holder = new THREE.Group(); holder.position.set(x, face.top + .36, z); holder.rotation.set(-.42, Math.PI, 0, 'YXZ'); group.add(holder);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .5625), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.z = .02; holder.add(m);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.06, .62, .03), bronze); frame.castShadow = !lite; holder.add(frame);
    put(bronze, new THREE.BoxGeometry(.05, .3, .05), x, face.top + .12, z + .08);
    const s = SCEN[id];
    const draw = active => { const g = c.getContext('2d'), w = c.width, h = c.height; g.fillStyle = active ? '#14231c' : '#0d1013'; g.fillRect(0, 0, w, h);
      g.fillStyle = active ? '#9fe3b6' : 'rgba(230,236,244,.6)'; g.font = `600 26px ${FONT}`; g.letterSpacing = '4px'; g.fillText(active ? 'ON THE BRIDGE NOW' : 'SCENARIO', 34, 52);
      g.fillStyle = '#f2ece2'; g.font = `700 54px ${FONT}`; g.letterSpacing = '0px'; g.fillText(s.label, 34, 120);
      g.fillStyle = 'rgba(242,236,226,.7)'; g.font = `500 28px ${FONT}`; g.fillText(`${s.units.toLocaleString('en-GB')} units × €${s.price}  ·  cost €${s.cost}/unit  ·  fixed €25,000`, 34, 178);
      g.fillText(`Revenue ${eur(s.revenue)}   Costs ${eur(s.expenses)}`, 34, 226);
      g.fillStyle = s.change >= 0 ? '#e7c48d' : '#d98c7e'; g.font = `700 76px ${SERIF}`; g.fillText(eur(s.profit), 34, 330);
      g.fillStyle = 'rgba(242,236,226,.6)'; g.font = `500 28px ${FONT}`; g.fillText(`profit · ${signed(s.change)} against the plan`, 34, 380); t.needsUpdate = true; };
    const rec = info(m, { model: act => scenarioCard(id, act), eyebrow: 'A SCENARIO · EXAMPLE DATA', title: s.label, sub: `Profit ${eur(s.profit)} (${signed(s.change)})`, text: 'Tap to put it on the bridge.' });
    plinthScreens.push({ id, draw, mesh: m, rec });
  }

  // ------------------------------------------------------------ signal columns (shared library): lamps lit per rule
  const inputs = { ...data.alerts.example_inputs };
  let lampMeshes = null, amberUntil = 0, lampSig = '';
  const LAMP = { C_SignalGreen: new THREE.Color('#38e07b'), C_SignalAmber: new THREE.Color('#ffb02e'), C_SignalRed: new THREE.Color('#ff3b30') };
  function setLamps(t = 0) {
    if (!lampMeshes) return;
    const sig = RULES.map(r => +breached(r, inputs[r.id])).join('') + (t < amberUntil ? 'a' : ''); if (sig === lampSig) return; lampSig = sig;
    RULES.forEach((r, i) => { const red = breached(r, inputs[r.id]), amber = t < amberUntil;
      for (const [name, im] of Object.entries(lampMeshes)) { const on = name === 'C_SignalAmber' ? amber : name === 'C_SignalRed' ? red && !amber : !red && !amber;
        im.setColorAt(i, LAMP[name].clone().multiplyScalar(on ? 2.2 : .06)); im.instanceColor.needsUpdate = true; } });
    plaques.forEach(p => p.draw());
  }
  const plaques = RULES.map((r, i) => { const [x, , z] = COL.at[i], c = document.createElement('canvas'); c.width = 640; c.height = 360; const t = tex(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .675), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(x, 1.05, z + .55); m.rotation.x = -.35; group.add(m);
    box(blackSteel, .05, .9, .05, x, .45, z + .62); box(blackSteel, .4, .03, .3, x, .015, z + .62);
    const fmt = v => r.unit === 'EUR' ? eur(v) : `${v}%`;
    const draw = () => { const g = c.getContext('2d'), red = breached(r, inputs[r.id]); g.fillStyle = '#0d0f12'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = 'rgba(236,240,245,.6)'; g.font = `600 24px ${FONT}`; g.letterSpacing = '4px'; g.fillText('WARNING RULE', 30, 46);
      g.fillStyle = '#f2ece2'; g.font = `700 44px ${FONT}`; g.letterSpacing = '0px'; g.fillText(r.label, 30, 104);
      g.fillStyle = 'rgba(242,236,226,.7)'; g.font = `500 26px ${FONT}`; g.fillText(`Warns when ${r.breach} ${r.unit === 'EUR' ? eur(r.threshold) : r.threshold + '%'}${r.unit === '% of revenue' ? ' of revenue' : ''}`, 30, 150);
      g.fillStyle = red ? '#ff6a5e' : '#5fe39a'; g.font = `700 72px ${SERIF}`; g.fillText(fmt(inputs[r.id]), 30, 250);
      g.font = `600 26px ${FONT}`; g.fillText(red ? 'WARNING' : 'WITHIN LIMIT', 30, 310); t.needsUpdate = true; };
    info(m, { model: act => rulesCard(act), eyebrow: 'A WARNING RULE', title: r.text, sub: `Example input ${fmt(inputs[r.id])}`, text: 'Tap to stress the plan.' });
    obstacles.push({ c: [x, z], r: .5 });
    return { draw }; });
  // the stress lectern
  { const x = 19.1, z = -13.9; put(oak, new RoundedBoxGeometry(.7, 1.0, .5, 2, .02), x, .5, z); put(oakDark, new RoundedBoxGeometry(.8, .05, .6, 2, .01), x, 1.04, z, -.25, 0, 0);
    const c = canvas(512, 384, (g, w, h) => { g.fillStyle = '#e9e1d1'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a241d'; g.font = `700 40px ${FONT}`; g.fillText('STRESS THE PLAN', 30, 70);
      g.font = `italic 400 30px ${SERIF}`; g.fillStyle = 'rgba(42,36,29,.75)'; ['Move one example input', 'across its threshold', 'and watch a column turn.'].forEach((t, k) => g.fillText(t, 30, 140 + k * 46)); g.font = `500 20px ${FONT}`; g.fillText('EXAMPLE VALUES, NOT FORECASTS', 30, 340); });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(.66, .495), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .8 })); card.position.set(x, 1.075, z + .02); card.rotation.x = -Math.PI / 2 + .25; group.add(card);
    info(card, { model: act => rulesCard(act), eyebrow: 'THE LECTERN', title: 'Stress the plan.', sub: 'Move one input across its threshold', text: 'Example values, not forecasts.' });
    obstacles.push({ c: [x, z], r: .55 }); }

  // ------------------------------------------------------------ quiet details: benches, planters, pendants (light is faked)
  const benchAt = [[15.5, -8.6], [28.9, -8.6]];
  for (const [x, z] of benchAt) { put(oak, new RoundedBoxGeometry(2.4, .08, .5, 2, .02), x, .46, z); for (const dx of [-1, 1]) put(oakDark, new RoundedBoxGeometry(.08, .42, .44, 1, .01), x + dx * 1.05, .21, z); obstacles.push({ box: [x - 1.25, x + 1.25, z - .3, z + .3] }); }
  const potMat = E(new THREE.MeshStandardMaterial({ color: '#3a3430', roughness: .7 })), leaf = new THREE.MeshStandardMaterial({ color: '#2f4a2c', roughness: .8, side: THREE.DoubleSide });
  for (const [x, z] of [[8.6, -5.0], [34.4, -5.0], [8.6, -16.7], [34.4, -16.7]]) { put(potMat, new THREE.CylinderGeometry(.34, .26, .62, 20), x, .31, z);
    for (let i = 0; i < 14; i++) { const a = rand() * 6.283, l = .6 + rand() * .5; put(leaf, new THREE.PlaneGeometry(.12, l).translate(0, l / 2, 0), x + Math.cos(a) * .05, .6, z + Math.sin(a) * .05, Math.cos(a) * (.3 + rand() * .4), a, Math.sin(a) * (.3 + rand() * .4)); }
    obstacles.push({ c: [x, z], r: .45 }); }
  const pend = BARS.map(x => [x, SZ]).concat([[15.5, -6.6], [22.2, -6.6], [28.9, -6.6], [16, -14.6], [22.2, -14.6], [28.4, -14.6]]);
  for (const [x, z] of pend) { const y = z === SZ ? 3.7 : 3.1; put(blackSteel, new THREE.CylinderGeometry(.006, .006, H - y - .2, 4), x, (H + y) / 2 - .1, z); put(bronze, new THREE.ConeGeometry(.22, .2, 24, 1, true), x, y + .1, z); put(lampWarm, new THREE.CircleGeometry(.17, 20), x, y + .005, z, Math.PI / 2, 0, 0); }
  const glowT = tex(canvas(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const poolM = new THREE.MeshBasicMaterial({ map: glowT, color: '#ffd9a8', transparent: true, opacity: lite ? .52 : .46, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  for (const [x, z] of pend) put(poolM, new THREE.PlaneGeometry(z === SZ ? 3.2 : 2.6, z === SZ ? 2.4 : 2.0), x, .02, z, -Math.PI / 2, 0, 0);
  const washT = tex(canvas(128, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, 0, 4, w / 2, 30, h); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.26)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const washM = new THREE.MeshBasicMaterial({ map: washT, color: '#ffd9ae', transparent: true, opacity: lite ? .4 : .34, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const x of [12, 17, 22.2, 27.4, 32.4]) put(washM, new THREE.PlaneGeometry(3.4, 4.2), x, H - 2.4, R.z0 - .16, 0, Math.PI, 0);
  const dust = motes({ n: lite ? 40 : 110, box: [10, 33, .5, 5.5, -16, -6], color: '#ffe0b8', size: .022, rise: .015, sway: .2, opacity: .45, seed: 47 }); group.add(dust.points);
  obstacles.push({ box: [BARS[0] - BW / 2 - .3, BARS[4] + BW / 2 + .3, SZ - BD / 2 - .3, SZ + BD / 2 + .3] });

  flush(true);

  // ------------------------------------------------------------ hall-side sign over the door
  const sign = lettering(4.6, .9, g => { g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('THE DECISION ROOM', 0, .28);
    g.fillStyle = '#7a5a2e'; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Before we choose, what changes?', 0, .69); }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ light: one dusk sun (shadowed), one area light from the clerestory; the rest is faked
  if (!rectLib) { RectAreaLightUniformsLib.init(); rectLib = true; }
  const sun = new THREE.DirectionalLight('#ffad6b', lite ? 1.2 : 2.4); sun.target.position.set(22, 0, -9); sun.position.copy(sun.target.position).addScaledVector(SUN, 40); group.add(sun, sun.target);
  if (!lite) { sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 10; sc.bottom = -10; sc.near = 5; sc.far = 90; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0003; sun.shadow.normalBias = .02; }
  const sky = new THREE.RectAreaLight('#8f8fb8', lite ? 2.4 : 1.6, CLER.x1 - CLER.x0, CLER.y1 - CLER.y0); sky.position.set((CLER.x0 + CLER.x1) / 2, (CLER.y0 + CLER.y1) / 2, R.z1 + .2); sky.lookAt((CLER.x0 + CLER.x1) / 2, 1.0, R.z0); group.add(sky);

  // ------------------------------------------------------------ shared-library assets: plinths, columns, mirror, telescope, globe
  let ready = false, envDirty = 1;
  const envCap = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(CX, 1.6, -9.5), lite, mats: envMats, hidePoints: true });
  const keep = (m, name) => { const c = m.clone(); c.envMapIntensity = .6; if (name === 'C_Mirror') { c.metalness = 1; c.roughness = .04; c.color?.set('#d8dcde'); c.envMapIntensity = 1.4; } return E(c); };
  async function useAssets(loader) {
    const load = async n => (await loader.loadAsync(DECISION_ASSETS.dir + n + '.glb')).scene;
    // plinths: instanced; the screen's face is measured from the C_Screen geometry, then a canvas pane is laid on it
    const plinth = bake(await load('data_plinth'), { keep: ['position', 'normal', 'uv'] });
    const sg = mergeGeometries(plinth.byMat.get('C_Screen').list); sg.computeBoundingBox();
    const face = { top: sg.boundingBox.max.y }, yaw = 0;
    instance(plinth, PL.at, { group, castShadow: !lite, materialFor: (m, name) => name === 'C_Screen' ? new THREE.MeshBasicMaterial({ color: '#0b1014' })
      : name === 'C_Glass' ? E(new THREE.MeshPhysicalMaterial({ color: '#dfe8ec', roughness: .05, transparent: true, opacity: .25, depthWrite: false })) : keep(m, name) });
    PL.at.forEach(([x, , z], i) => { screenFor(scenOrder[i], x, z, yaw, face); obstacles.push({ c: [x, z], r: .75 }); });
    flush(true);                                                        // the display frames, merged
    // columns: instanced, scaled; lamps become per-instance colours
    const column = bake(await load('signal_column'), { keep: ['position', 'normal', 'uv'] });
    lampMeshes = {};
    const cm = instance(column, COL.at, { group, castShadow: !lite, materialFor: (m, name) => LAMP[name] ? new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }) : keep(m, name),
      colors: (i, name) => LAMP[name] ? LAMP[name].clone().multiplyScalar(.06) : new THREE.Color(1, 1, 1) });
    [...column.byMat.keys()].forEach((name, k) => { if (LAMP[name]) lampMeshes[name] = cm[k]; });
    info(cm, { model: act => rulesCard(act), eyebrow: 'SIGNAL COLUMNS', title: 'Three warning rules.', sub: 'Green within limit · red when a rule fires', text: 'Tap to stress the plan.' });
    // details
    for (const id of ['mirror', 'telescope', 'globe']) { const item = decor.items.find(d => d.id === id); const b = bake(await load(item.ref), { keep: ['position', 'normal', 'uv'] }); instance(b, item.at, { group, castShadow: !lite && id !== 'mirror', materialFor: keep }); }
    layout(current); setLamps(); ready = true; envDirty = 3;
  }

  // ------------------------------------------------------------ cards
  const truth = { cls: 'G', text: 'Every figure in this room is invented example data for one imaginary product. It is not company, employer or client data, and not a forecast.' };
  const model = { cls: 'I', text: 'Example model: 1,000 units × €100, cost €60 per unit, fixed costs €25,000 → revenue €100,000, costs €85,000, profit €15,000. Copied from the portfolio’s finance model.' };
  const rules = { cls: 'P', text: 'Warning thresholds are the FP&A metric monitor’s own rules (fp-a-metric-monitor monitor.py at ce782a4): margin below 25%; monthly cash use above €150,000; unpaid invoices above 40% of revenue.' };
  const indep = { cls: 'G', text: 'An independent KONA.m concept room. No live data, account or API connection.' };
  const back = act => ({ label: 'Back to the room', primary: true, onClick: () => act.close() });
  const choose = (id, act) => ({ label: SCEN[id].label, onClick: () => { layout(id); act.close(); } });
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'AN INDEPENDENT ROOM · THE DECISION ROOM', title: 'Before we choose, what changes?', kicker: 'Every figure here is invented example data',
      lede: 'A planning decision turned into a place. The stone bridge down the middle is the plan’s profit, one slab per €1,000, and what each change does to it. Choose a scenario on a plinth and the bridge re-stacks. The columns by the south wall light up when a warning rule fires.',
      facts: [truth, model, rules, indep], actions: [{ label: 'Walk to the bridge →', primary: true, onClick: () => act.close() }, ...scenOrder.map(id => choose(id, act))] };
  }
  function bridgeCard(act) {
    const s = SCEN[current];
    return { kind: 'beast', eyebrow: 'THE PROFIT BRIDGE · EXAMPLE DATA', title: current === 'plan' ? 'The plan: €15,000 profit.' : `${s.label}: ${eur(s.profit)}.`, kicker: `Units ${signed(s.volumeEffect)} · price ${signed(s.priceEffect)} · cost ${signed(s.costEffect)}`,
      lede: 'Read left to right: the plan’s profit, then what units sold, selling price and cost per unit each add or take away, then the profit that results. Oak slabs are gains; dark glass slabs are what a change takes away.',
      facts: [truth, model], actions: [back(act), ...['plan', ...scenOrder].filter(id => id !== current).map(id => choose(id, act))] };
  }
  function scenarioCard(id, act) {
    const s = SCEN[id];
    return { kind: 'beast', eyebrow: 'A SCENARIO · EXAMPLE DATA', title: s.label, kicker: `Revenue ${eur(s.revenue)} · costs ${eur(s.expenses)} · profit ${eur(s.profit)}`,
      lede: `${s.units.toLocaleString('en-GB')} units at €${s.price}, cost €${s.cost} per unit, fixed costs €25,000. Against the plan, profit ${s.change > 0 ? 'rises' : 'falls'} by ${eur(Math.abs(s.change))}.`,
      facts: [truth, model], actions: [{ label: 'Put it on the bridge', primary: true, onClick: () => { layout(id); act.close(); } }, { label: 'Back to the plan', onClick: () => { layout('plan'); act.close(); } }] };
  }
  function rulesCard(act) {
    const st = data.alerts.stress_examples, fmt = (r, v) => r.unit === 'EUR' ? eur(v) : `${v}%`;
    return { kind: 'beast', eyebrow: 'WARNING RULES · EXAMPLE DATA', title: 'What would make us stop?', kicker: RULES.map(r => `${r.label} ${fmt(r, inputs[r.id])}`).join(' · '),
      lede: 'Three rules from an FP&A metric monitor. With the example inputs every column is green. Stress one input across its threshold and its column turns red.',
      facts: [rules, { cls: 'I', text: data.alerts.stress_note }, truth],
      actions: [...RULES.map(r => ({ label: inputs[r.id] === st[r.id] ? `Restore ${r.label.toLowerCase()}` : `Stress ${r.label.toLowerCase()} → ${fmt(r, st[r.id])}`,
        onClick: () => { inputs[r.id] = inputs[r.id] === st[r.id] ? data.alerts.example_inputs[r.id] : st[r.id]; amberUntil = performance.now() / 1000 + .7; act.close(); } })),
        { label: 'Back to the example', onClick: () => { Object.assign(inputs, data.alerts.example_inputs); amberUntil = performance.now() / 1000 + .7; act.close(); } }] };
  }

  // ------------------------------------------------------------ host interface
  const bikeSpot = { kind: 'beast', pos: new THREE.Vector3(BARS[2], 0, SZ), rotY: 0, bike: group };
  const arrival = () => decor.shots[coarse && innerHeight > innerWidth ? 'heroPortrait' : 'hero'];
  Object.defineProperties(bikeSpot, { view: { get() { const s = arrival(); return new THREE.Vector3(s[0], 0, s[1]); } }, face: { get() { const s = arrival(); return new THREE.Vector3(s[3], s[4], s[5]); } } });
  bikeSpot.info = infos[0];
  return {
    group, floor, sign, bikeSpot, infos, mood: DECISION_MOOD, ownBikes: true, introCard,
    async useAssets(loader) { if (this._assets) return; this._assets = true; try { await useAssets(loader); } catch (e) { console.warn('decision room assets', e?.message || e); } },
    setBike() {},
    get ready() { return ready; },
    get scenario() { return current; },
    setScenario(id) { if (SCEN[id]) layout(id); },                     // evidence tooling and automation
    resetStress() { Object.assign(inputs, data.alerts.example_inputs); amberUntil = 0; },
    stress(id, on = true) { const r = RULES.find(q => q.id === id); if (r) { inputs[id] = on ? data.alerts.stress_examples[id] : data.alerts.example_inputs[id]; amberUntil = 0; } },
    update(t, reduce, dt = 1 / 60) {
      portal.frame();
      if (envDirty) { envDirty--; if (!envDirty) portal.capture(() => envCap.capture()); }
      skyMat.uniforms.t.value = reduce ? 0 : t;
      const k = reduce ? 1 : Math.min(1, dt * 5);
      for (const [pool, p] of Object.entries(pools)) { let dirty = false;
        p.cur.forEach((c, i) => { const g = p.tgt[i]; if (Math.abs(c.x - g.x) + Math.abs(c.y - g.y) + Math.abs(c.s - g.s) < 1e-4) return; dirty = true;
          if (c.s < .01 && g.s > 0) { c.x = g.x; c.y = g.y + .6; }                                         // new slabs drop in from just above
          c.x += (g.x - c.x) * k; c.y += (g.y - c.y) * k; c.s += (g.s - c.s) * k;
          p.im.setMatrixAt(i, M4.compose(V.set(c.x, c.y, SZ), Q.identity(), S.set(Math.max(.001, c.s), Math.max(.001, c.s), Math.max(.001, c.s)))); });
        if (dirty) p.im.instanceMatrix.needsUpdate = true; }
      connCur.forEach((c, j) => { c.y += (connTgt[j].y - c.y) * k; conn.setMatrixAt(j, M4.compose(V.set((BARS[j] + BARS[j + 1]) / 2, c.y, SZ - BD / 2 - .02), Q.identity(), S.set(BARS[j + 1] - BARS[j] - BW + .2, 1, 1))); });
      conn.instanceMatrix.needsUpdate = true;
      setLamps(performance.now() / 1000);
      if (!reduce) dust.step(t);
      return { power: 0, heat: 0, riding: false };
    },
  };
}
