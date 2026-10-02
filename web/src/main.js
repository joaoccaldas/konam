import {eventEnabled} from './engine/event-visibility.js';
import {makeSpecs} from './specs.js';
import {makeWorkshop} from './workshop.js';
import {makeZipp} from './wheels.js';
import { makeLab, makeChamber } from './lab.js';
import { makePaint } from './paint.js';
import { applyWyld } from './skins/wyld.js';
import { TOUR, makeGallery } from './exhibit.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as TX from './tex.js';
import { BIKE, PROFILE, GEOMETRY, PARTS, GROUPS, PRESETS, SWATCHES, DECALS, VIEWS } from './data.js';
import { coarse, desktopViewPhone } from './detect.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
// coarse comes from detect.js: pointer:coarse, narrow viewport, or a phone in
// "Desktop view" reporting a ~980 px layout on a small physical screen.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const B2T = (v) => new THREE.Vector3(v[0], v[2], -v[1]);           // Blender (Z-up) -> three (Y-up)
const R_WHEEL = .3395, R_RING = .0127/(2*Math.sin(Math.PI/(BIKE.chainring||50))), R_COG = .0127/(2*Math.sin(Math.PI/(BIKE.cog||14)));

// ------------------------------------------------------------------ state
if(!eventEnabled('wyld'))delete PRESETS.wyld;
const DEFAULT_CFG = { preset: 'aurora', ...PRESETS.aurora, aerofuel: true, frontBottle: false, rearBottles: false, shield: true, rearDisc: false,
  rimBase: '#0b0b0c', rimText: '#d9d9d9', rimLabels: false, tyreText: '#6b6b6b', discColor: '#141416',
  ...PROFILE.defaultCfg };
let lab = null, paint = null;
let wyldCtl = null;
const flowState = {air:40/3.6,yaw:0,paused:false};
let flowClock=0;
const S = {
  mode: 'assembled', e: 0, eT: 0, ride: false, cadence: 90, env: 'museum', dims: false, spin: false,
  quality: coarse ? 'balanced' : 'high', sel: null, hover: null, isolate: false, xray: false,
  cfg: loadCfg(),
};
function loadCfg() {
  if(window.__MUSEUM_CFG)return {...DEFAULT_CFG,...window.__MUSEUM_CFG};
  // Read #cfg= by hand: URLSearchParams turns base64 '+' into ' ', which silently dropped shared builds.
  try { const m = location.hash.match(/(?:^#|&)cfg=([^&]+)/); if (m) { const h = decodeURIComponent(m[1]).replace(/ /g, '+'); return { ...DEFAULT_CFG, ...JSON.parse(decodeURIComponent(escape(atob(h)))) }; } } catch (_) { }
  try { const s = localStorage.getItem('speedmax.museum.v2.'+(BIKE.key||'cfr')+'.cfg'); if (s) return { ...DEFAULT_CFG, ...JSON.parse(s) }; } catch (_) { }
  return { ...DEFAULT_CFG };
}
function exportCfg() { return { ...S.cfg }; }
function saveCfg() {
  const cfg=exportCfg();
  try { localStorage.setItem('speedmax.museum.v2.'+(BIKE.key||'cfr')+'.cfg', JSON.stringify(cfg)); } catch (_) { }
  try { history.replaceState(null, '', '#cfg=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(cfg)))))); } catch (_) { }
}

// ------------------------------------------------------------------ renderer
// Populate profile-driven identity text (title, brand, hero, loader).
(function identity(){
  const H = PROFILE.hero || {};
  const B = BIKE;
  const fam = (H.title || B.family || 'Speedmax').toUpperCase().replace(/ /g, '\u00a0');
  const name = H.titleSpan || B.name || '';
  const sub = H.sub || B.claim || '';
  const year = String(B.year || '2027');
  const set = (id, v) => { const e = document.getElementById(id); if (e && v) e.textContent = v; };
  set('brand-name', fam);
  const withYear = name.includes(year) ? name : `${name} · MY${year}`;
  set('brand-sub', `${withYear} · size ${B.size || 'M'}`.toUpperCase());
  set('load-name', fam);
  set('load-sub', `${name} · Model year ${year}`.toUpperCase());
  set('hero-eyebrow', H.eyebrow || `Canyon collection · Exhibit ${B.exhibit || '01'}`);
  set('hero-lede', H.lede || (PROFILE.bike?.specs ? '' : ''));
  const t = document.getElementById('hero-title');
  if (t && (H.title || H.titleSpan)) t.innerHTML = `${H.title || B.family}<br>${H.titleSpan || B.name}<span>${sub}</span>`;
  else if (t) { const s = t.querySelector('span'); if (s) s.textContent = sub; }
  set('stat-weight-sub', `kg · size ${B.size || 'M'}`);
  set('bom-size', `Complete bike, size ${B.size || 'M'}`); set('bom-weight', B.weight ? `${B.weight} kg` : '—');
  set('collection-note', `Exhibit ${B.exhibit || '01'} of six in the Speedmax Museum: ${[B.family && !String(B.name).startsWith(B.family) ? B.family : '', B.name].filter(Boolean).join(' ')}${B.era ? ', ' + B.era : ''}.`);
  set('stat-rims-sub', /^[\d/ ]+$/.test(String(B.rims || '')) ? 'mm rims' : 'wheels');
})();

const canvas = $('#canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
let DPR = Math.min(devicePixelRatio, coarse ? 1.6 : 2);
renderer.setPixelRatio(DPR);

const scene = new THREE.Scene();
const gallery = makeGallery(); scene.add(gallery);
const chamber = makeChamber(); chamber.visible=false;scene.add(chamber);
const camera = new THREE.PerspectiveCamera(32, 1, .02, 60);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .075;
controls.minDistance = .25; controls.maxDistance = 7.5;
controls.maxPolarAngle = Math.PI * .52;
controls.zoomToCursor = !coarse;
controls.rotateSpeed = coarse ? .8 : .6;

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), .035).texture;
scene.environment = envTex;

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(1.4, 3.2, 2.2);
key.castShadow = true;
key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: .5, far: 8 });
key.shadow.bias = -.0004; key.shadow.normalBias = .01; key.shadow.radius = 4;
scene.add(key);
const rimL = new THREE.DirectionalLight(0xcfe3ff, .9); rimL.position.set(-2.5, 1.5, -2); scene.add(rimL);
const hemi = new THREE.HemisphereLight(0xffffff, 0x404048, .35); scene.add(hemi);

// floor: soft radial fade + shadow catcher
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0xdadbde, roughness: .9, metalness: 0 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: .32 }));
shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = .0008; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);

// post (desktop high quality)
let composer = null, gtao = null;
function setupComposer() {
  composer?.dispose?.(); composer = null; gtao = null;
  if (S.quality !== 'high') return;
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.updateGtaoMaterial({ radius: .12, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: 16 });
  gtao.blendIntensity = .9;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  resize();
}

