// norseman-training.js — FJORD TO SUMMIT · a Norseman training room (review room, ?reviewRoom=norseman-training).
//
// A training room, not a race replica. The spine of the room is the course profile, built as a long stone ridge
// that runs from a ferry ramp and a strip of cold fjord water at the door to a summit at the far wall. Either side
// of it stand the three things you prepare: a cold-water pool and wetsuit rack (swim), a road-triathlon bike on a
// climbing trainer and a second one on the work stand (bike), and an incline treadmill facing the summit (run).
// Along the north wall: the crew table, the mandatory summit backpack, an example training week, and the two
// finisher tops. At the end, a painted dawn over a mountain.
//
// Truth / rights: every fact shown comes from pitch/norseman-training/course-facts-v1.json (sourced). The profile's
// anchor heights are sourced; the line between them, the plateau and the horizontal spacing are interpretation and
// say so. The training week is a KONA.m example, not coaching advice. No official logo, mark or photography: the
// backdrop is painted in code. The bikes are unbranded KONA.m atlas studies; the treadmill and fan are the Beast
// Cave's generated equipment, reused.
//
// Efficiency: static architecture merged per material; bikes instanced from the decor manifest; water, the profile's
// light line and the mist animate on the GPU; one shadow-casting key; one local reflection capture.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import facts from '../../pitch/norseman-training/course-facts-v1.json' with { type: 'json' };
import decor from '../../world/konam/rooms/norseman-training.decor.json' with { type: 'json' };
import { BROOM, BDOOR } from './beast-cave.js';
import { loadDecor } from './engine/decor.js';
import { localEnvCapture } from './engine/env-capture.js';
import { motes, lightShaft } from './roomkit.js';

export const NORSEMAN_MOOD = Object.freeze({ exposure: 1.0, hemi: .12, sun: .03, fog: { near: 12, far: 52 }, fogColor: new THREE.Color('#0b1017') });

const rng = (seed = 0x2E05E) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true, repeat) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };
let rectLib = false;

// The profile, as the room draws it. Heights at the anchors are sourced (facts.profile.anchors); everything between
// them is interpretation. x runs from the ferry ramp to the summit wall; each leg gets its own stretch of the room.
const LEGS = {
  swim: { x0: 9.6, x1: 12.4, km: 3.8, pts: [[0, 0], [3.8, 0]] },
  bike: { x0: 13.4, x1: 26.0, km: 180, pts: [[0, 0], [40, 1200], [58, 1080], [78, 1190], [100, 1040], [122, 1150], [142, 960], [160, 610], [180, 190]] },
  run: { x0: 27.0, x1: 33.4, km: 42.2, pts: [[0, 190], [25, 190], [31, 470], [37, 1010], [40, 1380], [42.2, 1880]], back: 1.2 },   // back: the far side of the summit, falling to the floor
};
const SUMMIT_M = facts.facts.summit.value_m, VSCALE = 2.3 / SUMMIT_M, BASE = .16;   // 1,880 m → 2.3 m of stone over a .16 m plinth
const yOf = m => BASE + m * VSCALE;
const xOf = (leg, km) => LEGS[leg].x0 + (LEGS[leg].x1 - LEGS[leg].x0) * km / LEGS[leg].km;
const heightAt = (leg, km) => { const p = LEGS[leg].pts; for (let i = 1; i < p.length; i++) if (km <= p[i][0]) { const [k0, m0] = p[i - 1], [k1, m1] = p[i]; return m0 + (m1 - m0) * (km - k0) / Math.max(1e-6, k1 - k0); } return p[p.length - 1][1]; };