// ------------------------------------------------------------------ materials
const M = {};
function physical(opts) { return new THREE.MeshPhysicalMaterial(opts); }
M.paint = physical({ color: S.cfg.frame, roughness: .3, metalness: .05, clearcoat: 1, clearcoatRoughness: .04, iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [140, 420], sheen: 0 });
M.decal = physical({ color: S.cfg.decal, roughness: .38, clearcoat: 1, clearcoatRoughness: .05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
M.rimGraphic = physical({ color: 0xbdbdbd, roughness: .48, polygonOffset: true, polygonOffsetFactor: -2 });
M.decalLight = physical({ color: 0xbdbdbd, roughness: .45, clearcoat: .6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
M.cockpit = physical({ color: 0x111113, roughness: .42, metalness: .1, clearcoat: .7, clearcoatRoughness: .18 });
M.crank = physical({ color: 0x18181b, roughness: .32, clearcoat: 1, clearcoatRoughness: .08 });
M.rim = physical({ color: 0xffffff, roughness: .5, clearcoat: .45, clearcoatRoughness: .25, envMapIntensity: .6 });
M.tyreF = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78, envMapIntensity: .45 });
M.tyreR = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78, envMapIntensity: .45 });
M.bottle = physical({ color: 0x2a2c30, roughness: .12, transparent: true, opacity: .6, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 });
M.ghost = new THREE.MeshStandardMaterial({ color: 0x9aa7b3, transparent: true, opacity: .07, depthWrite: false });
M.xray = new THREE.MeshBasicMaterial({ color: 0x6fd3ff, wireframe: true, transparent: true, opacity: .16, depthWrite: false });
M.disc = physical({ color: 0x0c0c0d, roughness: .4, clearcoat: .6, clearcoatRoughness: .15 });
// real paint and carbon aren't perfect mirrors: micro-variation breaks up the highlights
TX.microNoise(M.paint); TX.microNoise(M.cockpit); TX.microNoise(M.crank); TX.microNoise(M.disc);

function tuneStock(m) {
  if (m.name === 'led_green') { m.emissiveIntensity = 4; return m; }
  if (/alu_silver|steel/.test(m.name)) { m.envMapIntensity = 1.2; }
  return m;
}

// ------------------------------------------------------------------ load
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const b64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const GLB = b64(window.__SPEEDMAX_GLB);
const bike = new THREE.Group(); scene.add(bike);
const parts = {};            // part id -> node
const meshesOf = {};         // part id -> meshes (nearest part ancestor)
const explodables = [];      // {node, base, vec, delay}
let wheelF, wheelR, crankset, chainNode, chain = null, discMesh = null, zippMesh=null;

function progress(p, label) { $('#loadbar i').style.width = (p * 100).toFixed(0) + '%'; if (label) $('#loadlabel').textContent = label; }

progress(.15, 'Unpacking carbon…');
loader.parse(GLB.buffer, '', gltf => {
  progress(.6, 'Laying up materials…');
  const root = gltf.scene;
  bike.add(root);
  root.traverse(o => {
    const ud = o.userData || {};
    if (ud.part) parts[ud.part] = o;
    if (ud.explode) {
      const v = ud.explode;
      explodables.push({ node: o, base: o.position.clone(), vec: new THREE.Vector3(v[0], v[2], -v[1]), delay: 0 });
    }
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const mapped = mats.map(m => mapMaterial(m, o));
      o.material = Array.isArray(o.material) ? mapped : mapped[0];
      o.userData.baseMat = o.material;
      let p = o;
      while (p && !(p.userData && p.userData.part)) p = p.parent;
      if (p) (meshesOf[p.userData.part] ||= []).push(o);
    }
  });
  // stagger explosion by distance
  const sorted = [...explodables].sort((a, b) => a.vec.length() - b.vec.length());
  sorted.forEach((x, i) => x.delay = i / sorted.length);
  wheelF = parts.wheel_front; wheelR = parts.wheel_rear; crankset = parts.crankset; chainNode = parts.chain;
  buildChain();
  buildDisc();
  zippMesh=makeZipp(wheelR);
  buildDims();
  buildTunnel();
  applyCfg();
  buildUI();
  makeSpecs({profile:PROFILE,parts});
  lab = makeLab({getCfg:()=>S.cfg,setCfg:p=>setCfg(p,true),download,
    enter:()=>{closeDrawers();select(null);$('#tour').hidden=true;setMode('assembled');setEnv('tunnel');flyTo('lab');document.body.classList.add('engaged');},
    leave:()=>{setEnv('museum');flyTo('hero');},onResult:r=>{Object.assign(flowState,r);tunnel.rotation.y=-r.yaw;}});
  if (PROFILE.discOption === false) $('#wheel-choice')?.closest('label')?.setAttribute('hidden', '');
  $('#wheel-choice').onchange=e=>setCfg({rearDisc:e.target.value!=='stock',wheelModel:e.target.value},true);
  paint=makePaint(M.paint,{flyTo,download,getCfg:exportCfg});
  const workshop=makeWorkshop({parts,PARTS,explodables,scene,download,select,getCfg:exportCfg,profile:PROFILE});
  Object.assign(window.__sm,{lab,paint,discMesh,zippMesh,workshop});
  lab.refresh();
  progress(1, 'Ready');
  setTimeout(() => document.body.classList.add('ready'), 250);
  flyTo(coarse ? 'side' : 'hero', 0);
  requestAnimationFrame(tick);
}, err => { $('#loadlabel').textContent = 'Could not load the model: ' + err.message; console.error(err); });

function mapMaterial(m, mesh) {
  switch (m.name) {
    case 'paint_frame': return M.paint;
    case 'decal_dark': return M.decal;
    case 'decal_light': return /rim_.*graphics/.test(mesh.name) ? M.rimGraphic : M.decalLight;
    case 'carbon_cockpit': return M.cockpit;
    case 'carbon_crank': return M.crank;
    case 'carbon_rim': return M.rim;
    case 'rubber_tyre': return /front/.test(mesh.name) ? M.tyreF : M.tyreR;
    case 'bottle_smoke': return M.bottle;
    default: return tuneStock(m);
  }
}

// ------------------------------------------------------------------ chain (instanced, animated)
function buildChain() {
  // Heritage meshes carry a static modelled chain (no path data): leave it as-is.
  if (!chainNode || !chainNode.userData.chain_path) return;
  const pts = JSON.parse(chainNode.userData.chain_path).map(B2T);
  const pitch = chainNode.userData.chain_pitch, N = chainNode.userData.chain_links;
  const L = [0];
  for (let i = 1; i <= pts.length; i++) L.push(L[i - 1] + pts[i % pts.length].distanceTo(pts[i - 1]));
  const tot = L[L.length - 1];
  const tpl = {};
  chainNode.traverse(o => { if (o.isMesh && /chainlink_(outer|inner)/.test(o.name)) { tpl[o.name.includes('outer') ? 'outer' : 'inner'] = o; o.visible = false; } });
  if (!tpl.outer) return;
  const inst = ['outer', 'inner'].map(k => {
    tpl[k].updateMatrix();
    const geo = tpl[k].geometry.clone().applyMatrix4(tpl[k].matrix);
    const im = new THREE.InstancedMesh(geo, tpl[k].material, N / 2);
    im.castShadow = true; im.frustumCulled = false; im.userData.chainKind = k;
    chainNode.add(im); (meshesOf.chain ||= []).push(im); im.userData.baseMat = im.material;
    return im;
  });
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1), one = new THREE.Vector3(1, 1, 1);
  function at(s, out) {
    s = ((s % tot) + tot) % tot;
    let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L[mid] <= s) lo = mid; else hi = mid; }
    const t = (s - L[lo]) / (L[lo + 1] - L[lo]);
    return out.copy(pts[lo]).lerp(pts[(lo + 1) % pts.length], t);
  }
  chain = {
    s: 0, tot, pitch, update() {
      for (let i = 0; i < N; i++) {
        const s0 = this.s + i * pitch;
        at(s0, P); at(s0 + pitch, Q);
        const ang = Math.atan2(Q.y - P.y, Q.x - P.x);
        q.setFromAxisAngle(Z, ang);
        P.add(Q).multiplyScalar(.5);
        m4.compose(P, q, one);
        inst[i % 2].setMatrixAt(i >> 1, m4);
      }
      inst.forEach(im => im.instanceMatrix.needsUpdate = true);
    }
  };
  chain.update();
}

// optional rear disc (configurator)
function buildDisc() {
  if (!wheelR) return;
  const prof = [];
  for (let i = 0; i <= 24; i++) { const r = .018 + (.239 - .018) * i / 24; prof.push(new THREE.Vector2(r, .0115 * Math.cos(i / 24 * Math.PI / 2) + .0035)); }
  const half = new THREE.LatheGeometry(prof, 128);
  half.rotateX(Math.PI / 2);
  const g = new THREE.Group();
  const a = new THREE.Mesh(half, M.disc), b = new THREE.Mesh(half, M.disc);
  b.rotation.y = Math.PI;
  a.castShadow = b.castShadow = true;
  a.userData.baseMat=b.userData.baseMat=M.disc;
  g.add(a, b); g.visible = false; g.name = 'disc_option';
  wheelR.add(g); discMesh = g;
  (meshesOf.wheel_rear ||= []).push(a, b);
}

// ------------------------------------------------------------------ dimension overlay
const dims = new THREE.Group(); dims.visible = false; scene.add(dims);
const dimLabels = [];
function buildDims() {
  // The overlay is drawn from the CFR/SLX size-M geometry; other frames opt out.
  if (PROFILE.dimsOverlay === false) { const b = $('#dimsBtn'); if (b) b.style.display = 'none'; return; }
  const BB = new THREE.Vector3(0, .2645, .16), HT = new THREE.Vector3(.44, .7455, .16);
  const AR = new THREE.Vector3(-.41325, .3395, .16), AF = new THREE.Vector3(.59975, .3395, .16);
  const mat = new THREE.LineBasicMaterial({ color: 0x19b3ff, transparent: true, opacity: .95, depthTest: false });
  const dash = new THREE.LineDashedMaterial({ color: 0x19b3ff, dashSize: .012, gapSize: .01, transparent: true, opacity: .7, depthTest: false });
  const line = (a, b, m = mat) => { const g = new THREE.BufferGeometry().setFromPoints([a, b]); const l = new THREE.Line(g, m); l.computeLineDistances(); l.renderOrder = 10; dims.add(l); };
  const lab = (p, t) => { const el = document.createElement('div'); el.className = 'dim'; el.innerHTML = t; $('#dimlayer').appendChild(el); dimLabels.push({ p, el }); };
  const stackTop = new THREE.Vector3(BB.x, HT.y, BB.z);
  line(BB, stackTop); line(stackTop, HT); line(BB, HT, dash);
  lab(BB.clone().lerp(stackTop, .5), '<b>481</b> stack');
  lab(stackTop.clone().lerp(HT, .5).add(new THREE.Vector3(0, .03, 0)), '<b>440</b> reach');
  const g0 = new THREE.Vector3(AR.x, .02, .16), g1 = new THREE.Vector3(AF.x, .02, .16);
  line(g0, g1); line(AR, g0, dash); line(AF, g1, dash);
  lab(g0.clone().lerp(g1, .5).add(new THREE.Vector3(0, .03, 0)), '<b>1013</b> wheelbase');
  line(BB, AR); lab(BB.clone().lerp(AR, .5).add(new THREE.Vector3(0, -.04, 0)), '<b>420</b> chainstay');
  // head angle & seat angle guides
  const steer = new THREE.Vector3(-Math.cos(73 * Math.PI / 180), Math.sin(73 * Math.PI / 180), 0);
  line(HT.clone().addScaledVector(steer, .12), HT.clone().addScaledVector(steer, -.48), dash);
  lab(HT.clone().addScaledVector(steer, -.44).add(new THREE.Vector3(.07, 0, 0)), '<b>73°</b> head');
  const seat = new THREE.Vector3(-Math.cos(81 * Math.PI / 180), Math.sin(81 * Math.PI / 180), 0);
  line(BB, BB.clone().addScaledVector(seat, .78), dash);
  lab(BB.clone().addScaledVector(seat, .62).add(new THREE.Vector3(-.07, 0, 0)), '<b>81°</b> seat');
  lab(new THREE.Vector3(BB.x, .2645 - .06, .16), '<b>75</b> BB drop');
}

// ------------------------------------------------------------------ wind tunnel streamlines
const tunnel = new THREE.Group(); tunnel.visible = false; scene.add(tunnel);
let tunnelMat;
function buildTunnel() {
  const obst = [[.47, .72, 0, .09], [.25, .5, 0, .07], [.02, .3, 0, .08], [-.1, .62, 0, .07], [-.16, .99, 0, .1], [.62, .98, 0, .15],
    [.4, .95, 0, .1], [-.33, 1.05, 0, .1], [.6, .34, 0, .05], [-.41, .34, 0, .06], [.14, .74, 0, .06]];
  for(const child of [...tunnel.children]){child.geometry?.dispose();child.material?.dispose();tunnel.remove(child);}
  const lines = coarse ? 32 : 64, seg = 90;
  const pos = [], along = [], seed = [];
  for (let k = 0; k < lines; k++) {
    const rand=n=>((Math.sin(n*127.1+41.7)*43758.5453)%1+1)%1;
    const y0 = .08 + rand(k+1) * 1.75, z0 = (rand(k+211) - .5) * .85, sd = rand(k+731);
    for (let i = 0; i < seg; i++) {
      const x = 2.4 - 4.8 * i / (seg - 1);
      let y = y0, z = z0;
      for (const [cx, cy, cz, r] of obst) {
        const dy = y0 - cy, dz = z0 - cz, q = Math.hypot(dy, dz * 2.2) + 1e-4;
        if (q < r * 2.2) {
          const g = Math.exp(-Math.pow((x - cx) / (r * 2.4), 2));
          const push = (r * 2.2 - q) * .55 * g;
          y += dy / q * push; z += dz / q * push * 1.4 + Math.sign(dz || .01) * push * .5;
        }
      }
      pos.push(x, y, z); along.push(i / (seg - 1)); seed.push(sd);
    }
  }
  const idx = [];
  for (let k = 0; k < lines; k++) for (let i = 0; i < seg - 1; i++) idx.push(k * seg + i, k * seg + i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
  g.setIndex(idx);
  tunnelMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, col: { value: new THREE.Color(0xbfe9ff) } },
    vertexShader: 'attribute float along; attribute float seed; varying float va; varying float vs; void main(){ va=along; vs=seed; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float t; uniform vec3 col; varying float va; varying float vs; void main(){ float p=fract(va*3.0 - t*0.55 + vs*7.0); float a=smoothstep(0.,.25,p)*smoothstep(1.,.55,p); float edge=smoothstep(0.,.08,va)*smoothstep(1.,.9,va); gl_FragColor=vec4(col, a*edge*.075); }',
  });
  tunnel.add(new THREE.LineSegments(g, tunnelMat));
}