export function buildNorsemanTraining(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);        // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2;
  const SZ = -11.6, SW = .9;                                            // the spine: centre line and width
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
  const panelC = canvas(512, 512, (g, w, h) => { g.fillStyle = '#151a1f'; g.fillRect(0, 0, w, h); const r = rng(7);
    for (let i = 0; i < 2600; i++) { const v = 18 + r() * 16; g.fillStyle = `rgba(${v},${v + 3},${v + 7},${.25 + r() * .3})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3); });
  const wallMat = new THREE.MeshStandardMaterial({ map: tex(panelC, true, [RW / 1.6, R.h / 1.6]), color: '#8a939c', roughness: .84, metalness: .05, envMapIntensity: .25 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#0b0e12', roughness: .92, metalness: .1 });
  const steel = E(new THREE.MeshStandardMaterial({ color: '#171b1f', roughness: .38, metalness: .85 }));
  const brushed = E(new THREE.MeshStandardMaterial({ color: '#9aa2aa', roughness: .3, metalness: 1 }));
  const ledCold = new THREE.MeshBasicMaterial({ color: '#dbe9ff', toneMapped: false });
  const ledWarm = new THREE.MeshBasicMaterial({ color: '#ffb46a', toneMapped: false });
  const hazard = new THREE.MeshBasicMaterial({ map: tex(canvas(256, 32, (g, w, h) => { g.fillStyle = '#e8b21c'; g.fillRect(0, 0, w, h); g.fillStyle = '#121212'; for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); } }), true, [4, 1]) });
  const neoprene = new THREE.MeshPhysicalMaterial({ color: '#16181b', roughness: .62, sheen: .5, sheenRoughness: .6, sheenColor: new THREE.Color('#4a5560'), clearcoat: .15 });
  const oak = new THREE.MeshStandardMaterial({ color: '#2b2018', roughness: .58, metalness: 0 });
  const stoneTop = E(new THREE.MeshPhysicalMaterial({ color: '#15171a', roughness: .3, metalness: .05, clearcoat: .6, clearcoatRoughness: .2 }));
  const snowMat = new THREE.MeshStandardMaterial({ color: '#e6edf3', roughness: .95 });
  const graniteC = canvas(256, 256, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); const r = rng(11); for (let i = 0; i < 1800; i++) { const v = r() * 255; g.fillStyle = `rgba(${v},${v},${v},.45)`; g.beginPath(); g.arc(r() * w, r() * h, .6 + r() * 2.2, 0, 7); g.fill(); } });
  const graniteBump = tex(graniteC, false); graniteBump.wrapS = graniteBump.wrapT = THREE.RepeatWrapping;
  const granite = new THREE.MeshStandardMaterial({ color: '#2a2e33', roughness: .9, bumpMap: graniteBump, bumpScale: 2 });
  const rock = (s, flat = .65, seed = rand()) => { const g = new THREE.IcosahedronGeometry(s, lite ? 1 : 2), p = g.attributes.position, n = new THREE.Vector3();
    const f = (x, y, z) => Math.sin(x * 7.1 + seed * 9) * Math.sin(y * 6.3 + seed * 5) * Math.sin(z * 5.7 + seed * 3) * .5 + Math.sin(x * 15 + y * 13 + seed * 20) * .12;
    for (let k = 0; k < p.count; k++) { n.set(p.getX(k), p.getY(k), p.getZ(k)).normalize(); const d = 1 + f(n.x, n.y, n.z) * .3; p.setXYZ(k, n.x * s * d * 1.15, n.y * s * d * flat, n.z * s * d); }
    g.computeVertexNormals(); return g; };

  // ------------------------------------------------------------ floor: dark slate, large format, a cold sheen
  const FT = 2.4, fCol = canvas(1024, 1024, (g, w, h) => { g.fillStyle = '#101317'; g.fillRect(0, 0, w, h); const r = rng(5);
    for (let k = 0; k < 4; k++) { const ox = (k % 2) * w / 2, oy = (k >> 1) * h / 2, v = 14 + r() * 6; g.fillStyle = `rgb(${v},${v + 2},${v + 5})`; g.fillRect(ox + 3, oy + 3, w / 2 - 6, h / 2 - 6); }
    for (let i = 0; i < 9000; i++) { const v = 24 + r() * 20; g.fillStyle = `rgba(${v},${v + 2},${v + 5},.35)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
    g.strokeStyle = '#050607'; g.lineWidth = 6; for (const p of [0, w / 2, w]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); } });
  const fRough = canvas(512, 512, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); const r = rng(9);
    for (let i = 0; i < 16; i++) { const x = r() * w, y = r() * h, rr = 30 + r() * 110, gr = g.createRadialGradient(x, y, 2, x, y, rr); gr.addColorStop(0, 'rgba(40,40,40,.7)'); gr.addColorStop(1, 'rgba(70,70,70,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr, rr * (.4 + r() * .5), r() * 3, 0, 7); g.fill(); } });
  const rep = [RW / FT, RD / FT];
  const floorMat = E(new THREE.MeshPhysicalMaterial({ map: tex(fCol, true, rep), roughnessMap: tex(fRough, false, rep), color: '#80868d', roughness: .6, clearcoat: .45, clearcoatRoughness: .22, envMapIntensity: .45 }));
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .16, RD), floorMat); floor.position.set(CX, -.074, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);

  // ------------------------------------------------------------ shell
  const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m; };
  wall(RW, R.h, .3, CX, R.h / 2, R.z0 + .15); wall(RW, R.h, .3, CX, R.h / 2, R.z1 - .15); wall(.3, R.h, RD, R.x1 + .15, R.h / 2, CZ);
  box(ceilMat, RW, .2, RD, CX, R.h + .1, CZ);
  // a light line in the ceiling right over the spine, cold at the fjord end and warm toward the summit
  for (let x = 9.4; x < 33.6; x += 2.0) box(x < 21 ? ledCold : ledWarm, 1.6, .02, .05, x + .8, R.h - .02, SZ);
  for (const z of [R.z0 - .9, R.z1 + .9]) { box(ceilMat, RW - 1.2, .22, .4, CX, R.h - .11, z); box(ledCold, RW - 1.6, .015, .04, CX, R.h - .23, z + (z > CZ ? -.17 : .17)); }

  // ------------------------------------------------------------ the summit wall: a dawn over a mountain, painted in code (no photograph)
  const paint = canvas(2048, 820, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0d1a2e'); sky.addColorStop(.42, '#2c4766'); sky.addColorStop(.66, '#c99a73'); sky.addColorStop(.8, '#f2c68f'); sky.addColorStop(1, '#f6d7a8');
    g.fillStyle = sky; g.fillRect(0, 0, w, h); const r = rng(31);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,250,235,${.1 + r() * .5})`; g.fillRect(r() * w, r() * h * .3, 1.5, 1.5); }
    const line = (base, amp, freq, seed, extra = () => 0) => { const ys = []; for (let x = 0; x <= w; x += 4) { const u = x / w; ys.push(base - Math.sin(u * freq + seed) * amp * .5 - Math.sin(u * freq * 2.7 + seed * 2) * amp * .25 - Math.sin(u * freq * 7.3 + seed) * amp * .08 - extra(u)); } return ys; };
    const fill = (ys, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, h); ys.forEach((y, i) => g.lineTo(i * 4, y)); g.lineTo(w, h); g.fill(); };
    fill(line(h * .62, 40, 5, 1), '#5f6f82'); fill(line(h * .68, 50, 4, 3), '#46566a');
    // the massif: a long shoulder rising from the left, a rounded top, a steep fall to the right
    const massif = u => u < .66 ? h * .5 * Math.pow(Math.max(0, (u - .2) / .46), 1.25) : h * .5 * Math.max(0, 1 - Math.pow((u - .66) / .14, 2));
    const top = line(h * .8, 30, 3, 5, massif); fill(top, '#283240');
    // light from the dawn on the left flank, snow lying in soft patches below the ridge
    g.save(); g.beginPath(); g.moveTo(0, h); top.forEach((y, i) => g.lineTo(i * 4, y)); g.lineTo(w, h); g.clip();
    const lit = g.createLinearGradient(w * .3, 0, w * .66, 0); lit.addColorStop(0, 'rgba(240,190,140,0)'); lit.addColorStop(1, 'rgba(240,190,140,.16)'); g.fillStyle = lit; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) { const u = .44 + r() * .34, x = u * w, y = top[Math.round(x / 4)] + 18 + r() * h * .16, rx = 24 + r() * 60, ry = 2 + r() * 5;
      const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, 'rgba(214,224,234,.22)'); gr.addColorStop(1, 'rgba(226,234,242,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, (r() - .5) * .6, 0, 7); g.fill(); }
    g.restore();
    // a path up the shoulder to the top, a few headlamps on it
    g.strokeStyle = 'rgba(240,226,200,.6)'; g.lineWidth = 2.5; g.setLineDash([10, 8]); g.beginPath(); const lamps = [];
    for (let k = 0; k <= 60; k++) { const u = .36 + k / 60 * .3, x = u * w + Math.sin(k * .9) * 14, y = top[Math.round(u * w / 4)] + 10 + Math.max(0, 1 - k / 60) * 26; k ? g.lineTo(x, y) : g.moveTo(x, y); if (k % 11 === 5) lamps.push([x, y]); }
    g.stroke(); g.setLineDash([]);
    for (const [gx, gy] of lamps) { const gr = g.createRadialGradient(gx, gy, 0, gx, gy, 9); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(gx - 9, gy - 9, 18, 18); }
    fill(line(h * .9, 30, 6, 7), '#151b23'); fill(line(h * .97, 20, 9, 9), '#0c1016');
    g.fillStyle = 'rgba(255,255,255,.35)'; g.font = `500 15px ${FONT}`; g.letterSpacing = '3px'; g.fillText('PAINTED IN CODE · AN INTERPRETATION, NOT A PHOTOGRAPH OF ANY PLACE', 36, h - 22);
  });
  const paintMat = new THREE.MeshBasicMaterial({ map: tex(paint), fog: false, toneMapped: false });
  const paintW = RD - .3, paintH = paintW * 820 / 2048;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(paintW, paintH), paintMat); backdrop.rotation.y = -Math.PI / 2; backdrop.position.set(R.x1 - .02, paintH / 2 + .02, CZ); group.add(backdrop);
  box(steel, .08, .08, paintW + .2, R.x1 - .06, paintH + .06, CZ);
  info(backdrop, { model: act => summitCard(act), eyebrow: 'THE SUMMIT', title: 'Gaustatoppen, about 1,880 m.', sub: 'Painted backdrop · interpretation', text: 'Where the profile ends.' });

  // ------------------------------------------------------------ the spine: the course profile as a stone ridge
  // Contour lines every 200 m of elevation glow faintly in the stone; the tint warms from fjord to summit.
  const strata = { t: { value: 0 } };
  const ridgeMat = E(new THREE.MeshStandardMaterial({ color: '#3a4048', roughness: .78, metalness: .05, bumpMap: graniteBump, bumpScale: 1.4 }));
  ridgeMat.onBeforeCompile = sh => {
    sh.uniforms.uT = strata.t;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform float uT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float m = (vW.y - ${BASE.toFixed(3)}) / ${VSCALE.toFixed(6)};                  // metres above the fjord
        float line = smoothstep(.9, 0., abs(mod(m + 100., 200.) - 100.) / 1.6) * step(20., m);
        float warm = smoothstep(${LEGS.swim.x0.toFixed(1)}, ${LEGS.run.x1.toFixed(1)}, vW.x);
        totalEmissiveRadiance += mix(vec3(.35,.6,1.), vec3(1.,.62,.3), warm) * line * .34; }`);
  };
  ridgeMat.customProgramCacheKey = () => 'norseman-strata';
  const topLine = [];                                                   // the ridge's top edge, for the light line
  for (const leg of ['bike', 'run']) {
    const L = LEGS[leg], sh = new THREE.Shape(); sh.moveTo(L.x0, 0);
    const N = 90; for (let i = 0; i <= N; i++) { const km = L.km * i / N, x = xOf(leg, km), y = yOf(heightAt(leg, km)); sh.lineTo(x, y); topLine.push(new THREE.Vector3(x, y + .012, SZ)); }
    if (L.back) { const yt = yOf(heightAt(leg, L.km)); for (let i = 1; i <= 12; i++) { const u = i / 12; sh.lineTo(L.x1 + L.back * u, yt * (1 - Math.pow(u, 1.7))); } } else sh.lineTo(L.x1, 0);
    sh.lineTo(L.x0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: SW, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 4 }); g.translate(0, 0, SZ - SW / 2);
    const m = new THREE.Mesh(g, ridgeMat); m.castShadow = !lite; m.receiveShadow = true; group.add(m);
    info(m, { model: act => profileCard(leg, act), eyebrow: leg === 'bike' ? 'THE PROFILE · BIKE' : 'THE PROFILE · RUN', title: leg === 'bike' ? '180 km over the plateau.' : '42.2 km, then up.', sub: 'Anchors sourced · line between them interpreted', text: 'Tap for what is fact and what is drawn.' });
    obstacles.push({ box: [L.x0 - .1, L.x1 + (L.back || 0) + .1, SZ - SW / 2 - .1, SZ + SW / 2 + .1] });
  }
  // the swim: a trough of fjord water at floor level between two low granite curbs, the ferry ramp at its head
  const sw = LEGS.swim, swL = sw.x1 - sw.x0, swX = (sw.x0 + sw.x1) / 2;
  for (const s of [-1, 1]) put(granite, new RoundedBoxGeometry(swL + .1, .2, .12, 2, .03), swX, .1, SZ + s * (SW / 2 + .02));
  put(granite, new RoundedBoxGeometry(.12, .2, SW + .16, 2, .03), sw.x1 + .02, .1, SZ);
  const waterMat = (deep, hi) => new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, deep: { value: new THREE.Color(deep) }, hi: { value: new THREE.Color(hi) } },
    vertexShader: 'varying vec2 vU;varying vec3 vW;void main(){vU=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float t;uniform vec3 deep,hi;varying vec2 vU;varying vec3 vW;
      float n(vec2 p){return sin(p.x*5.+t*.5)*sin(p.y*7.-t*.4)+sin((p.x+p.y)*11.+t*.8)*.5+sin((p.x-p.y)*17.-t*1.1)*.25;}
      void main(){vec2 p=vW.xz*1.3;float c=n(p)*.5+.5;float e=1.-min(min(vU.x,1.-vU.x),min(vU.y,1.-vU.y))*8.;
        vec3 col=mix(deep,hi,pow(c,5.)*.6+.08)+hi*pow(clamp(e,0.,1.),4.)*.25;gl_FragColor=vec4(col,1.);}` });
  const fjordWater = waterMat('#03101a', '#4f8fae');
  const trough = new THREE.Mesh(new THREE.PlaneGeometry(swL, SW), fjordWater); trough.rotation.x = -Math.PI / 2; trough.position.set(swX, .03, SZ); group.add(trough);
  info(trough, { model: act => swimCard(act), eyebrow: 'THE PROFILE · SWIM', title: 'It starts with a jump.', sub: 'Ferry ramp · 3.8 km to Eidfjord', text: 'The fjord end of the room.' });
  // ferry ramp: a steel plate tilted down to the water, hazard edge, two hinge drums, a rail
  put(steel, new THREE.BoxGeometry(.9, .05, SW + .3), sw.x0 - .35, .32, SZ, 0, 0, -.28);
  put(hazard, new THREE.BoxGeometry(.06, .052, SW + .3), sw.x0 + .06, .2, SZ, 0, 0, -.28);
  for (const s of [-1, 1]) { put(steel, new THREE.CylinderGeometry(.07, .07, .16, 20), sw.x0 - .78, .44, SZ + s * .42, Math.PI / 2); put(brushed, new THREE.CylinderGeometry(.02, .02, .9, 10), sw.x0 - .78, .9, SZ + s * .6); }
  put(brushed, new THREE.CylinderGeometry(.02, .02, 1.2, 10), sw.x0 - .78, 1.34, SZ, Math.PI / 2);
  box(steel, .8, .45, SW + .5, sw.x0 - 1.0, .225, SZ);
  obstacles.push({ box: [sw.x0 - 1.45, sw.x1 + .15, SZ - SW / 2 - .2, SZ + SW / 2 + .2] });

  // the light line along the top of the ridge: cold over the bike, warm over the run, a slow pulse travelling to the summit
  const lineMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: strata.t },
    vertexShader: 'varying float vX;void main(){vX=(modelMatrix*vec4(position,1.)).x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float t;varying float vX;void main(){float u=(vX-${LEGS.bike.x0.toFixed(1)})/${(LEGS.run.x1 - LEGS.bike.x0).toFixed(1)};
      vec3 c=mix(vec3(.75,.88,1.),vec3(1.,.66,.32),smoothstep(.5,.62,u));float pulse=exp(-pow((fract(t/14.)*1.15-u)*30.,2.));
      gl_FragColor=vec4(c*(.55+pulse*2.2),1.);}` });
  for (const [a, b] of [[0, 91], [91, topLine.length]]) { const pts = topLine.slice(a, b);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal', .1), pts.length * 2, .012, 6, false), lineMat); group.add(tube); }

  // anchor markers: a steel pin above the ridge and a label on each face (anchors only; the line between is drawn)
  const anchors = facts.profile.anchors;
  anchors.forEach(a => {
    const x = a.leg === 'swim' ? (a.km ? sw.x1 : sw.x0) : xOf(a.leg, a.km), top = a.leg === 'swim' ? .2 : yOf(heightAt(a.leg, a.km));
    put(brushed, new THREE.CylinderGeometry(.008, .008, .5, 6), x, top + .25, SZ);
    put(ledWarm, new THREE.SphereGeometry(.022, 10, 8), x, top + .5, SZ);
    for (const s of [-1, 1]) { const lab = lettering(1.5, .3, g => { g.fillStyle = 'rgba(236,240,245,.92)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.012px'; g.fillText(a.label, .02, .13);
        g.fillStyle = 'rgba(236,240,245,.5)'; g.font = `500 .052px ${FONT}`; g.fillText(`${a.leg.toUpperCase()} · KM ${a.km}`, .02, .22); }, 1024);
      lab.rotation.y = s > 0 ? 0 : Math.PI; lab.position.set(x + s * .75, top + .62, SZ + s * (SW / 2 + .01)); group.add(lab); }
  });
  // leg names low on the ridge's faces
  for (const [leg, text] of [['bike', 'BIKE · 180 KM'], ['run', 'RUN · 42.2 KM']]) { const L = LEGS[leg], x = L.x0 + .9;
    for (const s of [-1, 1]) { const t = lettering(2.4, .2, g => { g.fillStyle = 'rgba(232,238,245,.7)'; g.font = `700 .1px ${FONT}`; g.letterSpacing = '.03px'; g.fillText(text, .02, .14); }, 1024);
      t.rotation.y = s > 0 ? 0 : Math.PI; t.position.set(x + 1.2, .1, SZ + s * (SW / 2 + .025)); group.add(t); } }
  { const t = lettering(2.6, .2, g => { g.fillStyle = 'rgba(200,226,245,.75)'; g.font = `700 .1px ${FONT}`; g.letterSpacing = '.03px'; g.fillText('SWIM · 3.8 KM', .02, .14); }, 1024);
    t.rotation.x = -Math.PI / 2; t.position.set(swX + .3, .012, SZ + SW / 2 + .5); group.add(t); }
  // the summit: a granite cairn where the ridge meets the wall
  { const top = yOf(SUMMIT_M), sx = LEGS.run.x1;
    for (let i = 0; i < 7; i++) { const s = .07 - i * .006; put(granite, rock(s, .6), sx + .04 + (rand() - .5) * .04, top + .03 + i * .06, SZ + (rand() - .5) * .04, 0, rand() * 6); }
    put(snowMat, new THREE.SphereGeometry(.34, 12, 6, 0, 6.28, 0, 1.0), sx + .1, top - .06, SZ, 0, 0, 0, 1.2, .18, 1.2); }
  // T1 and T2 are gaps you walk through: a strip of light on the floor marks each
  for (const [x0, x1, lab] of [[sw.x1 + .1, LEGS.bike.x0, 'T1'], [LEGS.bike.x1, LEGS.run.x0, 'T2']]) {
    box(ledCold, .02, .01, SW, x0 + .02, .006, SZ); box(ledCold, .02, .01, SW, x1 - .02, .006, SZ);
    const t = lettering(.9, .4, g => { g.textAlign = 'center'; g.fillStyle = 'rgba(232,238,245,.8)'; g.font = `700 .18px ${FONT}`; g.fillText(lab, .45, .26); }, 512);
    t.rotation.x = -Math.PI / 2; t.position.set((x0 + x1) / 2, .012, SZ); group.add(t); }

  // ------------------------------------------------------------ SWIM: a counter-current pool, the wetsuit rack, the water temperature
  const pool = { x: 11.2, z: -15.6, w: 4.2, d: 2.0 };
  for (const [w, d, x, z] of [[pool.w + .4, .2, pool.x, pool.z - pool.d / 2 - .1], [pool.w + .4, .2, pool.x, pool.z + pool.d / 2 + .1], [.2, pool.d, pool.x - pool.w / 2 - .1, pool.z], [.2, pool.d, pool.x + pool.w / 2 + .1, pool.z]]) put(stoneTop, new RoundedBoxGeometry(w, .5, d, 2, .04), x, .25, z);
  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(pool.w, pool.d), waterMat('#04141f', '#6fb2cc')); poolWater.rotation.x = -Math.PI / 2; poolWater.position.set(pool.x, .42, pool.z); group.add(poolWater);
  const floatMat = new THREE.MeshStandardMaterial({ color: '#e6edf3', roughness: .5 });
  for (let i = 0; i < 18; i++) put(i % 3 ? floatMat : hazard, new THREE.SphereGeometry(.035, 10, 8), pool.x - pool.w / 2 + .1 + i * (pool.w - .2) / 17, .44, pool.z + .1);
  box(ledCold, .02, .02, pool.d - .2, pool.x + pool.w / 2 - .05, .36, pool.z);                // the current inlet at the head of the pool
  info(poolWater, { model: act => swimCard(act), eyebrow: 'SWIM · COLD WATER', title: 'Practise the cold, not just the distance.', sub: 'Counter-current pool · interpretation', text: 'Race-day water has been about 13–17 °C.' });
  obstacles.push({ box: [pool.x - pool.w / 2 - .3, pool.x + pool.w / 2 + .3, pool.z - pool.d / 2 - .3, pool.z + pool.d / 2 + .3] });
  // water temperature post: a sourced range, drawn as a thermometer
  { const x = pool.x + pool.w / 2 + .55, z = pool.z + .9, c = canvas(256, 768, (g, w, h) => { g.fillStyle = '#0e1217'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(230,236,244,.9)'; g.font = `700 30px ${FONT}`; g.fillText('WATER', 28, 56); g.font = `500 20px ${FONT}`; g.fillStyle = 'rgba(230,236,244,.6)'; g.fillText('RACE DAY, RECENT YEARS', 28, 86);
      const Y = c => 700 - (c - 5) / 20 * 560; g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(110, Y(25), 36, Y(5) - Y(25));
      g.fillStyle = '#6fb2cc'; g.fillRect(110, Y(17), 36, Y(13) - Y(17)); g.fillStyle = 'rgba(230,236,244,.85)'; g.font = `600 22px ${FONT}`;
      for (let k = 5; k <= 25; k += 5) { g.fillRect(150, Y(k) - 1, 18, 2); g.fillText(`${k}°`, 176, Y(k) + 8); }
      g.font = `800 40px ${FONT}`; g.fillStyle = '#9fd3ea'; g.fillText('13–17 °C', 28, 740); });
    box(steel, .05, 1.5, .05, x, .75, z); const p = new THREE.Mesh(new THREE.PlaneGeometry(.32, .96), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false })); p.position.set(x, 1.15, z + .03); group.add(p);
    info(p, { model: act => swimCard(act), eyebrow: 'SWIM · WATER', title: '55–62 °F on race day.', sub: 'About 13–17 °C in recent years (Slowtwitch)', text: 'A sourced range, not a forecast.' }); }
  // wetsuit rack on the north wall: wetsuit, cap, socks, gloves (unbranded neoprene studies)
  const suitShape = (sleeve = 1, legs = true) => { const s = new THREE.Shape(); s.moveTo(-.12, .74); s.lineTo(-.3, .66); s.lineTo(-.3 - .1 * sleeve, .38 - .5 * (sleeve - 1)); s.lineTo(-.22 - .08 * sleeve, .34 - .5 * (sleeve - 1)); s.lineTo(-.24, .5); s.lineTo(-.2, 0);
    if (legs) { s.lineTo(-.24, -.9); s.lineTo(-.06, -.9); s.lineTo(0, -.12); s.lineTo(.06, -.9); s.lineTo(.24, -.9); } else { s.quadraticCurveTo(0, -.03, .2, 0); }
    s.lineTo(.2, 0); s.lineTo(.24, .5); s.lineTo(.22 + .08 * sleeve, .34 - .5 * (sleeve - 1)); s.lineTo(.3 + .1 * sleeve, .38 - .5 * (sleeve - 1)); s.lineTo(.3, .66); s.lineTo(.12, .74); s.quadraticCurveTo(0, .64, -.12, .74); return s; };
  const garment = (shape, mat, x, y, z, ry = Math.PI) => { const g = new THREE.ExtrudeGeometry(shape, { depth: .04, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 3, curveSegments: 8 });
    const m = new THREE.Mesh(g, mat); m.rotation.y = ry; m.position.set(x, y, z); m.castShadow = !lite; group.add(m); return m; };
  const rackX = 11.4, rackZ = R.z0 - .12;
  box(new THREE.MeshStandardMaterial({ color: '#0a0c0f', roughness: .9 }), 3.2, 2.4, .04, rackX, 2.0, R.z0 - .02);
  box(ledCold, 3.0, .02, .03, rackX, 3.18, R.z0 - .06);
  box(brushed, 2.9, .03, .03, rackX, 2.9, rackZ - .1);
  const wetsuit = garment(suitShape(2.2, true), neoprene, rackX - .7, 2.1, rackZ - .14);
  wetsuit.scale.set(1, 1.05, 1);
  put(brushed, new THREE.TorusGeometry(.14, .008, 6, 24, Math.PI), rackX - .7, 2.88, rackZ - .12);
  put(neoprene, new THREE.SphereGeometry(.12, 20, 12, 0, 6.28, 0, 1.6), rackX + .35, 2.35, rackZ - .16, -Math.PI / 2, 0, 0, 1, 1, .8);     // swim cap, two-layer for the cold
  put(neoprene, new THREE.SphereGeometry(.105, 20, 12, 0, 6.28, 0, 1.6), rackX + .35, 2.0, rackZ - .16, -Math.PI / 2, 0, 0, 1, 1, .8);
  for (const s of [-1, 1]) { put(neoprene, new RoundedBoxGeometry(.1, .26, .14, 3, .04), rackX + .95 + s * .08, 2.2, rackZ - .14); put(neoprene, new RoundedBoxGeometry(.1, .08, .26, 3, .035), rackX + .95 + s * .08, 2.04, rackZ - .21); }
  for (const s of [-1, 1]) put(neoprene, new RoundedBoxGeometry(.11, .22, .035, 3, .015), rackX + 1.3 + s * .07, 2.45, rackZ - .14);
  const rackLab = lettering(2.8, .5, g => { g.fillStyle = 'rgba(225,233,242,.85)'; g.font = `600 .12px ${FONT}`; g.letterSpacing = '.03px'; g.fillText('SWIM · THE COLD', .05, .2); g.letterSpacing = '0px'; g.fillStyle = 'rgba(225,233,242,.55)'; g.font = `500 .07px ${FONT}`; g.fillText('WETSUIT · TWO CAPS · SOCKS · GLOVES — UNBRANDED STUDIES', .05, .36); }, 1536);
  rackLab.rotation.y = Math.PI; rackLab.position.set(rackX + 1.4, 1.2, R.z0 - .05); group.add(rackLab);
  info(wetsuit, { model: act => swimCard(act), eyebrow: 'SWIM · THE KIT', title: 'Dressed for cold water.', sub: 'Unbranded neoprene studies', text: 'What you test in training, not on race day.' });

  // ------------------------------------------------------------ BIKE: the climbing trainer, a fan, a session screen, the work stand
  const trainerAt = decor.items.find(d => d.id === 'climb-bikes').at[0], standAt = decor.items.find(d => d.id === 'climb-bikes').at[1];
  const deck = E(new THREE.MeshPhysicalMaterial({ color: '#0d0f12', roughness: .4, metalness: .2, clearcoat: .5, clearcoatRoughness: .25 }));
  box(deck, 3.4, .06, 1.9, trainerAt[0] + .3, .03, trainerAt[2]);
  for (const [w, d, x, z] of [[3.4, .03, trainerAt[0] + .3, trainerAt[2] - .95], [3.4, .03, trainerAt[0] + .3, trainerAt[2] + .95]]) box(ledCold, w, .02, d, x, .065, z);
  obstacles.push({ box: [trainerAt[0] - 1.5, trainerAt[0] + 2.1, trainerAt[2] - 1.0, trainerAt[2] + 1.0] });
  if (ctx.contactShadow) { const cs = ctx.contactShadow(2.0, .55); cs.position.set(trainerAt[0], .066, trainerAt[2]); group.add(cs); }
  // the session screen on the south wall: one long ride drawn as repeated climbs (KONA.m example)
  { const c = canvas(1280, 640, (g, w, h) => { g.fillStyle = '#070a0e'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(230,236,244,.92)'; g.font = `700 44px ${FONT}`; g.letterSpacing = '4px'; g.fillText('LONG RIDE · CLIMB, RECOVER, CLIMB', 60, 90);
      g.fillStyle = 'rgba(230,236,244,.5)'; g.font = `500 22px ${FONT}`; g.letterSpacing = '3px'; g.fillText('A KONA.M EXAMPLE SESSION · NOT COACHING ADVICE · NO RIDER DATA', 60, 130);
      const x0 = 60, x1 = w - 60, y0 = h - 90, y1 = 190; g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; for (let k = 0; k <= 4; k++) { const y = y0 - (y0 - y1) * k / 4; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
      const blocks = [[0, .08, .45], [.08, .2, .82], [.2, .26, .5], [.26, .38, .82], [.38, .44, .5], [.44, .56, .82], [.56, .62, .5], [.62, .74, .82], [.74, .86, .55], [.86, 1, .4]];
      blocks.forEach(([a, b, v]) => { g.fillStyle = v > .7 ? 'rgba(255,170,90,.85)' : 'rgba(150,190,240,.55)'; g.fillRect(x0 + (x1 - x0) * a + 2, y0 - (y0 - y1) * v, (x1 - x0) * (b - a) - 4, (y0 - y1) * v); });
      g.fillStyle = 'rgba(230,236,244,.6)'; g.font = `500 22px ${FONT}`; ['0 h', '1 h', '2 h', '3 h', '4 h', '5 h'].forEach((t, k) => g.fillText(t, x0 + (x1 - x0) * k / 5 - (k === 5 ? 40 : 0), y0 + 40));
      g.fillStyle = 'rgba(255,170,90,.9)'; g.fillText('■ LONG STEADY CLIMBS', x1 - 520, 175); g.fillStyle = 'rgba(150,190,240,.8)'; g.fillText('■ EASY BETWEEN', x1 - 230, 175); });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false })); scr.position.set(trainerAt[0] + .6, 2.2, R.z1 + .07); group.add(scr);
    box(steel, 2.72, 1.42, .06, trainerAt[0] + .6, 2.2, R.z1 + .03);
    info(scr, { model: act => bikeCard(act), eyebrow: 'BIKE · THE LONG RIDE', title: 'Climb, recover, climb.', sub: 'A KONA.m example session', text: 'Not coaching advice and not anyone’s data.' }); }
  // a work stand under the second bike: a slim post, a clamp at the seatpost, a tool tray
  { const [x, , z] = standAt; box(steel, .5, .03, .5, x - .35, .015, z); put(steel, new THREE.CylinderGeometry(.022, .026, 1.05, 12), x - .35, .54, z); put(brushed, new THREE.CylinderGeometry(.018, .018, .32, 10), x - .27, 1.06, z, 0, 0, Math.PI / 2.6);
    box(steel, .4, .03, .26, x - .35, .62, z + .2); for (let i = 0; i < 5; i++) put(brushed, new THREE.CylinderGeometry(.008, .008, .16, 6), x - .5 + i * .07, .645, z + .2, Math.PI / 2, 0, 0);
    obstacles.push({ box: [x - 1.1, x + 1.1, z - .55, z + .55] }); }

  // ------------------------------------------------------------ RUN: the incline treadmill facing the summit, a hill-session screen
  const tread = decor.items.find(d => d.id === 'hill-treadmill').at[0];
  box(deck, 2.8, .04, 1.4, tread[0], .02, tread[2]); box(ledWarm, 2.8, .02, .03, tread[0], .045, tread[2] + .7); box(ledWarm, 2.8, .02, .03, tread[0], .045, tread[2] - .7);
  obstacles.push({ box: [tread[0] - 1.5, tread[0] + 1.5, tread[2] - .75, tread[2] + .75] });
  const treadStand = new THREE.Mesh(new THREE.BoxGeometry(2.4, .3, .9), new THREE.MeshStandardMaterial({ color: '#111418', roughness: .5, metalness: .5 }));
  treadStand.position.set(tread[0], .15, tread[2]); group.add(treadStand);                                 // stand-in until the GLB lands
  { const c = canvas(1280, 640, (g, w, h) => { g.fillStyle = '#0b0807'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(244,236,226,.92)'; g.font = `700 44px ${FONT}`; g.letterSpacing = '4px'; g.fillText('RUN · LONG FLAT, THEN UP', 60, 90);
      g.fillStyle = 'rgba(244,236,226,.5)'; g.font = `500 22px ${FONT}`; g.letterSpacing = '3px'; g.fillText('A KONA.M EXAMPLE SESSION · WALK THE STEEP PARTS · NOT COACHING ADVICE', 60, 130);
      const x0 = 60, x1 = w - 60, y0 = h - 90, y1 = 200; g.strokeStyle = '#ffa868'; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x0, y0 - 30);
      g.lineTo(x0 + (x1 - x0) * .55, y0 - 34); for (let k = 0; k < 5; k++) { const a = .55 + k * .09; g.lineTo(x0 + (x1 - x0) * (a + .06), y1 + 40 + k * 4); g.lineTo(x0 + (x1 - x0) * (a + .09), y0 - 40); } g.stroke();
      g.fillStyle = 'rgba(244,236,226,.6)'; g.font = `500 22px ${FONT}`; g.fillText('EASY RUNNING FIRST', x0, y0 + 40); g.fillText('HILL REPEATS AT THE END', x0 + (x1 - x0) * .58, y0 + 40); });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false })); scr.position.set(tread[0], 2.2, R.z1 + .07); group.add(scr);
    box(steel, 2.72, 1.42, .06, tread[0], 2.2, R.z1 + .03);
    info([scr, treadStand], { model: act => runCard(act), eyebrow: 'RUN · THE HILL', title: 'Long and flat, then up.', sub: 'Incline treadmill · KONA.m example session', text: 'The run you train for is two runs.' }); }

  // ------------------------------------------------------------ GEAR & ROUTINE on the north wall: crew table, backpack, the week, the tops
  // crew table: bottles, food boxes, a cool box, layers on hooks (the crew is part of the race)
  const crew = { x: 17.2, z: R.z0 - .75 };
  box(oak, 2.4, .06, .8, crew.x, .86, crew.z); for (const dx of [-1.1, 1.1]) for (const dz of [-.32, .32]) box(steel, .04, .83, .04, crew.x + dx, .415, crew.z + dz);
  const bottleG = mergeGeometries([new THREE.CylinderGeometry(.037, .037, .2, 18).translate(0, .1, 0), new THREE.CylinderGeometry(.03, .037, .03, 18).translate(0, .215, 0)].map(g => g.toNonIndexed()));
  const bottles = new THREE.InstancedMesh(bottleG, E(new THREE.MeshPhysicalMaterial({ color: '#dfe6ec', roughness: .25, transmission: lite ? 0 : .3, transparent: true, opacity: .85, clearcoat: .7 })), 8);
  for (let i = 0; i < 8; i++) { M4.makeTranslation(crew.x - .95 + (i % 4) * .1, .89, crew.z - .1 + (i >> 2) * .12); bottles.setMatrixAt(i, M4); } group.add(bottles);
  const boxC = canvas(256, 128, (g, w, h) => { g.fillStyle = '#c9b48e'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2219'; g.font = `700 26px ${FONT}`; g.fillText('CREW · BIKE 2', 16, 48); g.font = `500 18px ${FONT}`; g.fillText('food · gels · warm layer', 16, 84); });
  const crate = new THREE.MeshStandardMaterial({ map: tex(boxC), roughness: .9 });
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.36, .18, .26), crate); b.position.set(crew.x - .25 + i * .2, .98 + (i === 1 ? .18 : 0), crew.z + (i === 1 ? 0 : .04 * i)); b.rotation.y = (i - 1) * .12; group.add(b); }
  put(new THREE.MeshStandardMaterial({ color: '#2b5e7a', roughness: .5 }), new RoundedBoxGeometry(.6, .42, .4, 3, .05), crew.x + .75, .21, crew.z + .05);    // cool box under the table
  put(new THREE.MeshStandardMaterial({ color: '#e7edf2', roughness: .4 }), new RoundedBoxGeometry(.62, .04, .42, 3, .02), crew.x + .75, .44, crew.z + .05);
  // the summit backpack: on a hook, packed (food and clothing for the mountain)
  const pack = new THREE.Group(); pack.position.set(crew.x + 1.75, 1.55, R.z0 - .2); group.add(pack);
  { const bag = new THREE.MeshPhysicalMaterial({ color: '#2a3036', roughness: .7, sheen: .5, sheenColor: new THREE.Color('#5a6670') });
    const body = new THREE.Mesh(new RoundedBoxGeometry(.34, .5, .2, 4, .08), bag); pack.add(body);
    const pocket = new THREE.Mesh(new RoundedBoxGeometry(.26, .2, .07, 3, .03), bag); pocket.position.set(0, -.1, -.12); pack.add(pocket);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(.13, .012, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: '#d58a3a', roughness: .6 })); strap.position.set(0, .25, -.02); pack.add(strap);
    pack.traverse(o => { if (o.isMesh) o.castShadow = !lite; });
    put(brushed, new THREE.CylinderGeometry(.012, .012, .14, 8), crew.x + 1.75, 1.85, R.z0 - .1, Math.PI / 2, 0, 0);
    info(pack.children, { model: act => crewCard(act), eyebrow: 'THE CLIMB · BACKPACK', title: 'Packed for the mountain.', sub: 'Emergency food and clothing', text: 'Carried on the final climb.' }); }
  // layers on hooks: a shell and a warm top (unbranded)
  const shell = new THREE.MeshPhysicalMaterial({ color: '#3a4652', roughness: .5, sheen: .4, sheenColor: new THREE.Color('#9fb0c0'), clearcoat: .3 });
  const jacket = garment(suitShape(2.0, false), shell, crew.x - 1.6, 1.75, R.z0 - .12); jacket.scale.set(.85, .85, 1);
  info(jacket, { model: act => crewCard(act), eyebrow: 'THE CREW', title: 'Nobody does this alone.', sub: 'Crew table · layers for the plateau', text: 'A support crew is required.' });
  const crewLab = lettering(2.6, .5, g => { g.fillStyle = 'rgba(225,233,242,.85)'; g.font = `600 .12px ${FONT}`; g.letterSpacing = '.03px'; g.fillText('THE CREW · THE BACKPACK', .05, .2); g.letterSpacing = '0px'; g.fillStyle = 'rgba(225,233,242,.55)'; g.font = `500 .07px ${FONT}`; g.fillText('AN UNSUPPORTED RACE: YOUR CREW IS THE AID STATION', .05, .36); }, 1536);
  crewLab.rotation.y = Math.PI; crewLab.position.set(crew.x + 1.3, 2.55, R.z0 - .03); group.add(crewLab);
  const crewPick = new THREE.Mesh(new THREE.BoxGeometry(2.4, .6, .8), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); crewPick.position.set(crew.x, 1.1, crew.z); group.add(crewPick);
  info(crewPick, { model: act => crewCard(act), eyebrow: 'THE CREW', title: 'Nobody does this alone.', sub: 'Crew table', text: 'A support crew is required.' });
  obstacles.push({ box: [crew.x - 1.3, crew.x + 1.3, crew.z - .5, R.z0] });
  // the week: a board of seven days (KONA.m example, not a plan)
  { const bx = 22.4, c = canvas(1600, 900, (g, w, h) => { g.fillStyle = '#ece9e2'; g.fillRect(0, 0, w, h); const r = rng(55);
      for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${r() * .03})`; g.fillRect(r() * w, r() * h, 2, 2); }
      g.fillStyle = '#1b1d21'; g.font = `800 52px ${FONT}`; g.letterSpacing = '4px'; g.fillText('A WEEK BUILT AROUND THE CLIMB', 70, 110);
      g.font = `500 24px ${FONT}`; g.letterSpacing = '3px'; g.fillStyle = 'rgba(27,29,33,.6)'; g.fillText('A KONA.M EXAMPLE TO READ, NOT A PLAN TO FOLLOW · NOT COACHING ADVICE', 70, 156);
      const days = [['MON', 'REST', 'walk · mobility'], ['TUE', 'COLD SWIM', 'open water, wetsuit on'], ['WED', 'HILL RUN', 'repeats, walk the top'], ['THU', 'STRENGTH', 'legs · core'], ['FRI', 'SWIM', 'technique'], ['SAT', 'LONG RIDE', 'climbs, eat on the bike'], ['SUN', 'RIDE → RUN', 'off the bike, uphill']];
      const cw = (w - 140) / 7; days.forEach(([d, t, s], k) => { const x = 70 + k * cw; g.fillStyle = k === 5 ? '#f0b27a' : k === 2 || k === 6 ? '#f3d2b4' : k === 1 || k === 4 ? '#bcd6e6' : '#d8d4cc'; g.fillRect(x + 6, 220, cw - 12, 560);
        g.fillStyle = '#1b1d21'; g.font = `800 34px ${FONT}`; g.letterSpacing = '3px'; g.fillText(d, x + 26, 280); g.font = `800 30px ${FONT}`; g.letterSpacing = '1px';
        t.split(' ').forEach((wd, i) => g.fillText(wd, x + 26, 420 + i * 40)); g.font = `italic 400 26px ${SERIF}`; g.fillStyle = 'rgba(27,29,33,.75)'; s.split(' · ').forEach((wd, i) => g.fillText(wd, x + 26, 560 + i * 34)); });
      g.fillStyle = 'rgba(27,29,33,.55)'; g.font = `500 22px ${FONT}`; g.letterSpacing = '2px'; g.fillText('COLD · CLIMB · CLIMB AGAIN · REST · REPEAT', 70, h - 60); });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.02), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .85, emissiveMap: tex(c), emissive: '#ffffff', emissiveIntensity: .12 }));
    board.rotation.y = Math.PI; board.position.set(bx, 2.15, R.z0 - .05); group.add(board); box(oak, 3.75, 2.17, .04, bx, 2.15, R.z0 - .02);
    info(board, { model: act => weekCard(act), eyebrow: 'THE ROUTINE', title: 'A week built around the climb.', sub: 'A KONA.m example, not a plan', text: 'Not coaching advice.' }); }
  // the two tops, in a lit niche: black for the summit, white for the lower course (plain, no marks)
  { const nx = 29.4, ny = 2.0, nz = R.z0 - .06;
    box(new THREE.MeshStandardMaterial({ color: '#08090b', roughness: .9 }), 2.4, 1.9, .04, nx, ny, nz - .01); box(ledWarm, 2.2, .02, .03, nx, ny + .92, nz - .05);
    const tee = suitShape(.55, false);
    const black = garment(tee, new THREE.MeshPhysicalMaterial({ color: '#111214', roughness: .85, sheen: .6, sheenColor: new THREE.Color('#555') }), nx - .5, ny - .05, nz - .12);
    const white = garment(tee, new THREE.MeshPhysicalMaterial({ color: '#e9e8e4', roughness: .9, sheen: .4, sheenColor: new THREE.Color('#fff') }), nx + .5, ny - .05, nz - .12);
    for (const m of [black, white]) m.scale.set(1, .9, 1);
    for (const x of [nx - .5, nx + .5]) put(brushed, new THREE.TorusGeometry(.14, .008, 6, 24, Math.PI), x, ny + .41, nz - .1);
    const lab = lettering(2.2, .34, g => { g.textAlign = 'center'; g.fillStyle = 'rgba(232,236,242,.85)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.02px'; g.fillText('SUMMIT', .6, .14); g.fillText('LOWER COURSE', 1.6, .14);
      g.fillStyle = 'rgba(232,236,242,.5)'; g.font = `500 .055px ${FONT}`; g.fillText('SAME DISTANCE', 1.6, .24); g.fillText('FIRST 160 AT 37 KM', .6, .24); }, 1024);
    lab.rotation.y = Math.PI; lab.position.set(nx, ny - .78, nz - .04); group.add(lab);
    info([black, white], { model: act => topsCard(act), eyebrow: 'THE FINISH', title: 'Black at the top. White below.', sub: 'Plain studies, no marks', text: 'Tap for how the course splits.' }); }

  // ------------------------------------------------------------ atmosphere: vapour over cold water, a low mist at the fjord end, scattered stones
  const vapour = motes({ n: lite ? 40 : 110, box: [pool.x - pool.w / 2, pool.x + pool.w / 2, .45, 1.8, pool.z - pool.d / 2, pool.z + pool.d / 2], color: '#cfe6f5', size: .06, rise: .12, sway: .1, opacity: .28, seed: 41 });
  group.add(vapour.points);
  const fjordMist = motes({ n: lite ? 30 : 80, box: [sw.x0 - .8, sw.x1, .05, .8, SZ - 1.2, SZ + 1.2], color: '#bcd8ea', size: .09, rise: .04, sway: .2, opacity: .2, seed: 43 });
  group.add(fjordMist.points);
  for (let i = 0; i < 14; i++) { const s = .06 + rand() * .12, x = i % 2 ? 31 + rand() * 3.6 : 25 + rand() * 9, z = i % 2 ? SZ + (rand() < .5 ? -1 : 1) * (.9 + rand() * .8) : (rand() < .5 ? R.z1 + .3 + rand() * .3 : R.z0 - .3 - rand() * .3);
    put(granite, rock(s, .55), x, s * .25, z, 0, rand() * 6); }

  flush(true);

  // ------------------------------------------------------------ hall-side sign over the door
  const sign = lettering(4.6, .9, g => { g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('FJORD TO SUMMIT · A NORSEMAN TRAINING ROOM', 0, .28);
    g.fillStyle = '#3b6f8f'; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Cold, then climb, then climb.', 0, .69); }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ light: cold dawn at the door, warm summit at the end
  if (!rectLib) { RectAreaLightUniformsLib.init(); rectLib = true; }
  const dawn = new THREE.RectAreaLight('#9cc0ff', lite ? 3.0 : 4.0, 5.5, 3.5); dawn.position.set(11.0, R.h - .25, -12.5); dawn.lookAt(11.0, 0, -12.5); group.add(dawn);
  const summitL = new THREE.RectAreaLight('#ffc48e', lite ? 3.2 : 4.4, RD - 2, 3.2); summitL.position.set(R.x1 - .1, 2.0, CZ); summitL.lookAt(R.x1 - 6, 1.2, CZ); group.add(summitL);
  const graze = new THREE.RectAreaLight('#dfe8f4', lite ? 1.6 : 2.2, LEGS.run.x1 - LEGS.bike.x0, 1.2); graze.position.set((LEGS.bike.x0 + LEGS.run.x1) / 2, R.h - .4, SZ + 2.2); graze.lookAt((LEGS.bike.x0 + LEGS.run.x1) / 2, .8, SZ); group.add(graze);
  const fill = new THREE.PointLight('#aab8c8', lite ? 2.2 : 1.4, 22, 1.4); fill.position.set(CX, R.h - .7, CZ); group.add(fill);
  const spots = [[trainerAt[0], trainerAt[2], '#eef3ff'], [tread[0], tread[2], '#ffe2c4'], [rackX, R.z0 - .9, '#dfeaff'], [22.4, R.z0 - 1.2, '#fff1dc'], ...(lite ? [] : [[crew.x, crew.z, '#fff1dc'], [29.4, R.z0 - 1, '#ffd9b0'], [pool.x, pool.z, '#cfe2ff']])];
  spots.forEach(([x, z, col]) => { const s = new THREE.SpotLight(col, lite ? 26 : 34, 7, .5, .55, 1.3); s.position.set(x, R.h - .3, z); s.target.position.set(x, .4, z); group.add(s, s.target); });
  if (!lite) { const key = new THREE.SpotLight('#eef2ff', 22, 26, .9, .45, 1.0); key.position.set(21.5, R.h - .1, -9.5); key.target.position.set(21.5, 0, SZ);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .02; key.shadow.camera.near = 1; key.shadow.camera.far = 12; group.add(key, key.target);
    const shaft = lightShaft({ top: .14, bottom: 1.5, height: R.h - .3, color: '#cfe0ff', opacity: .07 }); shaft.position.set(11.0, R.h - .15, -12.0); group.add(shaft); }

  // ------------------------------------------------------------ bikes: KONA.m atlas road-triathlon study, instanced ×2 (trainer, stand)
  const bikeSpot = { kind: 'beast', pos: new THREE.Vector3(trainerAt[0], 0, trainerAt[2]), rotY: Math.PI / 2, bike: null };
  const portrait = coarse && innerHeight > innerWidth;
  bikeSpot.view = portrait ? new THREE.Vector3(10.2, 0, -7.8) : new THREE.Vector3(9.4, 0, -7.6);    // just inside the door, the whole spine ahead
  bikeSpot.face = new THREE.Vector3(30, 1.5, SZ);
  const BIKE_COL = ['#24384a', '#c9ced3'];                                 // fjord slate on the trainer, granite grey on the stand
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
      // a wheel-on trainer at the trainer bike's rear axle and a riser block under its front wheel (yaw 90: bike forward = +x)
      const [x, y, z] = trainerAt, rot = v => new THREE.Vector3(v.z, v.y, -v.x), rear = rot(b.rear), front = rot(b.front);
      const ax = x + rear.x, az = z + rear.z, ay = y + rear.y;
      for (const s of [-1, 1]) { put(steel, new THREE.CylinderGeometry(.018, .018, .62, 10), ax, .26, az + s * .1, 0, 0, s * .55); put(steel, new THREE.CylinderGeometry(.012, .012, ay - .06, 8), ax, (ay + .06) / 2, az + s * .085); }
      put(steel, new THREE.CylinderGeometry(.075, .075, .07, 28), ax - .36, .135, az, Math.PI / 2, 0, 0);
      put(new THREE.MeshStandardMaterial({ color: '#16181b', roughness: .7 }), new RoundedBoxGeometry(.34, y - .06, .26, 2, .02), x + front.x, .06 + (y - .06) / 2, z + front.z);
      flush(true);
    },
  };

  // ------------------------------------------------------------ local reflections
  let envDirty = 1;
  const env = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(CX, 1.6, -9.0), lite, mats: envMats, hidePoints: true });

  // ------------------------------------------------------------ cards
  const disclaimer = { cls: 'G', text: 'An independent KONA.m concept inspired by the Norseman Xtreme Triathlon. Not affiliated with, endorsed by or sponsored by the race or its organisers. No official logo, mark or photography is used.' };
  const interp = text => ({ cls: 'I', text });
  const back = act => ({ label: 'Back to the room', primary: true, onClick: () => act.close() });
  const card = (eyebrow, title, kicker, lede, list, act, more = []) => ({ kind: 'beast', eyebrow, title, kicker, lede, facts: [...list, disclaimer], actions: [back(act), ...more] });
  const nav = act => [{ label: 'Swim →', onClick: () => ctx.renderCard?.(swimCard(act)) }, { label: 'Bike →', onClick: () => ctx.renderCard?.(bikeCard(act)) }, { label: 'Run →', onClick: () => ctx.renderCard?.(runCard(act)) }];
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'AN INDEPENDENT ROOM · FJORD TO SUMMIT', title: 'Train for the fjord and the mountain.', kicker: 'Cold water · long climbs · a run that ends uphill',
      lede: 'A training room shaped by the Norseman course. The stone ridge down the middle is the profile, from a ferry ramp over cold water to a summit at the far wall. Either side: what you practise for each leg, and the people and kit that get you there.',
      facts: [fact('start'), fact('field'), interp('The ridge is drawn from sourced anchor heights; the shape between them and the horizontal spacing are KONA.m interpretation.'), disclaimer],
      actions: [{ label: 'Walk the profile →', primary: true, onClick: () => act.close() }, ...nav(act)] };
  }
  function swimCard(act) {
    return card('SWIM · THE COLD', 'It starts with a jump.', 'Ferry ramp · 3.8 km · cold water', 'The room starts where the race does: a ramp over dark water. Train the cold as well as the distance: a wetsuit you have swum in, two caps, socks and gloves where the rules allow, and a plan for the first minutes in cold water.',
      [fact('start'), fact('swim'), fact('water'), interp('The pool, the kit list and the advice to practise cold-water starts are KONA.m interpretation, not race rules or coaching.')], act, nav(act).slice(1));
  }
  function bikeCard(act) {
    return card('BIKE · THE CLIMBS', 'Climb, recover, climb.', '180 km · a long climb first, then the plateau', 'Training here is long rides with long climbs in them, and learning to eat and stay warm on the bike. The bike on the trainer and the one on the stand are KONA.m road-triathlon studies with a fjord-slate and a granite finish.',
      [fact('bike'), fact('bike_climbing'), fact('t2'), interp('The session on the screen is a KONA.m example, not coaching advice and not anyone’s data. The bikes are unbranded atlas studies, not any athlete’s or brand’s equipment.')], act, [nav(act)[0], nav(act)[2]]);
  }
  function runCard(act) {
    return card('RUN · THE MOUNTAIN', 'Long and flat, then up.', '42.2 km · the climb begins around 25 km', 'Two runs in one: a long flat one, then a climb where most people walk. Train both: easy running when tired, then hill repeats and fast walking with a pack.',
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
    return card('THE FINISH', 'Black at the top. White below.', 'Same distance, two finishes', 'The course splits late in the run. The tops in the niche are plain KONA.m studies in the two colours, with no marks.',
      [fact('cut'), fact('shirts')], act);
  }
  function summitCard(act) {
    return card('THE SUMMIT', 'Where the profile ends.', `Gaustatoppen · about ${SUMMIT_M.toLocaleString('en')} m`, 'The ridge climbs to a granite cairn against a dawn painted in code. It is an interpretation, not a photograph of the mountain.',
      [fact('summit'), fact('run'), interp('The backdrop, its path and its headlamps are painted by KONA.m code; no photograph or map is used.')], act, nav(act));
  }
  function profileCard(leg, act) {
    const lines = leg === 'bike' ? [fact('bike'), fact('bike_climbing'), fact('t2')] : [fact('run'), fact('cut'), fact('summit')];
    return card(`THE PROFILE · ${leg.toUpperCase()}`, leg === 'bike' ? '180 km over the plateau.' : '42.2 km, then up.', 'Anchor heights sourced · the line between them drawn',
      `${facts.profile.rule} Pins on the ridge mark the anchors; each label says what it measures.`, [...lines, interp('Vertical scale: 1,880 m = 2.3 m of stone. Horizontal: each leg gets its own stretch of the room, so the swim and run look longer than they are next to the bike.')], act, nav(act));
  }

  return {
    group, floor, sign, bikeSpot, infos, mood: NORSEMAN_MOOD, ownBikes: true, introCard,
    async useAssets(loader) {
      if (this._assets) return; this._assets = true;
      // bikes, fan, treadmill from world/konam/rooms/norseman-training.decor.json. This bike study has no bike-lite.glb,
      // so bikes always load the full (172 KB) study; everything else follows the device's lite policy.
      const split = bike => ({ ...decor, items: decor.items.filter(d => (d.kind === 'bike') === bike) });
      await loadDecor(split(true), { group, loader, lite: false, hooks: decorHooks });
      await loadDecor(split(false), { group, loader, lite, hooks: decorHooks });
    },
    setBike() { /* this room mounts its own instanced bikes in useAssets */ },
    update(t, reduce, dt = 1 / 60) {
      if (envDirty) { envDirty--; if (!envDirty) env.capture(); else if (envDirty === 1 && !env.texture) { env.capture(); envDirty = 0; } }
      const tt = reduce ? 0 : t;
      strata.t.value = tt; fjordWater.uniforms.t.value = tt; poolWater.material.uniforms.t.value = tt;
      if (!reduce) { vapour.step(t); fjordMist.step(t); }
      return { power: 0, heat: 0, riding: false };
    },
  };
}