// ------------------------------------------------------------------ configurator
function applyCfg() {
  const c = S.cfg;
  if(!eventEnabled('wyld')&&c.wyld){Object.assign(c,PRESETS.aurora,{preset:'aurora',wyld:false});}
  if(PROFILE.unavailableOptions?.includes('rearBottles'))c.rearBottles=false;
  // Wyld procedural dye skin (chained after any artwork projection shader).
  const wp = { darkness: c.wyldDark || 0, sheer: c.wyldSheer || 0, opacity: c.wyldAlpha ?? 1 };
  if (c.wyld) { wyldCtl ? wyldCtl.set(wp) : (wyldCtl = applyWyld(M.paint, bike, wp)); }
  else if (wyldCtl) { wyldCtl.remove(); wyldCtl = null; }
  M.paint.color.set(c.frame);
  const fin = { gloss: [.3, 1, .07], satin: [.5, .45, .3], matte: [.72, 0, .6] }[c.finish] || [.3, 1, .07];
  M.paint.roughness = fin[0]; M.paint.clearcoat = fin[1]; M.paint.clearcoatRoughness = fin[2];
  M.paint.iridescence = c.irid;
  M.decal.color.set(c.decal);
  M.decal.roughness = c.finish === 'matte' ? .18 : .4; M.decal.clearcoat = c.finish === 'matte' ? 1 : .8;
  const ck = c.cockpit === 'frame' ? c.frame : c.cockpit === 'white' ? '#eeeeee' : '#111113';
  M.cockpit.color.set(ck);
  M.cockpit.iridescence = c.cockpit === 'frame' ? c.irid : 0;
  M.decalLight.color.set(c.cockpit === 'carbon' ? '#bdbdbd' : '#1a1a1a');
  M.rimGraphic.color.set(c.rimText);
  M.rim.map?.dispose(); M.rim.map = TX.rimTexture(c.rimText, c.rimBase || '#0b0b0c', c.rimLabels ?? false); M.rim.needsUpdate = true;
  if (M.tyreF.map) { M.tyreF.map.dispose(); M.tyreR.map.dispose(); }
  M.tyreF.map = TX.tyreTexture('CONTINENTAL', BIKE.tyreFront || 'AERO 111  ·  26-622', c.tyreText || '#6b6b6b');
  M.tyreR.map = TX.tyreTexture(BIKE.tyreRearBrand || 'CONTINENTAL', BIKE.tyreRear || (BIKE.key==='slx'?'GRAND PRIX 5000 S TR  ·  28-622':'GRAND PRIX 5000 TT TR  ·  28-622'), c.tyreText || '#6b6b6b');
  M.tyreF.needsUpdate = M.tyreR.needsUpdate = true;
  if (discMesh) discMesh.traverse(o => { if (o.isMesh && o.material?.color) { o.material.color.set(c.discColor || '#141416'); o.material.needsUpdate = true; } });
  const vis = (id, v) => { if (parts[id]) parts[id].visible = v; };
  const off = k => PROFILE.unavailableOptions?.includes(k);
  vis('aerofuel_front', !off('aerofuel') && c.aerofuel && (!off('shield') && c.shield)); vis('bottle_front', !off('frontBottle') && c.frontBottle && c.aerofuel && (!off('shield') && c.shield));
  vis('bottles_rear', !off('rearBottles') && c.rearBottles); vis('bottle_cages_rear', !off('rearBottles') && c.rearBottles);
  vis('aeroshield', !off('shield') && c.shield); vis('arm_pads', !off('shield') && c.shield);
  if (discMesh && !off('rearDisc')) {discMesh.visible=c.rearDisc&&c.wheelModel!=='zipp';vis('spokes_rear',!c.rearDisc);}
  if(zippMesh && !off('rearDisc'))zippMesh.visible=c.rearDisc&&c.wheelModel==='zipp';
  if (off('rearDisc')) { vis('rim_rear',true); vis('hub_rear',true); } else { vis('rim_rear',!(c.rearDisc&&c.wheelModel==='zipp'));vis('hub_rear',!(c.rearDisc&&c.wheelModel==='zipp')); }
  if($('#wheel-choice'))$('#wheel-choice').value=c.rearDisc?(c.wheelModel==='zipp'?'zipp':'cover'):'stock';
  $('#specWheelR') && ($('#specWheelR').textContent = c.rearDisc ? (c.wheelModel==='zipp'?'Zipp Super-9 B1 · 28 mm tubeless':'Generic carbon disc cover') : PARTS.wheel_rear.name+' · 85 mm');
  lab?.refresh();
  saveCfg();
  syncUI();
}

// ------------------------------------------------------------------ selection
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function partOf(o) {
  while (o && !(o.userData && o.userData.part)) o = o.parent;
  if (!o) return null;
  let id = o.userData.part;
  if (PARTS[id]?.alias) id = PARTS[id].alias;
  return id;
}
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObject(bike, true).filter(h => h.object.visible && isShown(h.object));
  return hits.length ? partOf(hits[0].object) : null;
}
function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
const hiCache = new Map();
function highlight(id, on, strength = .22) {
  for (const m of meshesOf[id] || []) {
    if (on) {
      const base = m.userData.baseMat;
      const clone = (mt) => { const c = mt.clone(); c.onBeforeCompile=mt.onBeforeCompile;c.customProgramCacheKey=mt.customProgramCacheKey; if (c.emissive) { c.emissive = new THREE.Color(0x2aa8ff); c.emissiveIntensity = strength; } return c; };
      m.material = Array.isArray(base) ? base.map(clone) : clone(base);
    } else m.material = m.userData.baseMat;
  }
}
function applyGhost() {
  const ghostAll = S.isolate && S.sel;
  const keep = new Set(S.sel ? [S.sel, ...Object.keys(PARTS).filter(k => PARTS[k].alias === S.sel)] : []);
  for (const [id, ms] of Object.entries(meshesOf)) {
    const shown = keep.has(id);
    for (const m of ms) {
      if (S.xray && !(id === 'frame' || id === 'fork' || id === 'frame_decals' || id === 'fork_decals')) { m.material = m.userData.baseMat; continue; }
      if (S.xray) { m.material = M.xray; continue; }
      if (ghostAll && !shown) m.material = M.ghost;
      else if (!(S.sel && shown)) m.material = m.userData.baseMat;
    }
  }
  if (S.sel && !S.xray) highlight(S.sel, true, .12);
  if (S.hover && S.hover !== S.sel && !ghostAll && !S.xray) highlight(S.hover, true, .18);
}
let downAt = null;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY, performance.now()]; document.body.classList.add('engaged'); });
canvas.addEventListener('pointerup', e => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  if (moved < 6 && performance.now() - downAt[2] < 500) select(pick(e));
  downAt = null;
});
let hoverRaf = 0;
canvas.addEventListener('pointermove', e => {
  if (coarse || e.buttons) return;
  if (hoverRaf) return;
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = 0;
    const id = pick(e);
    if (id !== S.hover) { const prev = S.hover; S.hover = id; if (prev && prev !== S.sel) highlight(prev, false); applyGhost(); }
    const tip = $('#tip');
    if (id && PARTS[id]) { tip.textContent = PARTS[id].name; tip.style.transform = `translate(${e.clientX + 14}px,${e.clientY + 14}px)`; tip.classList.add('on'); canvas.style.cursor = 'pointer'; }
    else { tip.classList.remove('on'); canvas.style.cursor = ''; }
  });
});
canvas.addEventListener('pointerleave', () => { $('#tip').classList.remove('on'); if (S.hover && S.hover !== S.sel) highlight(S.hover, false); S.hover = null; });

function select(id) {
  if (S.sel && S.sel !== id) highlight(S.sel, false);
  S.sel = id;
  if (!id) { S.isolate = false; $('#card').classList.remove('open'); applyGhost(); syncList(); return; }
  const P = PARTS[id] || { name: id, spec: '' };
  $('#cardGroup').textContent = GROUPS[P.group] || '';
  $('#cardName').textContent = P.name;
  $('#cardSpec').textContent = P.spec || '';
  $('#cardNote').textContent = P.note || '';
  $('#cardWeight').textContent = P.weight ? P.weight + ' g' : '—';
  $('#card').classList.add('open');
  applyGhost(); syncList();
}
function focusPart(id) {
  const box = new THREE.Box3();
  for (const m of meshesOf[id] || []) if (isShown(m)) box.expandByObject(m);
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3()), r = Math.max(.08, box.getSize(new THREE.Vector3()).length() * .5);
  const dir = camera.position.clone().sub(controls.target).normalize();
  tween(camera.position.clone(), controls.target.clone(), c.clone().addScaledVector(dir, r * 3.2 / Math.tan(camera.fov * Math.PI / 360) * .55), c, 1.1);
}

// ------------------------------------------------------------------ camera tween
let tw = null;
function tween(p0, t0, p1, t1, dur = 1.4) { if(reduced){ camera.position.copy(p1);controls.target.copy(t1);tw=null;return; } tw = { p0, t0, p1, t1, t: 0, dur }; }
function flyTo(name, dur = 1.4) {
  const v = name==='lab'?{p:[2.55,1.8,3.7],t:[.15,.87,0]}:VIEWS[name]; if (!v) return;
  const p1 = new THREE.Vector3(...v.p), t1 = new THREE.Vector3(...v.t);
  if (coarse && name === 'hero') p1.multiplyScalar(1.25);
  // Desktop view keeps a wide layout, so the portrait pull-back never ran and
  // the bike sat in the corner. phone-fit is that case; pull exploded further
  // so the parts clear the bottom dock.
  const fit = document.documentElement.classList.contains('phone-fit');
  if (innerWidth < innerHeight || fit) p1.sub(t1).multiplyScalar(fit && name === 'exploded' ? 1.75 : 1.55).add(t1);
  if (!dur) { camera.position.copy(p1); controls.target.copy(t1); return; }
  tween(camera.position.clone(), controls.target.clone(), p1, t1, dur);
  $$('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
}

// ------------------------------------------------------------------ environments
const ENVS = {
  museum: { bg: 0x111820, floor: 0x18212b, fog: [0x111820, 4, 14], env: .85, key: 2.0, rim: 1.9, hemi: .22, shadow: .5, exp: 1.0, ui: 'dark' },
  studio: { bg: 0xdcdde0, floor: 0xd4d5d8, fog: [0xdcdde0, 5, 14], env: 1.0, key: 1.6, rim: .9, hemi: .35, shadow: .32, exp: 1.0, ui: 'light' },
  midnight: { bg: 0x07080b, floor: 0x0d0f13, fog: [0x07080b, 3.5, 11], env: .55, key: 2.2, rim: 2.2, hemi: .08, shadow: .6, exp: 1.05, ui: 'dark' },
  tunnel: { bg: 0x0a1a1d, floor: 0x0e2226, fog: [0x0a1a1d, 3, 10], env: .5, key: 1.5, rim: 1.8, hemi: .12, shadow: .55, exp: 1.1, ui: 'dark' },
};
function setEnv(name) {
  S.env = name; lab?.setVisible(name==='tunnel'); chamber.visible=name==='tunnel';document.body.classList.toggle('in-lab',name==='tunnel'); const E = ENVS[name];
  gallery.visible = name === 'museum';
  floor.material.roughness = .9; floor.material.envMapIntensity = (name === 'museum'||name==='tunnel') ? .08 : 1;
  scene.background = new THREE.Color(E.bg);
  scene.fog = new THREE.Fog(...E.fog);
  floor.material.color.set(E.floor);
  scene.environmentIntensity = E.env;
  key.intensity = E.key; rimL.intensity = E.rim; hemi.intensity = E.hemi;
  shadowCatcher.material.opacity = E.shadow;
  renderer.toneMappingExposure = E.exp;
  tunnel.visible = name === 'tunnel';resize();
  document.body.dataset.ui = E.ui;
  $$('[data-env]').forEach(b => b.classList.toggle('active', b.dataset.env === name));
}

// ------------------------------------------------------------------ road motion (ride mode)
const road = new THREE.Group(); scene.add(road); road.visible = false;
{
  const g = new THREE.PlaneGeometry(.5, .012); const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 });
  for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(g, m); d.rotation.x = -Math.PI / 2; d.position.set(-4 + i * .75, .002, -.42); road.add(d); }
  for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(g, m); d.rotation.x = -Math.PI / 2; d.position.set(-4 + i * .75 + .37, .002, .42); road.add(d); }
}

// ------------------------------------------------------------------ UI
function syncUI() {
  const c = S.cfg;
  $$('[data-preset]').forEach(b => b.classList.toggle('active', b.dataset.preset === c.preset));
  const wc=$('#wyldControls'); if (wc) wc.hidden = !c.wyld;
  if (c.wyld) { const m={'#wyldDark':'wyldDark','#wyldSheer':'wyldSheer','#wyldAlpha':'wyldAlpha'}; for(const [id,k] of Object.entries(m)){const e=$(id); if(e){e.value=c[k]??(id==='#wyldAlpha'?1:0);paintRange(e);}} }
  $$('[data-frame]').forEach(b => b.classList.toggle('active', b.dataset.frame.toLowerCase() === c.frame.toLowerCase()));
  $$('[data-decal]').forEach(b => b.classList.toggle('active', b.dataset.decal.toLowerCase() === c.decal.toLowerCase()));
  $$('[data-finish]').forEach(b => b.classList.toggle('active', b.dataset.finish === c.finish));
  $$('[data-cockpit]').forEach(b => b.classList.toggle('active', b.dataset.cockpit === c.cockpit));
  const ir = $('#irid'); if (ir) { ir.value = c.irid; ir.style.setProperty('--p', c.irid * 100 + '%'); }
  const set = (id, v) => { const e = $(id); if (e) e.checked = v; };
  set('#optFront', c.frontBottle); set('#optFuel', c.aerofuel); set('#optRear', c.rearBottles); set('#optShield', c.shield); set('#optDisc', c.rearDisc);
  const pf = $('#pickFrame'); if (pf) pf.value = c.frame;
  const pd = $('#pickDecal'); if (pd) pd.value = c.decal;
  const pr = $('#pickRim'); if (pr) pr.value = c.rimBase || '#0b0b0c';
  const prt = $('#pickRimText'); if (prt) prt.value = c.rimText || '#d9d9d9';
  const ptt = $('#pickTyreText'); if (ptt) ptt.value = c.tyreText || '#6b6b6b';
  const pdc = $('#pickDisc'); if (pdc) pdc.value = c.discColor || '#141416';
  const orl = $('#optRimLabels'); if (orl) orl.checked = c.rimLabels ?? false;
}
function setCfg(patch, keepPreset = false) { Object.assign(S.cfg, patch); if (!keepPreset) S.cfg.preset = 'custom'; applyCfg(); }

function buildUI() {
  // Dynamic hero stats from active profile (weight / gear / rims).
  const _w = $('#stat-weight'), _g = $('#stat-gear'), _gs = $('#stat-gear-sub'), _r = $('#stat-rims');
  if(_w) _w.textContent = String(BIKE.weight ?? '—');
  if(_g) _g.textContent = BIKE.gear || '—';
  if(_gs) _gs.textContent = BIKE.gearSub || '';
  if(_r) _r.textContent = BIKE.rims || '—';
  let tourIndex = -1;
  const showTour = i => {
    tourIndex = i; const stop = TOUR[i];
    closeDrawers(); select(null); setMode('assembled'); setEnv('museum');
    $('#tour').hidden = false;
    $('#tourCount').textContent = `${i+1} / ${TOUR.length}`;
    $('#tourTitle').textContent = stop.title; $('#tourText').textContent = stop.text;
    $('#tourNext').textContent = i === TOUR.length-1 ? 'Explore freely' : 'Next detail →';
    flyTo(stop.view); $('#tourNext').focus({preventScroll:true});
  };
  $('#tourStart').onclick = () => showTour(0);
  $('#tourNext').onclick = () => { if(tourIndex < TOUR.length-1) showTour(tourIndex+1); else { $('#tour').hidden=true; $('#tourStart').focus(); } };
  $('#tourClose').onclick = () => { $('#tour').hidden=true; $('#tourStart').focus(); };
  // Wheel customisation
  const wc = (id, key) => { const e = $(id); if (e) e.oninput = () => setCfg({ [key]: e.value }, true); };
  wc('#pickRim', 'rimBase'); wc('#pickRimText', 'rimText'); wc('#pickTyreText', 'tyreText'); wc('#pickDisc', 'discColor');
  const rl = $('#optRimLabels'); if (rl) rl.onchange = e => setCfg({ rimLabels: e.target.checked }, true);
  // Disc artwork
  const discArt = { texture: null, mesh: null, uniforms: { artOn: { value: 0 }, artTex: { value: new THREE.Texture() }, artScale: { value: 1 }, artAngle: { value: 0 }, artOpacity: { value: 1 }, artAspect: { value: 1 } } };
  function discMat(mat) {
    const m = mat.clone();
    m.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, discArt.uniforms);
      shader.vertexShader = 'varying vec2 artUv;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nartUv = uv;');
      shader.fragmentShader = 'varying vec2 artUv; uniform sampler2D artTex; uniform float artOn,artScale,artAngle,artOpacity,artAspect;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\nif(artOn>0.5){vec2 p=artUv-.5;float c=cos(artAngle),s=sin(artAngle);p=mat2(c,-s,s,c)*p;vec2 uv=p/vec2(artScale,artScale/artAspect)+.5;float mask=step(0.,uv.x)*step(0.,uv.y)*step(uv.x,1.)*step(uv.y,1.);vec4 art=texture2D(artTex,uv);diffuseColor.rgb=mix(diffuseColor.rgb,art.rgb,art.a*artOpacity*mask);}');
    };
    m.customProgramCacheKey = () => 'museum-disc-v1';
    return m;
  }
  function applyDiscArt(mat) {
    if (!discMesh) return;
    discMesh.traverse(o => { if (o.isMesh && o.material === mat) { o.material = discMat(mat); } });
  }
  function installDiscArt(url) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); const sc = Math.min(1, 1024 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      discArt.uniforms.artTex.value.dispose();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      discArt.uniforms.artTex.value = t; discArt.uniforms.artAspect.value = c.width / c.height;
      discArt.uniforms.artOn.value = 1;
      if (discMesh) discMesh.traverse(o => { if (o.isMesh) { o.material = discMat(o.material); o.material.needsUpdate = true; } });
      $('#discArtControls').hidden = false; $('#discArtStatus').textContent = `${img.width} × ${img.height} · local`;
    };
    img.onerror = () => { $('#discArtStatus').textContent = 'Could not decode image.'; };
    img.src = url;
  }
  const daFile = $('#discFile');
  if (daFile) daFile.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 12 * 1024 * 1024) {
      $('#discArtStatus').textContent = 'PNG, JPEG or WebP up to 12 MB.';
      e.target.value = '';
      return;
    }
    const url = URL.createObjectURL(f);
    installDiscArt(url);
    URL.revokeObjectURL(url);
    e.target.value = '';
  };
  for (const [id, key] of [['#wyldDark', 'wyldDark'], ['#wyldSheer', 'wyldSheer'], ['#wyldAlpha', 'wyldAlpha']]) {
    const el = $(id); if (el) el.oninput = () => { setCfg({ [key]: +el.value, wyld: true }, true); paintRange(el); };
  }
  $('#optFront').onchange = e => setCfg({ frontBottle: e.target.checked }, true);

  // presets
  $('#presets').innerHTML = Object.entries(PRESETS).map(([k, p]) =>
    `<button data-preset="${k}"><i style="${p.wyld?'background:linear-gradient(135deg,#ff3d8e,#ff8fbf 28%,#e9cde8 46%,#8fe7dc 66%,#5fd8d3)':`background:linear-gradient(135deg,${p.frame} 55%,${p.decal} 55%)`}"></i><strong>${p.name}</strong><span>${p.sub}</span></button>`).join('');
  $('#swFrame').innerHTML = SWATCHES.map(c => `<button data-frame="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('') + `<label class="pick" title="Custom"><input type="color" id="pickFrame"></label>`;
  $('#swDecal').innerHTML = DECALS.map(c => `<button data-decal="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('') + `<label class="pick" title="Custom"><input type="color" id="pickDecal"></label>`;
  $$('[data-preset]').forEach(b => b.onclick = () => setCfg({ ...PRESETS[b.dataset.preset], preset: b.dataset.preset, wyld: !!PRESETS[b.dataset.preset].wyld }, true));
  $$('[data-frame]').forEach(b => b.onclick = () => setCfg({ frame: b.dataset.frame, wyld: false }));
  $$('[data-decal]').forEach(b => b.onclick = () => setCfg({ decal: b.dataset.decal }));
  $$('[data-finish]').forEach(b => b.onclick = () => setCfg({ finish: b.dataset.finish }));
  $$('[data-cockpit]').forEach(b => b.onclick = () => setCfg({ cockpit: b.dataset.cockpit }));
  $('#pickFrame').oninput = e => setCfg({ frame: e.target.value, wyld: false });
  $('#pickDecal').oninput = e => setCfg({ decal: e.target.value });
  $('#irid').oninput = e => setCfg({ irid: +e.target.value });
  // Options this bike's model does not carry: disable honestly with a reason.
  for (const k of (PROFILE.unavailableOptions || [])) {
    const id = { aerofuel: '#optFuel', frontBottle: '#optFront', rearBottles: '#optRear', shield: '#optShield', rearDisc: '#optDisc' }[k];
    const el = id && $(id); if (!el) continue;
    el.disabled = true; el.checked = false;
    const lbl = el.closest('label'); if (lbl) lbl.hidden = true;           // not on this frame: don't offer a dead switch
  }
  if (PROFILE.unavailableOptions?.length && !$('#setupNote')) $('#optShield')?.closest('label')?.insertAdjacentHTML('beforebegin', `<p class="note" id="setupNote">${PROFILE.unavailableNote || 'This frame predates AeroShield, AeroFuel storage and the disc-wheel option, so they are not offered here.'}</p>`);
  if(PROFILE.unavailableOptions?.includes('rearBottles') && !$('#optRear').disabled){$('#optRear').disabled=true;$('#optRear').closest('label').title='The standard SP102 seatpost has no modelled rear bottle carrier.';}
  $('#optRear').onchange = e => setCfg({ rearBottles: e.target.checked }, true);
  $('#optShield').onchange = e => setCfg({ shield: e.target.checked }, true);
  $('#optDisc').onchange = e => setCfg({ rearDisc: e.target.checked }, true);
  $('#reset').onclick = () => { S.cfg = { ...DEFAULT_CFG }; applyCfg(); toast('Back to Pro White'); };
  $('#share').onclick = async () => { saveCfg(); try { await navigator.clipboard.writeText(location.href); toast('Link to this build copied'); } catch (_) { toast('Copy the address bar to share this build'); } };

  // build sheet
  const groups = {};
  for (const [id, p] of Object.entries(PARTS)) if (!p.alias && parts[id]) (groups[p.group] ||= []).push([id, p]);
  $('#bom').innerHTML = Object.entries(GROUPS).filter(([g]) => groups[g]).map(([g, label]) =>
    `<h3>${label}</h3>` + groups[g].map(([id, p]) => `<button data-part="${id}"><span>${p.name}</span><em>${p.weight ? p.weight + ' g' : ''}</em></button>`).join('')).join('');
  $$('[data-part]').forEach(b => b.onclick = () => { select(b.dataset.part); focusPart(b.dataset.part); if (coarse) closeDrawers(); });

  // geometry table
  $('#geo').innerHTML = `<table><thead><tr><th></th>${GEOMETRY.sizes.map(s => `<th class="${s === 'M' ? 'm' : ''}">${s}</th>`).join('')}</tr></thead><tbody>` +
    GEOMETRY.rows.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map((v, i) => `<td class="${i === 1 ? 'm' : ''}">${v}</td>`).join('')}</tr>`).join('') + '</tbody></table>';

  // modes
  $$('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  $$('[data-view]').forEach(b => b.onclick = () => flyTo(b.dataset.view));
  $$('[data-env]').forEach(b => b.onclick = () => b.dataset.env==='tunnel'?lab?.open():setEnv(b.dataset.env));
  $('#explode').oninput = e => { S.eT = +e.target.value; if (S.mode !== 'exploded' && S.eT > 0) setMode('exploded', true); if (S.eT === 0 && S.mode === 'exploded') setMode('assembled', true); };
  $('#cadence').oninput = e => { S.cadence = +e.target.value; paintRange(e.target); };
  $$('[data-drawer]').forEach(b => b.onclick = () => toggleDrawer(b.dataset.drawer));
  $$('.drawer .x').forEach(b => b.onclick = closeDrawers);
  $('#cardClose').onclick = () => select(null);
  $('#cardFocus').onclick = () => S.sel && focusPart(S.sel);
  $('#cardIsolate').onclick = () => { S.isolate = !S.isolate; $('#cardIsolate').classList.toggle('active', S.isolate); applyGhost(); };
  $('#dimsBtn').onclick = () => { S.dims = !S.dims; dims.visible = S.dims; $('#dimlayer').classList.toggle('on', S.dims); $('#dimsBtn').classList.toggle('active', S.dims); if (S.dims) flyTo('side'); };
  $('#xrayBtn').onclick = () => { S.xray = !S.xray; $('#xrayBtn').classList.toggle('active', S.xray); applyGhost(); };
  $('#spinBtn').onclick = () => { S.spin = !S.spin; controls.autoRotate = S.spin; controls.autoRotateSpeed = .7; $('#spinBtn').classList.toggle('active', S.spin); };
  $('#shotBtn').onclick = screenshot;
  $('#glbBtn').onclick = () => download(new Blob([GLB], { type: 'model/gltf-binary' }), 'speedmax_cfr_axs_web.glb');
  $('#quality').value = S.quality;
  $('#quality').onchange = e => { S.quality = e.target.value; applyQuality(); };
  $('#hint').textContent = coarse ? 'Drag to orbit · pinch to zoom · tap a part' : 'Drag to orbit · scroll to zoom · click any part';
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'e') setMode(S.mode === 'exploded' ? 'assembled' : 'exploded');
    if (e.key === 'r') setMode(S.mode === 'ride' ? 'assembled' : 'ride');
    if (e.key === 'Escape') { select(null); closeDrawers(); }
    const vk = { 1: 'hero', 2: 'side', 3: 'front', 4: 'cockpit', 5: 'drivetrain', 6: 'top', 7: 'nds' }[e.key]; if (vk) flyTo(vk);
  });
  $$('header button, .dock button').forEach(b => b.addEventListener('click', () => document.body.classList.add('engaged')));
  paintRange($('#explode')); paintRange($('#cadence'));
  setEnv(S.env); syncUI(); applyQuality();
}
function paintRange(el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); }
function syncList() { $$('[data-part]').forEach(b => b.classList.toggle('active', b.dataset.part === S.sel)); }
function toggleDrawer(id) { const d = $('#' + id), open = !d.classList.contains('open'); closeDrawers(); d.classList.toggle('open', open); $$(`[data-drawer="${id}"]`).forEach(b => b.classList.toggle('active', open)); applyShift(); }
function closeDrawers() { $$('.drawer').forEach(d => d.classList.remove('open')); $$('[data-drawer]').forEach(b => b.classList.remove('active')); applyShift(); }
function setMode(m, fromSlider) {
  S.mode = m;
  document.body.dataset.mode = m;
  $$('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  if (m === 'exploded') { if (!fromSlider) S.eT = 1; }
  else if (!fromSlider) S.eT = 0;
  S.ride = m === 'ride';
  road.visible = S.ride;
  $('#ridebox').classList.toggle('on', S.ride);
  const ex = $('#explode'); ex.value = S.eT; paintRange(ex);
  if (m === 'exploded' && !fromSlider) flyTo('exploded');
  if (m === 'ride' && !fromSlider) flyTo('drivetrain');
  document.body.classList.add('engaged');
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
function screenshot() {
  render(0);
  canvas.toBlob(b => { download(b, `speedmax-cfr-${S.cfg.preset}-${Date.now()}.png`); toast('Screenshot saved'); }, 'image/png');
}
function applyQuality() {
  const q = S.quality;
  DPR = Math.min(devicePixelRatio, q === 'high' ? 2 : q === 'balanced' ? 1.5 : 1);
  renderer.setPixelRatio(DPR);
  renderer.shadowMap.enabled = q !== 'low';
  key.castShadow = q !== 'low';
  setupComposer(); resize();
}

// ------------------------------------------------------------------ loop
let shift = 0, shiftT = 0;
function applyShift() {
  const w = innerWidth, h = innerHeight;
  // Phones: keep the bike in the free space above any open sheet, so every change is visible.
  // phone-fit is a phone whose layout viewport is still ~980 px.
  const sheet = document.querySelector('.drawer.open');
  const phone = w < 760 || document.documentElement.classList.contains('phone-fit');
  const up = phone ? (sheet ? h * .24 : (S.env==='tunnel'||document.body.classList.contains('painting')) ? h*.15 : 0) : 0;
  if (Math.abs(shift) < 1e-4&&!up) camera.clearViewOffset(); else camera.setViewOffset(w, h, -shift * w, up, w, h);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = (w < h || document.documentElement.classList.contains('phone-fit')) ? 42 : 32;
  applyShift();
  camera.updateProjectionMatrix();
  composer?.setSize(w, h); composer?.setPixelRatio?.(DPR);
}
addEventListener('resize', resize); resize();
window.__sm = { scene, camera, controls, parts, S };

let last = performance.now(), fpsAcc = 0, fpsN = 0, autoTuned = false, t0 = performance.now();
const tmp = new THREE.Vector3();
function tick(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  // explode
  S.e += (S.eT - S.e) * (1 - Math.exp(-dt * 3.2));
  if (Math.abs(S.eT - S.e) < 1e-4) S.e = S.eT;
  for (const x of explodables) {
    const p = ease(clamp((S.e * 1.35 - x.delay * .35)));
    x.node.position.copy(x.base).addScaledVector(x.vec, p);
  }
  // ride
  if (S.ride) {
    const wc = S.cadence / 60 * Math.PI * 2;              // crank rad/s
    const vChain = wc * R_RING, wRear = vChain / R_COG, v = wRear * R_WHEEL;
    crankset && (crankset.rotation.z -= wc * dt);
    wheelR && (wheelR.rotation.z -= wRear * dt);
    wheelF && (wheelF.rotation.z -= v / R_WHEEL * dt);
    if (chain) { chain.s = (chain.s + vChain * dt) % chain.tot; chain.update(); }
    road.children.forEach(d => { d.position.x -= v * dt * .6; if (d.position.x < -6) d.position.x += 12; });
    $('#speed').textContent = (v * 3.6).toFixed(1);
    $('#cadOut').textContent = S.cadence;
  }
  if(S.env==='tunnel'&&!S.ride&&!flowState.paused&&!reduced){const wr=(lab?.state.env.speed||40)/3.6/R_WHEEL*dt;if(wheelR)wheelR.rotation.z-=wr;if(wheelF)wheelF.rotation.z-=wr;}
  if(!flowState.paused&&!reduced)flowClock+=dt*flowState.air/(40/3.6);
  if (tunnelMat) tunnelMat.uniforms.t.value = flowClock;
  // camera tween
  if (tw) {
    tw.t += dt / tw.dur; const k = ease(clamp(tw.t));
    camera.position.lerpVectors(tw.p0, tw.p1, k); controls.target.lerpVectors(tw.t0, tw.t1, k);
    if (tw.t >= 1) tw = null;
  }
  const fitPhone = document.documentElement.classList.contains('phone-fit');
  shiftT = fitPhone ? 0 : (innerWidth>900&&$('.drawer.open'))?-.14:(!document.body.classList.contains('engaged') && innerWidth > 900) ? .13 : 0;
  if (Math.abs(shiftT - shift) > 1e-4) { shift += (shiftT - shift) * (1 - Math.exp(-dt * 3)); applyShift(); camera.updateProjectionMatrix(); }
  if(innerWidth<760)applyShift();
  controls.update();
  // dimension labels
  if (S.dims) for (const d of dimLabels) {
    tmp.copy(d.p).project(camera);
    d.el.style.transform = `translate(${(tmp.x * .5 + .5) * innerWidth}px,${(-tmp.y * .5 + .5) * innerHeight}px) translate(-50%,-50%)`;
  }
  render(dt);
  // adaptive quality (first seconds)
  if (!autoTuned && now - t0 > 1500) {
    fpsAcc += dt; fpsN++;
    if (fpsN > 90) {
      autoTuned = true;
      const fps = fpsN / fpsAcc;
      if (fps < 38 && S.quality !== 'low') { S.quality = S.quality === 'high' ? 'balanced' : 'low'; $('#quality').value = S.quality; applyQuality(); toast(`Tuned quality for this device (${fps.toFixed(0)} fps)`); }
    }
  }
  requestAnimationFrame(tick);
}
function render() { if (composer) composer.render(); else renderer.render(scene, camera); }
document.addEventListener('visibilitychange', () => { last = performance.now(); });
