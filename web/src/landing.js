// landing.js — KONA. A sunlit, walkable gallery along "the Queen K":
import { eventEnabled } from './engine/event-visibility.js';
import { roomAccess } from './engine/access.js';
// every Speedmax generation on a lava-stone plinth in timeline order, the two MY2027
// flagships in an apse facing the ocean. Walk (WASD / tap the floor), look (drag),
// visit a bike (click / tap / 1–9), then step into its full 3D studio.
import * as THREE from 'three';
import { FONT, SERIF } from './engine/type.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildPier, pierWalkable, PIER, ordinal } from './pier.js';
import { initAppShell } from './app-shell.js';
import { buildHalloween, hweenWalkable, HDOOR, HROOM } from './halloween.js';
import { buildSanctuary, sanctuaryWalkable, SDOOR, SROOM } from './sanctuary.js';
import { buildGalleries, galleryWalkable, galleryFloorY, EDOOR, UPPER } from './galleries.js';
import { createRoomSound } from './roomSound.js';
import { decorateRoom } from './engine/decoration-props.js';
import { buildWings } from './engine/wing.js';
import { renderCard, bikeCard, paintingCard, sculptureCard, photoCard, roomCard } from './engine/card.js';
import { initMap } from './map.js';
import { roomOverview, withFutureLevels } from './world/map-model.js';
import { renderSettings } from './engine/profile.js';
import { captureView, shareImage } from './engine/share.js';
import { buildBrandRoom, loadBrandRoom, makeBrandLoader } from './engine/roomscene.js';
import { $, esc, clamp } from './engine/dom.js';
import { canvasTex, wallWash, contactShadow, lettering, onFontsReady } from './engine/textures.js';
import { planRoute, noteProgress } from './engine/route.js';
import { slotsOf, applySkin, skinFromWyld, skinFromFilm } from './engine/skins.js';
import { buildFinds, FINDS, readFinds } from './finds.js';
import { initArtWorld } from './artworld.js';
import { microNoise } from './tex.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { coarse as dc, small as ds } from './detect.js';
import { readPassportState, savePassportState } from './engine/passport-state.js';
import { applyStoredEvent } from './engine/progression.js';

const PIECES = window.__PIECES || [];
const sway = [];                                                     // palm crowns moving in the trade wind
const spinners = [];                                                 // slowly turning sculptures and hung bikes
const KONA = window.__KONA || { titles: [], machines: [], scenery: [] };
const WROOMDATA = eventEnabled('wyld') ? window.__WYLDROOM || null : null;
const BRANDROOMS = window.__BRANDROOMS?.rooms || [];
const KY = window.__KONAYEARS || null;                                // Kona by Year: the pier
const WYLD = { pink: '#ff3d8e', blush: '#ff8fbf', lilac: '#e9cde8', mint: '#8fe7dc', aqua: '#5fd8d3' };
// Phone detection must survive a browser's "Desktop view", where pointer and
// viewport width both lie; detect.js adds the physical-screen signal.
const coarse = dc;
if (coarse) document.body.classList.add('touch');
const small = ds;
// the visitor's profile decides render quality before anything is built (engine/profile.js)
const profile = window.__konaProfile;
if (!profile) throw new Error('KONA consumer Profile authority missing');
const RS = renderSettings(profile.get().quality, { lite: coarse || small, dpr: devicePixelRatio });
const lite = RS.lite;
const reduce = profile.get().motion === 'reduced' || (profile.get().motion === 'auto' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const B2T = v => new THREE.Vector3(v[0], v[2], -v[1]);            // Blender (Z-up) -> three (Y-up)

// ------------------------------------------------------------------ layout (metres; the hall runs toward -z)
const HALL = { x0: -7, x1: 7, z0: 5, z1: -46.5, h: 5.4 };
const WALK = { x0: -6.4, x1: 6.4, z0: 4.4, z1: -45.8 };
const EYE = 1.6;
// Kona Champions room, through a doorway in the plaster wall
const DOOR = { z0: -18.8, z1: -15.6, h: 3.4 };
const ROOM = { x0: -19.3, x1: -7.3, z0: -8.8, z1: -25.6, h: 4.6 };
// WYLD room, second doorway: a bright loft with a window onto Kailua Pier
const WDOOR = { z0: -30.8, z1: -27.6, h: 3.4 };
const WROOM = { x0: -23.3, x1: -7.3, z0: -26.6, z1: -45.4, h: 5.2 };
const DZ = (DOOR.z0 + DOOR.z1) / 2, WZ = (WDOOR.z0 + WDOOR.z1) / 2;
const STEP = 5.4, FIRST = -1;
const TILT = .38;                                                   // plinths turn toward the approaching visitor
const heritage = PIECES.filter(p => !p.flagship), flagships = PIECES.filter(p => p.flagship);
heritage.forEach((p, i) => {
  const left = i % 2 === 0;
  p.pos = new THREE.Vector3(left ? -3.4 : 3.4, 0, FIRST - i * STEP);
  p.rotY = left ? Math.PI / 2 - TILT : -Math.PI / 2 + TILT;         // drive side faces the aisle
  p.plinth = [2.35, .5, 1.05];
});
flagships.forEach((p, i) => {
  p.pos = new THREE.Vector3(i === 0 ? -1.75 : 1.75, 0, -41.4);
  p.rotY = 0; p.plinth = null;                                      // shared apse plinth
});
PIECES.forEach((p, i) => {
  p.index = i;
  p.top = p.flagship ? .32 : p.plinth[1];
  p.normal = new THREE.Vector3(Math.sin(p.rotY), 0, Math.cos(p.rotY));   // drive-side direction
  const back = (p.flagship ? 3.1 : 2.8) + (coarse && innerHeight > innerWidth ? 1.1 : 0);
  p.view = p.pos.clone().addScaledVector(p.normal, back);
  p.view.x = clamp(p.view.x, WALK.x0 + .3, WALK.x1 - .3);
});
const pickables = [];
const obstacles = [
  ...heritage.map(p => ({ c: p.pos, r: 1.45 })),
  { box: [-4.5, 4.5, -42.9, -39.9] },                               // apse plinth
];
function walkable(x, z) {
  if (window.__museumArt?.walkable?.(x, z) === true) return true;
  const inHall = x >= WALK.x0 && x <= WALK.x1 && z <= WALK.z0 && z >= WALK.z1;
  const inDoor = x < WALK.x0 + .1 && x > ROOM.x1 - .6 && z < DOOR.z1 - .45 && z > DOOR.z0 + .45;
  const inRoom = x > ROOM.x0 + .6 && x < ROOM.x1 - .4 && z < ROOM.z0 - .6 && z > ROOM.z1 + .6;
  const inDoor2 = !!WROOMDATA && x < WALK.x0 + .1 && x > WROOM.x1 - .6 && z < WDOOR.z1 - .45 && z > WDOOR.z0 + .45;
  const inWyld = !!WROOMDATA && x > WROOM.x0 + .7 && x < WROOM.x1 - .4 && z < WROOM.z0 - .6 && z > WROOM.z1 + .6;
  const inBrand = brandRooms.some(r => r.walkable(x, z));
  if (!inHall && !inDoor && !inRoom && !inDoor2 && !inWyld && !inBrand && !(KY && pierWalkable(x, z)) && !hweenWalkable(x, z, WALK) && !sanctuaryWalkable(x, z) && !galleryWalkable(x, z) && !atlas.walkable(x, z)) return false;
  for (const o of obstacles) {
    if (o.c && Math.hypot(x - o.c.x, z - o.c.z) < o.r) return false;
    if (o.box && x > o.box[0] && x < o.box[1] && z > o.box[2] && z < o.box[3]) return false;
  }
  return true;
}

// ------------------------------------------------------------------ renderer
const canvas = $('hall');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite || devicePixelRatio < 2, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('nogl');
  $('fallbackList').innerHTML = PIECES.map(p => p.viewer
    ? `<li><a href="${esc(p.viewer)}"><b>${esc(p.name)}</b> · ${esc(p.years)}</a></li>`
    : `<li style="opacity:.6;padding:16px 18px">${esc(p.name)} · ${esc(p.years)} — not modelled</li>`).join('');
  throw e;
}
let qualityDpr = RS.dpr;
let flowDpr = RS.flowDpr;
let activeDpr = qualityDpr;
renderer.setPixelRatio(activeDpr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = .96;
renderer.shadowMap.enabled = RS.shadows;                              // the slatted-roof stripes are the museum's signature (off on Low)
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#e6eef0', 70, 420);
const museumFov = () => {
  const a = innerWidth / Math.max(1, innerHeight);
  if (a < .78) return 59;      // portrait phones: closer, bike-first composition
  if (a < 1.15) return 54;     // tablets / near-square
  return 48;                   // desktop: gallery lens, not security-camera wide
};
const camera = new THREE.PerspectiveCamera(museumFov(), 1, .12, 700);   // near .12: depth precision without shimmering; far covers the 600 m sky
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .55;

// ------------------------------------------------------------------ canvas textures (plaster, travertine, basalt, lettering)
// Shared painters live in engine/textures.js. This seed stays here so the hall
// floor, lava, and palms keep one continuous sequence.
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const travertine = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#e2d7c6'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {                                  // soft veining and pores
    g.fillStyle = `rgba(${150 + rnd() * 40},${130 + rnd() * 30},${100 + rnd() * 30},${rnd() * .06})`;
    const y = rnd() * h; g.fillRect(0, y, w, 1 + rnd() * 3);
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,100,80,${.05 + rnd() * .08})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 1 + rnd() * 3, .6 + rnd(), 0, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(92,74,54,.72)'; g.lineWidth = 10;             // grout, one slab per tile
  g.strokeRect(6, 6, w - 12, h - 12);
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
}, [HALL.x1 - HALL.x0, HALL.z0 - HALL.z1].map(v => v / 2.4));
const basaltTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#1f2023'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) { const v = 20 + rnd() * 40; g.fillStyle = `rgba(${v},${v},${v + 3},${.4 + rnd() * .5})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(8,8,9,${.5 + rnd() * .4})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, .8 + rnd() * 2.2, 0, 7); g.fill(); }   // vesicles
}, [2, 1]);
// ------------------------------------------------------------------ the hall
const M = {
  floor: new THREE.MeshStandardMaterial({ map: travertine, roughness: .38, metalness: 0, envMapIntensity: .7 }),
  plaster: new THREE.MeshStandardMaterial({ color: '#e8ddcb', roughness: .95, envMapIntensity: .35 }),
  slat: new THREE.MeshStandardMaterial({ color: '#e5dcc9', roughness: .8 }),
  basalt: new THREE.MeshStandardMaterial({ map: basaltTex, roughness: .82, metalness: .05, envMapIntensity: .5 }),
  basaltPolished: new THREE.MeshStandardMaterial({ map: basaltTex, roughness: .28, metalness: .1, envMapIntensity: 1 }),
  mullion: new THREE.MeshStandardMaterial({ color: '#2b2420', roughness: .4, metalness: .6 }),
  glass: new THREE.MeshStandardMaterial({ color: '#f2e8ce', roughness: .05, metalness: 0, transparent: true, opacity: .07, envMapIntensity: 1.2, depthWrite: false }),
  lectern: new THREE.MeshStandardMaterial({ color: '#f6efdd', roughness: .6 }),
  line: new THREE.MeshBasicMaterial({ color: '#e9b84a', transparent: true, opacity: .55, fog: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  edge: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7, fog: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  ring: new THREE.MeshBasicMaterial({ color: '#e9a23b', transparent: true, opacity: 0, fog: false, depthWrite: false }),
};
const hall = new THREE.Group(); scene.add(hall);
const L = HALL.x1 - HALL.x0, D = HALL.z0 - HALL.z1, CZ = (HALL.z0 + HALL.z1) / 2;
const floor = new THREE.Mesh(new THREE.BoxGeometry(L + 8, .4, D + 6), M.floor);
floor.position.set(0, -.2, CZ); floor.receiveShadow = true; floor.userData.floor = true; hall.add(floor);
// Slabs in the mesh's own metres, so the joints scroll as you walk instead of stretching into one flat field.
M.floor.onBeforeCompile = shader => {
  shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
#ifdef USE_MAP
  vMapUv = vec2(position.x, -position.z) * 0.85;
#endif`);
};
M.floor.customProgramCacheKey = () => 'hall-floor-slabs';
// the Queen K: a faded centre line and edge lines down the aisle
{
  const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(.1, 1.3), M.line, 40); let n = 0;
  for (let z = 3.5; z > -37; z -= 3.1) { dashes.setMatrixAt(n++, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, .014, z)); }
  dashes.count = n; hall.add(dashes);
  for (const x of [-1.75, 1.75]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(.06, 41), M.edge); e.rotation.x = -Math.PI / 2; e.position.set(x, .014, -16.5); e.renderOrder = 2; hall.add(e); }
}
// plaster wall (lava side) with a shadow-gap skirting
for (const [a, b] of [[HALL.z0, HDOOR.z1], [HDOOR.z0, DOOR.z1], [DOOR.z0, WDOOR.z1], [WDOOR.z0, HALL.z1]]) {   // doorways: Lava Night, Kona Champions, WYLD
  const seg = new THREE.Mesh(new THREE.BoxGeometry(.3, HALL.h, a - b), M.plaster);
  seg.position.set(HALL.x0 - .15, HALL.h / 2, (a + b) / 2); seg.receiveShadow = seg.castShadow = true; hall.add(seg);
}
{ const lintel = new THREE.Mesh(new THREE.BoxGeometry(.3, HALL.h - DOOR.h, DOOR.z1 - DOOR.z0), M.plaster);
  lintel.position.set(HALL.x0 - .15, DOOR.h + (HALL.h - DOOR.h) / 2, (DOOR.z0 + DOOR.z1) / 2); hall.add(lintel);
  const l2 = lintel.clone(); l2.position.z = (WDOOR.z0 + WDOOR.z1) / 2; hall.add(l2);
  const l3 = lintel.clone(); l3.position.z = (HDOOR.z0 + HDOOR.z1) / 2; hall.add(l3); }
// Held special events leave a continuous hall wall, without a teaser door.
if(!WROOMDATA){const wall=new THREE.Mesh(new THREE.BoxGeometry(.3,DOOR.h,WDOOR.z1-WDOOR.z0),M.plaster);wall.position.set(HALL.x0-.15,DOOR.h/2,(WDOOR.z0+WDOOR.z1)/2);wall.receiveShadow=wall.castShadow=true;hall.add(wall);}
// north wall, with the doorway into Sanctuary
for (const [a, b] of [[HALL.x0, SDOOR.x0], [SDOOR.x1, HALL.x1]]) {
  const seg = new THREE.Mesh(new THREE.BoxGeometry(b - a, HALL.h, .3), M.plaster);
  seg.position.set((a + b) / 2, HALL.h / 2, HALL.z0 + .15); seg.receiveShadow = true; hall.add(seg);
}
{ const lintelN = new THREE.Mesh(new THREE.BoxGeometry(SDOOR.x1 - SDOOR.x0, HALL.h - SDOOR.h, .3), M.plaster);
  lintelN.position.set(0, SDOOR.h + (HALL.h - SDOOR.h) / 2, HALL.z0 + .15); hall.add(lintelN); }
{ // a koa-gold skirting, and a plumeria lei over the chapel door
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(.05, .06, HALL.z0 - HALL.z1 - 1), new THREE.MeshStandardMaterial({ color: '#c9843a', roughness: .42, metalness: .4 }));
  skirt.position.set(HALL.x0 + .02, .03, (HALL.z0 + HALL.z1) / 2); hall.add(skirt);
  const petal = new THREE.MeshStandardMaterial({ color: '#f6f1e4', roughness: .55 });
  const heart = new THREE.MeshStandardMaterial({ color: '#e2b23a', roughness: .4, emissive: '#e2b23a', emissiveIntensity: .15 });
  const n = 14;
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 10, 8), petal, n);
  const hearts = new THREE.InstancedMesh(new THREE.SphereGeometry(.018, 8, 6), heart, n);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = -1.35 + u * 2.7;
    const y = SDOOR.h + .06 + Math.sin(u * Math.PI) * .16;
    flowers.setMatrixAt(i, new THREE.Matrix4().setPosition(x, y, HALL.z0 - .05));
    hearts.setMatrixAt(i, new THREE.Matrix4().setPosition(x, y + .01, HALL.z0 - .02));
  }
  hall.add(flowers, hearts);
}
// glass wall to the ocean, and the apse's glass end wall
function glassRun(axis, from, to, fixed) {
  const len = Math.abs(to - from), n = Math.ceil(len / 2.6);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, HALL.h), M.glass);
  if (axis === 'z') { pane.rotation.y = -Math.PI / 2; pane.position.set(fixed, HALL.h / 2, (from + to) / 2); }
  else { pane.position.set((from + to) / 2, HALL.h / 2, fixed); }
  hall.add(pane);
  const mg = new THREE.BoxGeometry(.07, HALL.h, .14);
  const mull = new THREE.InstancedMesh(mg, M.mullion, n + 1); mull.castShadow = true;
  for (let i = 0; i <= n; i++) {
    const t = from + (to - from) * i / n;
    mull.setMatrixAt(i, axis === 'z' ? new THREE.Matrix4().setPosition(fixed, HALL.h / 2, t) : new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(t, HALL.h / 2, fixed));
  }
  hall.add(mull);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(axis === 'z' ? .2 : len, .06, axis === 'z' ? len : .2), M.mullion);
  sill.position.set(axis === 'z' ? fixed : (from + to) / 2, .03, axis === 'z' ? (from + to) / 2 : fixed); hall.add(sill);
}
glassRun('z', HALL.z0, EDOOR.z1, HALL.x1);                 // above the galleries door
glassRun('z', EDOOR.z0, HALL.z1, HALL.x1);                 // the rest of the ocean wall
{ const lintelE = new THREE.Mesh(new THREE.BoxGeometry(.2, HALL.h - EDOOR.h, EDOOR.z1 - EDOOR.z0), M.mullion);
  lintelE.position.set(HALL.x1, EDOOR.h + (HALL.h - EDOOR.h) / 2, (EDOOR.z0 + EDOOR.z1) / 2); hall.add(lintelE); }
if (KY) { glassRun('x', HALL.x0, 4.3, HALL.z1); glassRun('x', 6.5, HALL.x1, HALL.z1); }   // a doorway out to the pier
else glassRun('x', HALL.x0, HALL.x1, HALL.z1);
// skylight: open slats across the hall, the sun draws stripes on the floor
{
  const n = Math.floor(D / .75);
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(L + .4, .09, .26), M.slat, n);
  for (let i = 0; i < n; i++) slats.setMatrixAt(i, new THREE.Matrix4().setPosition(0, HALL.h, HALL.z0 - .4 - i * .75));
  slats.castShadow = true; hall.add(slats);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(.3, .35, D), M.slat); beam.position.set(HALL.x0 + .15, HALL.h - .1, CZ); hall.add(beam);
  const beam2 = beam.clone(); beam2.position.x = HALL.x1 - .15; beam2.material = M.mullion; hall.add(beam2);
}
// entrance lettering (behind the visitor at the start)
{
  const t = lettering(9, 2.2, g => {
    g.fillStyle = '#12181d'; g.font = `700 0.34px ${FONT}`; g.textAlign = 'center';
    g.letterSpacing = '.12px'; g.fillText('CANYON  ·  SPEEDMAX', 4.5, .62);
    g.font = `italic 400 1.0px ${SERIF}`; g.fillStyle = '#12181d'; g.letterSpacing = '0px'; g.fillText('the Queen K', 4.5, 1.55);
    g.font = `600 .16px ${FONT}`; g.fillStyle = '#138a8f'; g.letterSpacing = '.06px'; g.fillText('KAILUA-KONA  ·  1999 — 2027', 4.5, 2.0);
  }, 2048);
  t.position.set(0, 2.9, HALL.z0 - .02); t.rotation.y = Math.PI; hall.add(t);
}

// ------------------------------------------------------------------ outside: sky, Pacific, lava shore, palms
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: new THREE.Vector3(.55, .32, -.77).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; uniform vec3 sun;
      void main(){ float h = clamp(vD.y, -.1, 1.);
        vec3 hz = vec3(.99,.86,.66), mid = vec3(.85,.78,.66), top = vec3(.42,.55,.72);
        vec3 c = mix(hz, mid, smoothstep(0., .18, h)); c = mix(c, top, smoothstep(.18, .8, h));
        float s = max(dot(normalize(vD), sun), 0.); c += vec3(1.,.82,.55) * (pow(s, 6.) * .5 + pow(s, 900.) * 2.4);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  scene.add(sky);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), new THREE.ShaderMaterial({
    fog: false, uniforms: { t: { value: 0 }, sun: sky.material.uniforms.sun },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform float t; uniform vec3 sun;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        if (vW.x < -23.2 && length(vW.xz - vec2(-13.3, -36.)) < 27.) discard;   // inside the WYLD window's photo screen
        vec3 v = cameraPosition - vW; float d = length(v); v /= d;
        vec2 p = vW.xz * .35; float w = n(p + t*.25) * .6 + n(p*2.3 - t*.35) * .4;
        float shore = smoothstep(4., 60., vW.x - 11.);                      // turquoise shallows at the lava shore
        vec3 shallow = vec3(.16,.62,.66), deep = vec3(.05,.3,.48), far = vec3(.62,.78,.84);
        vec3 c = mix(shallow, deep, shore);
        float fres = pow(1. - max(v.y, 0.), 4.);
        c = mix(c, far, clamp(fres * .85 + smoothstep(60., 520., d) * .6, 0., 1.));
        vec3 r = reflect(-v, vec3(0,1,0)); float s = pow(max(dot(r, sun), 0.), 180.);
        c += vec3(1.,.93,.78) * s * (w * 2.2) + vec3(.9,.97,1.) * smoothstep(.82,.98,w) * .12 * (1.-fres);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -1.1; scene.add(ocean);
  window.__ocean = ocean.material;
  // lava shore / terrace and the lava field behind the plaster wall
  const shore = new THREE.Mesh(new THREE.BoxGeometry(6, 1.3, D + 16), M.basalt);
  shore.position.set(HALL.x1 + 3, -.66, CZ - 4); shore.receiveShadow = true; scene.add(shore);
  const shoreEnd = new THREE.Mesh(new THREE.BoxGeometry(L + 12, 1.3, 5), M.basalt);
  shoreEnd.position.set(3, -.66, HALL.z1 - 2.6); shoreEnd.receiveShadow = true; scene.add(shoreEnd);
  const fieldTex = basaltTex.clone(); fieldTex.repeat.set(160, 160); fieldTex.needsUpdate = true;
  const field = new THREE.Mesh(new THREE.PlaneGeometry(900, 459), new THREE.MeshStandardMaterial({ map: fieldTex, color: '#6b625a', roughness: 1 }));
  field.rotation.x = -Math.PI / 2; field.position.set(-460, -.05, 220.5); scene.add(field);   // stops short of the WYLD window's sightlines
  // surf line along the lava edge
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(.9, D + 16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .5, fog: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(HALL.x1 + 6.3, -1.08, CZ - 4); scene.add(foam); window.__foam = foam.material;
  // coconut palms
  const trunkM = new THREE.MeshStandardMaterial({ color: '#8d7a63', roughness: .95 });
  const frondM = new THREE.MeshStandardMaterial({ color: '#35613f', roughness: .8, side: THREE.DoubleSide });
  function frond(len) {
    const g = new THREE.PlaneGeometry(len, .7, 14, 2), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) + len / 2) / len, y = pos.getY(i);
      pos.setY(i, y * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * .35));
      pos.setZ(i, -u * u * len * .45 + Math.abs(y) * .25);
      pos.setX(i, u * len);
    }
    g.computeVertexNormals(); g.rotateX(-Math.PI / 2); return g;
  }
  const frondG = [frond(3.1), frond(2.6)];
  function palm(x, z, hgt, lean) {
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * .25, hgt * .4, 0), new THREE.Vector3(lean * .7, hgt * .8, 0), new THREE.Vector3(lean, hgt, 0)]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, .15, 7), trunkM); trunk.castShadow = true; g.add(trunk);
    const crown = new THREE.Group(); crown.position.set(lean, hgt, 0); g.add(crown);
    for (let i = 0; i < 11; i++) {
      const f = new THREE.Mesh(frondG[i % 2], frondM); f.castShadow = true;
      f.rotation.set(0, i / 11 * Math.PI * 2 + rnd() * .3, 0); f.rotateZ(.25 - rnd() * .35); crown.add(f);
    }
    g.position.set(x, -.02, z); g.rotation.y = rnd() * 6.28; scene.add(g);
    sway.push({ o: crown, phase: rnd() * 6.28, amp: .045 }); return g;
  }
  for (let i = 0; i < 7; i++) palm(HALL.x1 + 2.2 + rnd() * 2.5, 2 - i * 7.2 - rnd() * 2, 6 + rnd() * 2.5, .8 + rnd() * 1.4);
  palm(-2, HALL.z1 - 3.4, 7.2, 1.3); palm(KY ? 11.6 : 5.5, HALL.z1 - 3.1, 6.3, -1);   // with the pier, this one steps aside onto the lava
}

// ------------------------------------------------------------------ WYLD: hand-dyed tapestries and light pools
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const RAMP = [WYLD.pink, WYLD.pink, WYLD.blush, WYLD.lilac, WYLD.mint, WYLD.aqua, WYLD.lilac, WYLD.blush, WYLD.pink].map(hexRGB);
// the hall and the champions room are Kona, not WYLD: kapa earth, lava, ochre and sand at golden hour
const KAPA = ['#7a2e17', '#7a2e17', '#b4541f', '#d98c3a', '#ecc98a', '#f3e4c6', '#c9a26a', '#9a4a22', '#7a2e17'].map(hexRGB);
function dyeTex(seed, angle, soften = .18, ramp = RAMP) {
  const W = lite ? 256 : 512, H = W * 2;
  const tex = canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data, ca = Math.cos(angle), sa = Math.sin(angle);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      let t = (u * ca + v * 2 * sa) * 1.35 + .13 * Math.sin(v * 8.5 + seed) + .07 * Math.sin(u * 15 + v * 6 + seed * 2.1) + seed * .17;
      t = ((t % 1) + 1) % 1 * 8; const i = Math.floor(t), f = t - i, s = f * f * (3 - 2 * f), a = ramp[i], b = ramp[i + 1];
      const fold = .9 + .1 * Math.sin(u * 42 + Math.sin(v * 3) * 2);             // soft fabric folds
      const k = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) d[k + c] = ((a[c] + (b[c] - a[c]) * s) * (1 - soften) + 243 * soften) * fold;
      d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  return tex;
}
const glowTex = canvasTex(256, 256, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(.45, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const placed = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function lightPool(w, d, color, strength = .5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
  m.rotation.x = -Math.PI / 2; m.position.y = .004; return m;
}
function tapestry(w, h, seed, angle, ramp = KAPA) {
  const g = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 24, 1), new THREE.MeshStandardMaterial({ map: dyeTex(seed, angle, .18, ramp), roughness: .92, side: THREE.DoubleSide }));
  const pos = cloth.geometry.attributes.position;                                  // gentle drape
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) / w * Math.PI * 7) * .025);
  cloth.geometry.computeVertexNormals(); cloth.receiveShadow = true; g.add(cloth);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, w + .24, 12), new THREE.MeshStandardMaterial({ color: '#b08a4e', metalness: .9, roughness: .3 }));
  rod.rotation.z = Math.PI / 2; rod.position.y = h / 2 + .03; g.add(rod);
  return g;
}

// ------------------------------------------------------------------ Kona Champions room
const champs = [];
{
  const RW = ROOM.x1 - ROOM.x0, RD = ROOM.z0 - ROOM.z1, RCX = (ROOM.x0 + ROOM.x1) / 2, RCZ = (ROOM.z0 + ROOM.z1) / 2;
  const ink = new THREE.MeshStandardMaterial({ color: '#2a2118', roughness: .88, envMapIntensity: .3 });
  const koa = new THREE.MeshStandardMaterial({ color: '#7a5538', roughness: .78, envMapIntensity: .55 });
  const room = new THREE.Group(); room.name = 'champRoom'; scene.add(room);
  const rf = basaltTex.clone(); rf.repeat.set(6, 8); rf.needsUpdate = true;
  const rfloor = new THREE.Mesh(new THREE.BoxGeometry(RW, .2, RD), new THREE.MeshStandardMaterial({ map: rf, color: '#7a6b52', roughness: .22, metalness: .15, envMapIntensity: .9 }));
  rfloor.position.set(RCX, -.098, RCZ);   // 2 mm proud of the hall slab it overlaps: no z-fight in the doorway
  rfloor.receiveShadow = true; rfloor.userData.floor = true; room.add(rfloor); window.__roomFloor = rfloor;
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(RW, .2, RD), ink); ceil.position.set(RCX, ROOM.h + .1, RCZ); room.add(ceil);
  const box = (w, h, d, x, y, z, mat = koa) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.receiveShadow = true; room.add(m); return m; };
  box(.3, ROOM.h, RD, ROOM.x0 - .15, ROOM.h / 2, RCZ);                                    // west
  box(RW, ROOM.h, .3, RCX, ROOM.h / 2, ROOM.z0 + .15);                                    // north
  box(RW, ROOM.h, .3, RCX, ROOM.h / 2, ROOM.z1 - .15);                                    // south
  // WYLD cove light: a dyed ribbon of light running round the ceiling edge
  const cove = new THREE.MeshBasicMaterial({ map: dyeTex(2.3, .1, 0, KAPA), toneMapped: false, fog: false });
  for (const [w, x, z, ry] of [[RD, ROOM.x0 + .02, RCZ, Math.PI / 2], [RW, RCX, ROOM.z0 - .02, 0], [RW, RCX, ROOM.z1 + .02, Math.PI]]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, .07), cove); strip.position.set(x, ROOM.h - .25, z); strip.rotation.y = ry; room.add(strip);
  }
  room.add(placed(lightPool(RW * .9, RD * .9, '#f7e3b8', .16), RCX, .014, RCZ));
  const inside = tapestry(5.2, 1.9, 4.1, .5); inside.position.set(ROOM.x1 - .02, 3.4, (DOOR.z0 + DOOR.z1) / 2 + 4.6); inside.rotation.y = -Math.PI / 2; room.add(inside);
  const inside2 = tapestry(5.2, 1.9, 1.7, 2.2); inside2.position.set(ROOM.x1 - .02, 3.4, (DOOR.z0 + DOOR.z1) / 2 - 4.6); inside2.rotation.y = -Math.PI / 2; room.add(inside2);
  box(.3, ROOM.h, (ROOM.z0 - DOOR.z1), ROOM.x1 + .15, ROOM.h / 2, (ROOM.z0 + DOOR.z1) / 2).visible = false;   // east face is the hall wall
  const warm = new THREE.PointLight('#ffd9a3', lite ? 26 : 19, 22, 1.25); warm.position.set(RCX, ROOM.h - .5, RCZ); room.add(warm);
  const pictureLight = (x, wallZ, north) => { const wsh = wallWash(2.6, 4.2, .42); wsh.position.set(x, ROOM.h - 2.1, wallZ + (north ? -.035 : .035)); wsh.rotation.y = north ? Math.PI : 0; room.add(wsh); };

  // framed photographs (Wikimedia Commons, CORS-enabled) with credit plates
  const tl = new THREE.TextureLoader(); tl.setCrossOrigin('anonymous');
  const matWhite = new THREE.MeshStandardMaterial({ color: '#f6f2ea', roughness: .7 });
  const frameM = new THREE.MeshStandardMaterial({ color: '#0e0f12', roughness: .35, metalness: .4 });
  function framed(photo, maxW, maxH, caption) {
    const g = new THREE.Group(), ar = photo.w / photo.h;
    let w = maxW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; }
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + .22, h + .22, .05), frameM); g.add(fr);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(w + .16, h + .16), matWhite); mat.position.z = .03; g.add(mat);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#d8d2c8' })); pic.position.z = .036; g.add(pic);
    tl.load(photo.src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; pic.material.map = t; pic.material.color.set('#ffffff'); pic.material.needsUpdate = true; }, undefined, () => {});
    const plate = lettering(Math.max(1.4, w * .9), .2, gg => {
      const W = Math.max(1.4, w * .9);
      gg.fillStyle = '#e9e3d8'; gg.font = `600 .05px ${FONT}`; gg.fillText(caption || '', 0, .07);
      gg.fillStyle = '#9d978d'; gg.font = `500 .036px ${FONT}`; gg.fillText(`© ${photo.author} · ${photo.license} · Wikimedia Commons`.slice(0, 90), 0, .15);
    }, 1024);
    plate.position.set(-(w + .22) / 2 + Math.max(1.4, w * .9) / 2, -h / 2 - .28, .03); g.add(plate);
    g.userData.size = [w, h]; return g;
  }
  // the six titles: photo on the wall, a basalt stele in front
  const steleM = new THREE.MeshStandardMaterial({ map: basaltTex, roughness: .5, metalness: .1 });
  KONA.titles.forEach((t, i) => {
    const north = i < 3, k = i % 3;
    const x = ROOM.x1 - 2.6 - k * 3.4, z = north ? ROOM.z0 - .02 : ROOM.z1 + .02, face = north ? Math.PI : 0;   // face into the room
    pictureLight(x, z, north);
    const ph = framed(t.photo, 1.35, 1.7, t.photo.file.startsWith('File:Iron man') ? 'Kailua Bay — the swim start' : t.photoCaption); ph.position.set(x, 2.5, z); ph.rotation.y = face; room.add(ph);
    const nrm = new THREE.Vector3(0, 0, north ? -1 : 1);
    const st = new THREE.Group(); st.position.set(x, 0, z + nrm.z * 1.35); st.rotation.y = face; room.add(st);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.05, .34), steleM); slab.position.y = .525; slab.castShadow = !lite; st.add(slab);
    const face2 = lettering(.8, .9, g => {
      g.fillStyle = '#f3ede4'; g.font = `400 .3px ${SERIF}`; g.fillText(String(t.year), .04, .3);
      g.fillStyle = '#e0a458'; g.font = `700 .045px ${FONT}`; g.fillText(t.athlete.toUpperCase(), .05, .43);
      g.fillStyle = '#f3ede4'; g.font = `500 .1px ${FONT}`; g.fillText(t.time, .05, .58);
      g.fillStyle = '#a9a39a'; g.font = `600 .036px ${FONT}`; g.fillText(t.bike.toUpperCase(), .05, .68);
      g.fillStyle = '#d0672e'; g.fillRect(.05, .76, .16, .012);
    }, 512);
    face2.position.set(0, .6, .172); st.add(face2);
    room.add(placed(lightPool(1.9, 1.9, i % 2 ? '#ffd9a0' : '#f7b267', .32), x, .006, z + nrm.z * 1.35));
    const c = { ...t, kind: 'champion', index: i, pos: new THREE.Vector3(x, 0, z + nrm.z * 1.35), normal: nrm, photoY: 2.5 };
    c.view = c.pos.clone().addScaledVector(nrm, 2.6 + (coarse && innerHeight > innerWidth ? .8 : 0));
    c.face = new THREE.Vector3(x, coarse && innerHeight > innerWidth ? 2.2 : 1.5, z);   // phones: keep the photo clear of the card
    slab.userData.champ = c; face2.userData.champ = c; ph.children[2].userData.champ = c;
    pickables.push(slab, face2, ph.children[2]); champs.push(c);
    obstacles.push({ c: c.pos, r: .8 });
  });
  // west wall: the two machines that carried the titles, and the course between them
  const konaMachines = [];
  KONA.machines.forEach((m, i) => {
    const bz = i ? RCZ - 4.6 : RCZ + 4.6;
    const ph = framed(m.photo, 2.8, 2.1, m.name); ph.position.set(ROOM.x0 + .02, 2.35, bz); ph.rotation.y = Math.PI / 2; room.add(ph);
    const bx = ROOM.x0 + 4.5;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, .38, .74), M.basaltPolished);
    plinth.position.set(bx, .19, bz); plinth.castShadow = !lite; room.add(plinth);
    const spot = {
      generation: m.generation, name: m.name, text: m.text, index: i,
      glb: `assets/kona-years/bikes/${m.generation}/speedmax_web.glb`,
      finish: m.generation === 'cfr-2019' ? '#123352' : '#efe8d8',
      pos: new THREE.Vector3(bx, 0, bz),
      view: new THREE.Vector3(bx + 2.4, 0, bz),
      face: new THREE.Vector3(bx, 1.05, bz),
      yaw: Math.PI / 2,
    };
    plinth.userData.kona = spot; pickables.push(plinth); obstacles.push({ c: spot.pos, r: 1.05 });
    konaMachines.push(spot);
  });
  window.__konaMachines = konaMachines;
  if (KONA.scenery[0]) { const sc = framed(KONA.scenery[0], 2.6, 1.8, 'The Queen K — the Ironman bike course'); sc.position.set(ROOM.x0 + .02, 2.35, RCZ); sc.rotation.y = Math.PI / 2; room.add(sc); }
  // title over the doorway, hall side
  const sign = lettering(3.6, .9, g => {
    g.fillStyle = '#12181d'; g.font = `700 .15px ${FONT}`; g.letterSpacing = '.05px'; g.fillText('KONA CHAMPIONS', 0, .3);
    g.fillStyle = '#b4541f'; g.font = `italic 400 .3px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Six titles on a Speedmax', 0, .72);
  }, 1024);
  sign.position.set(HALL.x0 + .02, DOOR.h + .75, (DOOR.z0 + DOOR.z1) / 2 + .2); sign.rotation.y = Math.PI / 2; hall.add(sign);
}

// ------------------------------------------------------------------ WYLD room: bright, pink and blue, a window onto Kailua Pier
const wyldBikes = [];
if (WROOMDATA) {
  const W = WROOMDATA, RW = WROOM.x1 - WROOM.x0, RD = WROOM.z0 - WROOM.z1, CX = (WROOM.x0 + WROOM.x1) / 2, CZ2 = (WROOM.z0 + WROOM.z1) / 2;
  const room = new THREE.Group(); room.name = 'wyldRoom'; scene.add(room);
  // a white gallery: pearl marble, a glossy floor, and the dye appears only as light and on the bikes
  const terr = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#f7f5f4'; g.fillRect(0, 0, w, h);
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {                                // faint grey veins, drawn as wandering hairlines
      let x = rnd() * w, y = rnd() * h, a = rnd() * 6.28; g.strokeStyle = `rgba(120,118,122,${.05 + rnd() * .09})`; g.lineWidth = .6 + rnd() * 1.6;
      g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 40; k++) { a += (rnd() - .5) * .5; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke();
    }
  }, [RW / 5, RD / 5]);
  const wfloor = new THREE.Mesh(new THREE.BoxGeometry(RW + 2.4, .2, RD), new THREE.MeshStandardMaterial({ map: terr, roughness: .09, metalness: 0, envMapIntensity: 1.25 }));
  wfloor.position.set(CX - 1.2, -.098, CZ2); wfloor.receiveShadow = true; wfloor.userData.floor = true; room.add(wfloor); window.__wyldFloor = wfloor;   // 2 mm proud of the hall slab
  const white = new THREE.MeshStandardMaterial({ color: '#fbf9f9', roughness: .9, envMapIntensity: .4 });
  const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), white); m.position.set(x, y, z); m.receiveShadow = true; room.add(m); return m; };
  wall(RW, WROOM.h, .3, CX, WROOM.h / 2, WROOM.z0 + .15);                                  // north
  wall(RW, WROOM.h, .3, CX, WROOM.h / 2, WROOM.z1 - .15);                                  // south
  if (WROOM.h > HALL.h + .01) wall(.3, WROOM.h - HALL.h, RD, WROOM.x1 + .15, HALL.h + (WROOM.h - HALL.h) / 2, CZ2);   // only if the loft is taller than the hall
  // a closed, softly glossy ceiling — bikes hang from it upside down — with one long skylight
  const ceilM = new THREE.MeshStandardMaterial({ color: '#fbf9fa', roughness: .22, envMapIntensity: .9 });
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(RW, .14, RD), ceilM); ceil.position.set(CX, WROOM.h + .07, CZ2); room.add(ceil);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(RW - 5, 1.1), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
  sky.rotation.x = Math.PI / 2; sky.position.set(CX + 1, WROOM.h - .002, CZ2); room.add(sky);
  // the walls carry the dye: a soft hand-dyed gradient wash behind the hairlines, so the room reads WYLD at a glance
  const dyeWash = new THREE.MeshBasicMaterial({ map: dyeTex(4.1, .5, .12), toneMapped: false, fog: false, transparent: true, opacity: .5 });
  for (const [z, ry] of [[WROOM.z0 - .005, Math.PI], [WROOM.z1 + .005, 0]]) {
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(RW - .4, WROOM.h - .9), dyeWash); wash.position.set(CX, WROOM.h / 2 - .1, z); wash.rotation.y = ry; room.add(wash);
  }
  { const dyeLine = new THREE.MeshBasicMaterial({ map: dyeTex(2.9, .05, 0), toneMapped: false, fog: false });
    for (const [z, ry] of [[WROOM.z0 - .005, Math.PI], [WROOM.z1 + .005, 0]]) for (const [y, hh] of [[WROOM.h - .34, .15], [.07, .1]]) {
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(RW - .4, hh), dyeLine); ln.position.set(CX, y, z + (ry ? .001 : -.001)); ln.rotation.y = ry; room.add(ln);
    } }
  // the window wall: slim white mullions, a balcony and a glass balustrade
  const mullW = new THREE.MeshStandardMaterial({ color: '#f4efee', roughness: .35, metalness: .2 });
  for (let i = 0; i <= 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.12, WROOM.h, .08), mullW); m.position.set(WROOM.x0, WROOM.h / 2, WROOM.z0 - i * RD / 6); room.add(m); }
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(RD, WROOM.h), M.glass); pane.rotation.y = Math.PI / 2; pane.position.set(WROOM.x0, WROOM.h / 2, CZ2); room.add(pane);
  const balcony = new THREE.Mesh(new THREE.BoxGeometry(2.3, .22, RD), new THREE.MeshStandardMaterial({ map: terr, roughness: .3 })); balcony.position.set(WROOM.x0 - 1.15, -.11, CZ2); room.add(balcony);
  const bal = new THREE.Mesh(new THREE.PlaneGeometry(RD, 1.05), M.glass); bal.rotation.y = Math.PI / 2; bal.position.set(WROOM.x0 - 2.25, .55, CZ2); room.add(bal);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, RD), mullW); rail.position.set(WROOM.x0 - 2.25, 1.08, CZ2); room.add(rail);
  // the view: a real aerial photograph of Kailua Pier on a curved screen, horizon at eye level
  const V = W.view, R = 26, arc = Math.PI * (V.arc ?? .5), H = R * arc / (V.w / V.h);
  const focus = V.focus ?? .62, vy = (V.focusY ?? 3.6) + (focus - .5) * H;      // put the pier, not the skyline, in the window
  const screen = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true, -Math.PI / 2 - arc / 2, arc), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { map: { value: null }, ready: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vU; uniform sampler2D map; uniform float ready;
      void main(){
        vec2 uv = vec2(1. - vU.x, vU.y);
        vec3 c = texture2D(map, uv).rgb;
        c = mix(c, c * c * (3. - 2. * c), .35);                                     // gentle contrast against the overcast
        float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, 1.38);          // happier: more colour,
        c = c * vec3(1.03, 1.02, 1.0) * 1.06 + .02; c = pow(max(c, 0.), vec3(.92));   // warmer, lighter, open shadows
        float a = smoothstep(.97, .8, vU.y) * smoothstep(0., .05, vU.x) * smoothstep(1., .95, vU.x);  // overcast top fades into our sky
        gl_FragColor = vec4(mix(vec3(.93,.95,.95), c, ready), a); }`,
  }));
  screen.position.set(CX + 2, vy, CZ2); screen.renderOrder = -1; room.add(screen);
  const tl2 = new THREE.TextureLoader(); tl2.setCrossOrigin('anonymous');
  tl2.load(lite ? V.srcSmall : V.src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; screen.material.uniforms.map.value = t; screen.material.uniforms.ready.value = 1; });
  // light: clean white fill with a faint warm/dyed tint so the wash reads, not a cold white box
  const fill = new THREE.PointLight('#fdf3f6', lite ? 30 : 22, 26, 1.2); fill.position.set(CX, WROOM.h - .6, CZ2); room.add(fill);
  if (!lite) for (const z of [WROOM.z0 - 4, WROOM.z1 + 4]) { const pl = new THREE.PointLight('#fff6f2', 8, 13, 1.4); pl.position.set(CX + 1, 3.4, z); room.add(pl); }
  // the WYLD wordmark over the doorway (inside) and the sign in the hall
  const mark = lettering(4.4, 1.2, g => {
    const gr = g.createLinearGradient(0, 0, 4.4, 0); gr.addColorStop(0, WYLD.pink); gr.addColorStop(.5, '#b98be0'); gr.addColorStop(1, WYLD.aqua);
    g.fillStyle = gr; g.font = `800 1.0px ${FONT}`; g.letterSpacing = '.12px'; g.fillText('WYLD', .1, .95);
  }, 1024);
  mark.position.set(WROOM.x1 - .02, 4.2, WZ); mark.rotation.y = -Math.PI / 2; room.add(mark);
  const hs = lettering(3.6, .9, g => {
    g.fillStyle = '#12181d'; g.font = `700 .15px ${FONT}`; g.letterSpacing = '.05px'; g.fillText('THE WYLD ROOM', 0, .3);
    const gr = g.createLinearGradient(0, 0, 3.4, 0); gr.addColorStop(0, WYLD.pink); gr.addColorStop(1, WYLD.aqua);
    g.fillStyle = gr; g.font = `italic 400 .3px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('One Speedmax, four dyes', 0, .72);
  }, 1024);
  hs.position.set(HALL.x0 + .02, WDOOR.h + .75, WZ + .2); hs.rotation.y = Math.PI / 2; hall.add(hs);
  // a white bench to sit and look out
  const bench = new THREE.Mesh(new THREE.BoxGeometry(.7, .44, 3.2), new THREE.MeshStandardMaterial({ color: '#fbf7f6', roughness: .5 })); bench.position.set(WROOM.x0 + 3.4, .22, CZ2); bench.castShadow = !lite; room.add(bench);
  obstacles.push({ box: [WROOM.x0 + 2.9, WROOM.x0 + 3.9, CZ2 - 1.9, CZ2 + 1.9] });
  // the four dyes, suspended: one levitating, one hanging upside down from the ceiling, one flat on the wall, one standing on its tail
  const obsidian = new THREE.MeshStandardMaterial({ color: '#0b0b0e', roughness: .06, metalness: .3, envMapIntensity: 1.3 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#e8eaee', metalness: 1, roughness: .12 });
  const STATIONS = [
    { kind: 'float', x: CX + 1.6, z: CZ2 - .6, rotY: .55, top: 1.05 },                   // Dye hovers over a black mirror
    { kind: 'wall', x: CX - 2.2, z: WROOM.z0 - .42, rotY: Math.PI, top: 1.25 },          // Tide flat on the north wall
    { kind: 'vertical', x: CX + 2.6, z: WROOM.z1 + .42, rotY: 0, top: .32 },             // Sheer stands on its rear wheel against the south wall
    { kind: 'ceiling', x: CX - 3.6, z: CZ2 + 2.6, rotY: 2.1, top: WROOM.h - .015 },     // Night hangs, wheels up, from the ceiling
  ];
  W.variants.forEach((v, i) => {
    const st = STATIONS[i], x = st.x, z = st.z, rotY = st.rotY;
    const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
    const b = { ...v, index: i, kind: 'wyld', pos: new THREE.Vector3(x, 0, z), rotY, group: g, station: st.kind, top: st.top };
    if (st.kind === 'float') {                                   // no plinth: a disc of black glass and a soft shadow far below the tyres
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, .02, 96), obsidian); pad.position.y = .01; pad.receiveShadow = true; g.add(pad);
      g.add(placed(lightPool(3.6, 3.6, '#ffffff', .12), 0, .024, 0));
      const cs = contactShadow(2.2, .7); cs.position.y = .024; cs.rotation.z = rotY; cs.material.opacity = .45; g.add(cs);
    } else if (st.kind === 'wall' || st.kind === 'vertical') {   // two chrome pins out of the plaster, nothing else
      const pins = st.kind === 'wall' ? [[-.42, st.top + .78], [.42, st.top + .78]] : [[0, st.top + 1.62]];
      for (const [dx, y] of pins) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .42, 12), chrome); pin.rotation.x = Math.PI / 2; pin.position.set(dx, y, -.21 * Math.cos(rotY)); g.add(pin); }
      g.add(placed(lightPool(2.6, 1.4, '#ffffff', .1), 0, .004, .5 * Math.cos(rotY)));
    }
    b.normal = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
    const dist = st.kind === 'ceiling' ? 3.6 : st.kind === 'vertical' ? 3.3 : 3.0;
    b.view = b.pos.clone().addScaledVector(b.normal, dist + (coarse && innerHeight > innerWidth ? 1 : 0));
    b.view.x = clamp(b.view.x, WROOM.x0 + 1.2, WROOM.x1 - .8); b.view.z = clamp(b.view.z, WROOM.z1 + 1, WROOM.z0 - 1);
    b.face = b.pos.clone().setY({ float: 1.55, wall: st.top + .55, vertical: 1.2, ceiling: WROOM.h - .75 }[st.kind]);
    g.children.forEach(o => { if (o.isMesh) { o.userData.wyldBike = b; pickables.push(o); } });
    if (st.kind === 'float') obstacles.push({ c: b.pos, r: 1.35 });
    else if (st.kind !== 'ceiling') obstacles.push({ c: b.pos, r: .75 });           // walk right under the hanging bike
    wyldBikes.push(b);
  });
  // a dyed disc wheel, two metres across, turning slowly in the air by the door — the WYLD room's calling card
  { const g = new THREE.Group(); g.position.set(CX - 1.2, 3.55, CZ2 + 6.4); g.rotation.y = 0; room.add(g);
    const face = new THREE.MeshPhysicalMaterial({ map: dyeTex(3.7, .8, 0), roughness: .3, clearcoat: 1, clearcoatRoughness: .08 });
    const disc = new THREE.Group(); g.add(disc);
    for (const sgn of [1, -1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 14, 0, Math.PI * 2, 0, .42), face); c.scale.y = .12; c.rotation.x = sgn * Math.PI / 2; disc.add(c); }
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(.945, .04, 12, 96), new THREE.MeshStandardMaterial({ color: '#141416', roughness: .8 })); disc.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .22, 24), chrome); hub.rotation.x = Math.PI / 2; disc.add(hub);
    spinners.push({ o: disc, axis: 'z', speed: .22 });
  }
  // caption for the view, on the sill
  const vc = lettering(4.4, .34, g => {
    g.fillStyle = '#12181d'; g.font = `600 .07px ${FONT}`; g.fillText(V.caption.slice(0, 64), 0, .12);
    g.fillStyle = '#6d7479'; g.font = `500 .052px ${FONT}`; g.fillText(`© ${V.author} · ${V.license} · Wikimedia Commons · ${V.changes}`, 0, .26);
  }, 1024);
  vc.position.set(WROOM.x0 + .35, .62, CZ2 + 4.4); vc.rotation.set(-Math.PI / 2 + .5, Math.PI / 2, 0, 'YXZ'); room.add(vc);
}
// seat a bike in its holder: turned wheels-up, on its tail, or level — then re-seated so its tyres touch the mount
function seatBike(bike, how) {
  const inner = new THREE.Group(); inner.add(bike);
  if (how === 'ceiling') inner.rotation.x = Math.PI;              // wheels up, saddle down
  if (how === 'vertical') inner.rotation.z = Math.PI / 2;         // front wheel to the sky
  inner.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(inner);
  inner.position.set(-(bb.min.x + bb.max.x) / 2, how === 'ceiling' ? -bb.max.y : -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  return inner;
}
// the WYLD disc: a lathed shell dyed with the jersey's full ramp, nothing else — no carbon, no logos
function wyldDisc(bike) {
  const wheelR = bike.getObjectByName('wheel_rear') || [...bike.children].find(c => c.userData?.part === 'wheel_rear');
  if (!wheelR) return;
  wheelR.traverse(o => { if (/spoke|valve|hub_rear|disc_option|zipp/i.test(o.name || '')) o.visible = false; });
  const prof = []; for (let k = 0; k <= 12; k++) { const r = .012 + (.3105 - .012) * k / 12, q = r / .3125; prof.push(new THREE.Vector2(r, .0148 + .0105 * (1 - q * q))); }
  for (let k = 12; k >= 0; k--) { const r = .012 + (.3105 - .012) * k / 12, q = r / .3125; prof.push(new THREE.Vector2(r, -(.0148 + .0105 * (1 - q * q)))); }
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 128), new THREE.MeshPhysicalMaterial({ map: dyeTex(1.3, .9, 0), roughness: .26, clearcoat: 1, clearcoatRoughness: .07, envMapIntensity: 1.1 }));
  shell.rotation.x = Math.PI / 2; shell.name = 'wyld_disc'; wheelR.add(shell);
}
async function loadWyldBikes() {
  if (!wyldBikes.length) return;
  const gltf = await loader.loadAsync(WROOMDATA.bike.glb);
  const R = WROOMDATA ? WROOM : null;
  for (const b of wyldBikes) {
    const bike = gltf.scene.clone(true);
    bike.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); });
    // per-dye setup: each exhibit is built differently, like four riders on the start line
    const setup = { dye: { bottles: 'both' }, tide: { disc: true }, sheer: {}, night: { bottles: 'front' } }[b.id] || {};
    dressBike(bike, { key: 'cfr', finish: null });
    bike.traverse(o => {
      if (o.userData?.optional_accessory) o.visible = setup.bottles === 'both' ? true : setup.bottles === 'front' ? /front/i.test(o.name || '') : false;
      if (o.userData?.part === 'aeroshield') o.visible = b.id !== 'night';   // Night rides bare: no shield, pure profile
    });
    bike.traverse(o => { o.castShadow = false; });
    if (setup.disc) wyldDisc(bike);
    const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
    bike.position.set(-c.x, -box.min.y, -c.z);
    const holder = new THREE.Group(); holder.add(seatBike(bike, b.station)); holder.rotation.y = b.rotY;
    holder.position.y = b.top;                                    // float: hover height; wall: tyre line; vertical: tail; ceiling: the ceiling itself
    b.group.add(holder); b.bike = holder;
    if (b.station === 'ceiling') spinners.push({ o: holder, axis: 'y', speed: .07 });   // Night turns, very slowly, upside down
    if (b.station === 'float') b.hover = holder;                  // breathes up and down a few millimetres
    holder.updateMatrixWorld(true);
    bike.traverse(o => {
      if (!o.isMesh) return;
      pickables.push(o); o.userData.wyldBike = b; delete o.userData.piece;
      for (const m of [].concat(o.material)) {
      }
    });
  }
  for (const b of wyldBikes) if (b.bike) { const paint = slotsOf(b.bike); applySkin(paint, skinFromWyld(b)); b.ctl = paint.dye; }
  // the confusing part: mirror twins and strays. Same materials as the exhibits, not pickable, desktop gets the full set.
  const W2 = wyldBikes, twin = (src, how, x, y, z, ry, roll = 0) => {
    const orig = src.bike.children[0].children[0], saved = [];
    orig.traverse(o => { saved.push([o, o.userData]); o.userData = {}; });   // userData holds circular refs (the station): clone without it
    let bk; try { bk = orig.clone(true); } finally { for (const [o, u] of saved) o.userData = u; }
    bk.position.copy(src.bike.children[0].children[0].position);
    const h = new THREE.Group(); h.add(seatBike(bk, how)); h.position.set(x, y, z); h.rotation.set(0, ry, roll, 'YXZ'); scene.add(h);
    return h;
  };
  const dye = W2.find(b => b.station === 'float'); if (!dye) return;
  twin(dye, 'ceiling', dye.pos.x, R.h - .015, dye.pos.z, dye.rotY);                 // Dye's reflection, hanging exactly overhead
  if (lite) return;
  const CXw = (R.x0 + R.x1) / 2, CZw = (R.z0 + R.z1) / 2;
  twin(W2[1] || dye, 'wall', CXw - 5.4, 2.55, R.z1 + .42, 0, .12);                  // a stray on the south wall, tipped a few degrees
  twin(W2[2] || dye, 'vertical', CXw - 6.6, .32, R.z0 - .42, Math.PI);              // a second tail-stand by the window
  spinners.push({ o: twin(W2[3] || dye, 'float', CXw - 4.4, 1.9, CZw - 4.6, -.6, .38), axis: 'y', speed: .05 });   // one, banked, drifting in mid-air
  obstacles.push({ c: new THREE.Vector3(CXw - 4.4, 0, CZw - 4.6), r: 1.1 });          // at head height: walk round it, not through it
}

// ------------------------------------------------------------------ decor: palms, race paintings, sculptures, memorabilia
const infos = [];                                                   // decor with a story: picked like pieces
// (spinners declared at the top: the WYLD room registers its disc before the decor section)
{
  // Room registry placements share a single reusable prop implementation.
  for(const room of window.__ROOMS?.areas||[])decorateRoom(room.decorations,{group:scene,lite,obstacles,sway,basaltTex});

  // race paintings on the plaster wall: swim, run, finish (Wikimedia Commons, CC BY)
  const tl3 = new THREE.TextureLoader(); tl3.setCrossOrigin('anonymous');
  const gold = new THREE.MeshStandardMaterial({ color: '#b8925a', metalness: .85, roughness: .32 });
  const gallery = KONA.gallery || [];
  const slots = [[gallery[3], -6.4, 3.3, 2.3, 'Swim · 3.8 km'], [gallery[1], -25.75, 1.9, 2.7, 'Run · 42.2 km'], [gallery[2], -39.6, 3.3, 2.3, 'The finish']];
  for (const [ph, z, mw, mh, title] of slots) {
    if (!ph) continue;
    const ar = ph.w / ph.h; let w = mw, h = w / ar; if (h > mh) { h = mh; w = h * ar; }
    const g = new THREE.Group(); g.position.set(HALL.x0 + .03, 2.55, z); g.rotation.y = Math.PI / 2; hall.add(g);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + .16, h + .16, .06), gold); g.add(fr);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#d9d2c6' })); pic.position.z = .036; g.add(pic);
    tl3.load(ph.src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; pic.material.map = t; pic.material.color.set('#ffffff'); pic.material.needsUpdate = true; });
    const plate = lettering(1.9, .22, gg => { gg.fillStyle = '#12181d'; gg.font = `700 .06px ${FONT}`; gg.fillText(title.toUpperCase(), 0, .08);
      gg.fillStyle = '#6d7479'; gg.font = `500 .04px ${FONT}`; gg.fillText(`${ph.caption.slice(0, 48)} · © ${ph.author} · ${ph.license}`, 0, .17); }, 1024);
    plate.position.set(-w / 2 + .95, -h / 2 - .28, .03); g.add(plate);
    const wsh = wallWash(w + 1.6, 4.4, .3); wsh.position.set(0, 2.2 - 2.55 + .15, .045); g.add(wsh);
    const info = { kind: 'info', eyebrow: 'Kona · the race', title, sub: ph.caption, text: title.startsWith('Swim') ? 'A deep-water start in Kailua Bay beside the pier — 2.4 miles out and back before the bikes.' : title.startsWith('Run') ? 'The marathon heads south along Ali‘i Drive before turning onto the Queen K and out to the Energy Lab.' : 'The last metres on Ali‘i Drive, a block from the pier where the day began.', photo: ph, pos: new THREE.Vector3(HALL.x0 + 2.6, 0, z) };
    pic.userData.info = info; pickables.push(pic); infos.push(info);
  }

  // sculpture: a two-metre polished chainring at the entrance
  { const R = 1.0, teeth = 50, sh = new THREE.Shape();
    for (let i = 0; i <= teeth * 4; i++) { const a = i / (teeth * 4) * Math.PI * 2, k = i % 4, r = k === 1 || k === 2 ? R : R - .055; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const hole = new THREE.Path(); hole.absarc(0, 0, R - .16, 0, Math.PI * 2, true); sh.holes.push(hole);
    const ringG = new THREE.ExtrudeGeometry(sh, { depth: .06, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 2, curveSegments: 6 });
    ringG.center();
    const steel = new THREE.MeshStandardMaterial({ color: '#dfe4e8', metalness: 1, roughness: .16 });
    const g = new THREE.Group(); g.position.set(3.9, 0, .9); hall.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, .7, .7), M.basalt); base.position.y = .35; base.castShadow = !lite; g.add(base);
    const ring = new THREE.Mesh(ringG, steel); ring.position.y = .7 + R + .06; ring.castShadow = !lite; g.add(ring);
    for (let i = 0; i < 5; i++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(.07, R - .15, .05), steel); arm.position.set(Math.cos(i / 5 * 6.283) * (R - .15) / 2, Math.sin(i / 5 * 6.283) * (R - .15) / 2, 0); arm.rotation.z = i / 5 * 6.283 - Math.PI / 2; ring.add(arm); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .12, 24), steel); hub.rotation.x = Math.PI / 2; ring.add(hub);
    spinners.push({ o: ring, axis: 'y', speed: .18 });
    const info = { kind: 'info', eyebrow: 'Sculpture', title: 'Fifty teeth', sub: 'Polished steel · 2 m', text: 'A 50-tooth chainring blown up to two metres — the big ring every Speedmax in this hall has pushed along the Queen K.', pos: new THREE.Vector3(3.9, 0, .9) };
    ring.userData.info = info; base.userData.info = info; pickables.push(ring, base); infos.push(info); obstacles.push({ c: g.position, r: .95 });
  }
  // vitrine of memorabilia: race bib, finisher medal, bidon
  { const g = new THREE.Group(); g.position.set(3.95, 0, -34.2); g.rotation.y = -Math.PI / 2 + .25; hall.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, .92, .75), new THREE.MeshStandardMaterial({ color: '#faf7f3', roughness: .5 })); base.position.y = .46; base.castShadow = !lite; g.add(base);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.46, .62, .71), new THREE.MeshStandardMaterial({ color: '#e8f6f6', transparent: true, opacity: .12, roughness: .05, depthWrite: false })); glass.position.y = 1.23; g.add(glass);
    const bib = lettering(.42, .3, gg => { gg.fillStyle = '#ffffff'; gg.fillRect(0, 0, .42, .3); gg.fillStyle = '#d0672e'; gg.fillRect(0, 0, .42, .05);
      gg.fillStyle = '#12181d'; gg.font = `700 .022px ${FONT}`; gg.fillText('WORLD CHAMPIONSHIP · KAILUA-KONA', .02, .035);
      gg.font = `800 .15px ${FONT}`; gg.textAlign = 'center'; gg.fillText('1', .21, .2); gg.font = `600 .02px ${FONT}`; gg.fillText('PRO · SWIM · BIKE · RUN', .21, .27); }, 512);
    bib.material.transparent = false; bib.position.set(-.35, 1.14, -.1); bib.rotation.x = -.35; g.add(bib);
    const medal = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .012, 40), new THREE.MeshStandardMaterial({ color: '#d9b35a', metalness: 1, roughness: .25 })); medal.rotation.x = Math.PI / 2; medal.position.set(.12, 1.1, 0); g.add(medal);
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(.06, .3), new THREE.MeshStandardMaterial({ map: dyeTex(.4, 1.57, 0, KAPA), side: THREE.DoubleSide })); ribbon.position.set(.12, 1.28, -.01); g.add(ribbon);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.037, .037, .21, 24), new THREE.MeshStandardMaterial({ color: '#f2f4f5', roughness: .4 })); bottle.position.set(.46, 1.03, 0); g.add(bottle);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.02, .03, .04, 16), new THREE.MeshStandardMaterial({ color: '#c9a961', metalness: .8, roughness: .4 })); cap.position.set(.46, 1.155, 0); g.add(cap);
    const info = { kind: 'info', eyebrow: 'Memorabilia', title: 'Race-day kit', sub: 'Bib · finisher medal · bidon', text: 'What comes home from Kona: a number, a medal on a dyed ribbon and a scuffed bottle. Replicas made for the museum — no real race items are shown.', pos: new THREE.Vector3(3.95, 0, -34.2) };
    for (const o of [base, glass, bib, medal, bottle]) { o.userData.info = info; pickables.push(o); }
    infos.push(info); obstacles.push({ c: g.position, r: 1 });
  }
}

// ------------------------------------------------------------------ seabirds circling over the ocean
const birds = [];
{
  const wm = new THREE.MeshBasicMaterial({ color: '#f7f7f4', side: THREE.DoubleSide, fog: true });
  const wg = new THREE.PlaneGeometry(.55, .16); wg.translate(.27, 0, 0); wg.rotateX(-Math.PI / 2);
  for (let i = 0; i < 7; i++) {
    const o = new THREE.Group(), l = new THREE.Mesh(wg, wm), r2 = new THREE.Mesh(wg, wm); r2.scale.x = -1; o.add(l, r2);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.03, .015, .35, 6), wm); body.rotation.x = Math.PI / 2; o.add(body);
    o.scale.setScalar(1.4 + (i % 3) * .3); scene.add(o);
    birds.push({ o, l, r2, c: new THREE.Vector3(24 + (i % 3) * 14, 9 + (i % 4) * 2.5, -10 - i * 7), r: 7 + (i % 3) * 3, speed: .11 + (i % 4) * .03, phase: i * 1.9, flap: 7 + (i % 3) });
  }
}

// ------------------------------------------------------------------ light
const hemi = new THREE.HemisphereLight('#ffe3c2', '#b09572', lite ? 1.3 : .9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffddad', lite ? 2 : 2.45);
sun.position.set(3, 15, -16); sun.target.position.set(-6, 0, -22); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 70 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
if (lite) sun.shadow.autoUpdate = true;
// the hall's signature: a cinematic shaft of golden light falling through the slats onto the apse
{
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 2.6, HALL.h + 1, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ffdca8', transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  shaft.position.set(0, HALL.h / 2, -41.4); shaft.rotation.z = .12; hall.add(shaft); window.__shaft = shaft.material;
  for (const x of [-1.75, 1.75]) { const s2 = shaft.clone(); s2.material = shaft.material.clone(); s2.position.set(x, HALL.h / 2, -33); s2.scale.setScalar(.72); hall.add(s2); }
}

// ------------------------------------------------------------------ plinths, lecterns, floor years
function textCard(p) {
  return lettering(.62, .42, g => {
    g.fillStyle = '#faf8f4'; g.fillRect(0, 0, .62, .42);
    g.fillStyle = '#138a8f'; g.font = `700 .026px ${FONT}`; g.letterSpacing = '.004px'; g.fillText(`${p.years}  ·  NO. ${String(p.index + 1).padStart(2, '0')}`.toUpperCase(), .04, .07);
    g.fillStyle = '#12181d'; g.font = `400 .062px ${SERIF}`; g.letterSpacing = '0px';
    const words = p.name.split(' '); let line = '', y = .15;
    for (const w of words) { if (g.measureText(line + w).width > .54) { g.fillText(line, .04, y); line = ''; y += .062; } line += w + ' '; }
    g.fillText(line, .04, y);
    g.fillStyle = '#5f6a72'; g.font = `600 .02px ${FONT}`; g.fillText(String(p.material || '').toUpperCase().slice(0, 44), .04, y + .05);
    g.fillStyle = p.glb ? '#12181d' : '#8e979d'; g.font = `700 .022px ${FONT}`;
    g.fillText(p.glb ? 'TAP / CLICK TO VISIT  →' : 'NOT IN THE COLLECTION', .04, .38);
  }, 768);
}
function floorYear(p) {
  return lettering(2.4, .7, g => {
    g.fillStyle = 'rgba(18,24,29,.16)'; g.font = `italic 400 .62px ${SERIF}`; g.textAlign = 'center';
    g.fillText(p.years, 1.2, .56);
  }, 1024);
}
for (const p of PIECES) {
  const g = new THREE.Group(); g.position.copy(p.pos); hall.add(g); p.group = g;
  if (!p.flagship) {
    const [l, h, w] = p.plinth;
    const block = new THREE.Mesh(new THREE.BoxGeometry(l, h, w), M.basalt);
    block.rotation.y = p.rotY - Math.PI / 2; block.position.y = h / 2; block.castShadow = block.receiveShadow = true; g.add(block);
    block.userData.piece = p; pickables.push(block);
    // lectern with the wall text, on the aisle side
    const along = new THREE.Vector3(p.normal.z, 0, -p.normal.x); if (along.z < 0) along.negate();   // toward the approaching visitor
    const lect = new THREE.Group(); lect.position.copy(p.normal.clone().multiplyScalar(1.05)).addScaledVector(along, 1.25);
    lect.rotation.y = Math.atan2(p.normal.x, p.normal.z); g.add(lect);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.08, .92, .08), M.mullion); post.position.y = .46; lect.add(post);
    const top = new THREE.Mesh(new THREE.BoxGeometry(.7, .5, .03), M.lectern); top.position.set(0, .98, 0); top.rotation.x = -Math.PI / 2 + .55; top.castShadow = true; lect.add(top);
    const card = textCard(p); card.position.set(0, .98, 0); card.rotation.x = -Math.PI / 2 + .55; card.translateZ(.017); lect.add(card);
    card.userData.piece = p; pickables.push(card);
    const fy = floorYear(p); fy.rotation.x = -Math.PI / 2; fy.rotation.z = Math.atan2(p.normal.x, p.normal.z) + Math.PI;
    fy.position.copy(p.normal.clone().multiplyScalar(2.3)); fy.position.y = .014; fy.renderOrder = 2; g.add(fy);
    if (!p.glb) {                                                    // a lost work: an empty plinth, a halo of light
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.62, .012, 8, 64), new THREE.MeshBasicMaterial({ color: '#e9a23b', transparent: true, opacity: .55 }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = h + .01; g.add(halo);
    }
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.12, 64), M.ring.clone());
  ring.rotation.x = -Math.PI / 2; ring.position.y = p.top + .012; g.add(ring); p.ring = ring;
}
heritage.forEach((p, i) => {
  if (p.pos.x < 0) { const tp = tapestry(2.6, 3.3, i * 1.37 + .4, .35 + i * .5); tp.position.set(HALL.x0 + .05, 2.75, p.pos.z); tp.rotation.y = Math.PI / 2; hall.add(tp); }
  const pool = lightPool(3.4, 2.2, i % 2 ? '#ffd9a0' : '#f7b267', p.glb ? .38 : .22); pool.rotation.z = p.rotY - Math.PI / 2; pool.position.x = p.pos.x; pool.position.z = p.pos.z; hall.add(pool);
});
{ const ap = lightPool(10, 4, '#ffe4b8', .45); ap.position.set(0, .014, -41.4); ap.renderOrder = 1; hall.add(ap);
  const t2 = tapestry(7.5, 1.4, 3.3, 1.2); t2.position.set(0, 4.35, -45.9); hall.add(t2); }
{ // apse plinth for the MY2027 flagships + hanging sign
  const ap = new THREE.Mesh(new THREE.BoxGeometry(8.2, .32, 2.2), M.basaltPolished);
  ap.position.set(0, .16, -41.4); ap.castShadow = ap.receiveShadow = true; hall.add(ap);
  const sign = lettering(4.6, 1, g => {
    g.fillStyle = '#12181d'; g.font = `600 .13px ${FONT}`; g.textAlign = 'center'; g.letterSpacing = '.04px';
    g.fillText('2027  ·  THE SIXTH GENERATION', 2.3, .3);
    g.font = `italic 400 .46px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Built for Kona.', 2.3, .82);
  }, 1024);
  sign.position.set(0, 3.7, -43.2); hall.add(sign);
  for (const p of flagships) {
    const fy = floorYear({ years: p.name.replace('Speedmax ', '') });
    fy.rotation.x = -Math.PI / 2; fy.scale.setScalar(.7); fy.position.set(p.pos.x - p.pos.x, .014, 2.05); fy.renderOrder = 2; p.group.add(fy);
  }
}

// ------------------------------------------------------------------ the Kona Pier: Kona by Year
const pier = KY ? buildPier({ scene, data: KY, lettering, canvasTex, M, WYLD, FONT, SERIF, lite, coarse, pickables, obstacles }) : null;
// ------------------------------------------------------------------ Lava Night: the Halloween room by the entrance
const hween = buildHalloween({ scene, canvasTex, lettering, lightPool, basaltTex, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX: HALL.x0 });
hall.add(hween.sign);
const sanctuary = buildSanctuary({ scene, lettering, lightPool, FONT, SERIF, lite, coarse, pickables, obstacles });
sanctuary.sign.position.set(0, SDOOR.h + .7, HALL.z0 - .04); sanctuary.sign.rotation.y = Math.PI; hall.add(sanctuary.sign);
const galleries = buildGalleries({ scene, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX: HALL.x1 });
galleries.sign.rotation.y = -Math.PI / 2; hall.add(galleries.sign);
// wings built from data: museum/world/wings/*.json + the bike, painting and sculpture catalogues
const atlas = buildWings({ scene, lettering, FONT, SERIF, lite, pickables, obstacles, contactShadow },
  { wings: window.__WINGS || [], bikes: window.__ATLAS?.bikes || [], extraRefs: window.__ATLAS?.extra_refs || [], paintings: window.__ART?.paintings || [], sculptures: window.__ART?.sculptures || [] });

// Brand rooms built from data (museum/world/brand_rooms.json) — Nike first, others just add data.
const brandRooms = BRANDROOMS.map(d => { const r = buildBrandRoom(d, { lite, spinners, obstacles, pickables }); scene.add(r.group); return r; });
const brandProducts = brandRooms.flatMap(r => r.products);
let brandLoaded = false;
window.__brandRooms = brandRooms;

// ------------------------------------------------------------------ bikes (streamed, nearest first)
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let findsApi = null;
buildFinds({ scene, loader, pickables }).then(api => { findsApi = api; }).catch(e => console.warn('finds', e));
let loaded = 0; const modelled = PIECES.filter(p => p.glb);
function chainOf(node) {                                            // instanced links along the stored path (static)
  const path = node.userData.chain_path; if (!path) return;
  const pts = JSON.parse(path).map(B2T), pitch = node.userData.chain_pitch, N = node.userData.chain_links;
  const tpl = {}; node.traverse(o => { if (o.isMesh && /chainlink_(outer|inner)/.test(o.name)) { tpl[o.name.includes('outer') ? 'outer' : 'inner'] = o; o.visible = false; } });
  if (!tpl.outer || !tpl.inner) return;
  const Ls = [0]; for (let i = 1; i <= pts.length; i++) Ls.push(Ls[i - 1] + pts[i % pts.length].distanceTo(pts[i - 1]));
  const tot = Ls[Ls.length - 1];
  const at = (s, out) => { s = ((s % tot) + tot) % tot; let lo = 0, hi = Ls.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Ls[m] <= s) lo = m; else hi = m; } return out.copy(pts[lo]).lerp(pts[(lo + 1) % pts.length], (s - Ls[lo]) / (Ls[lo + 1] - Ls[lo])); };
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1), one = new THREE.Vector3(1, 1, 1);
  const inst = ['outer', 'inner'].map(k => { tpl[k].updateMatrix(); const im = new THREE.InstancedMesh(tpl[k].geometry.clone().applyMatrix4(tpl[k].matrix), tpl[k].material, N / 2); node.add(im); return im; });
  for (let i = 0; i < N; i++) { at(i * pitch, P); at(i * pitch + pitch, Q); q.setFromAxisAngle(Z, Math.atan2(Q.y - P.y, Q.x - P.x)); P.add(Q).multiplyScalar(.5); m4.compose(P, q, one); inst[i % 2].setMatrixAt(i >> 1, m4); }
}
function dressBike(root, p) {
  root.traverse(o => {
    if (o.userData?.optional_accessory || (p.key === 'slx' && o.name === 'aerofuel_front')) o.visible = false;
    if (o.name === 'chain') chainOf(o);
    if (!o.isMesh) return;
    o.castShadow = !lite; o.receiveShadow = !lite;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (m.name === 'paint_frame' && !m.userData.noised) { microNoise(m); m.userData.noised = true; }   // real paint has orange peel
      m.envMapIntensity = 1;
      o.userData.piece = p;
    });
  });
  if (p.finish) applySkin(slotsOf(root), { id: `hall-${p.key}`, name: 'Documented finish', frame: p.finish });
}
async function loadBike(p) {
  const gltf = await loader.loadAsync(p.glb);
  const bike = gltf.scene; dressBike(bike, p);
  const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
  bike.position.set(-c.x, -box.min.y, -c.z);
  p.explodables = []; p.nodes = {};
  bike.traverse(o => {
    const ud = o.userData || {};
    if (ud.part && !p.nodes[ud.part]) p.nodes[ud.part] = o;
    if (ud.explode) p.explodables.push({ node: o, base: o.position.clone(), vec: B2T(ud.explode) });
  });
  [...p.explodables].sort((a, b) => a.vec.length() - b.vec.length()).forEach((x, i, a) => x.delay = i / a.length);
  p.ex = 0; p.exT = 0;
  const holder = new THREE.Group(); holder.add(bike); holder.rotation.y = p.rotY; holder.position.y = p.top;
  holder.scale.setScalar(.001); p.group.add(holder); p.bike = holder; p.bikeIn = 0;
  const cs = contactShadow(2.1, .55); cs.position.y = p.top + .004; cs.rotation.z = p.rotY; p.group.add(cs);
  bike.traverse(o => { if (o.isMesh) pickables.push(o); });
}
let pierBikeLoading = false, pierOut = false;
const sideRooms = ['champRoom', 'wyldRoom'].map(n => scene.getObjectByName(n)).filter(Boolean);
async function loadPierBike() {                                       // the current CFR, turning under the finish arch
  if (!pier || pierBikeLoading) return; pierBikeLoading = true;
  const cfr = PIECES.find(p => p.key === 'cfr'); if (!cfr?.glb) return;
  const gltf = await loader.loadAsync(cfr.glb);
  dressBike(gltf.scene, { key: 'cfr', finish: null }); gltf.scene.traverse(o => { o.castShadow = false; });
  pier.setBike(gltf.scene);
}
async function loadSanctuaryBikes() {
  const src = WROOMDATA?.bike?.glb || PIECES.find(p => p.key === 'cfr')?.glb;
  if (!src || sanctuary.films.some(f => f.bike)) return;
  const gltf = await loader.loadAsync(src);
  for (const film of sanctuary.films) {
    const bike = gltf.scene.clone(true);
    bike.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); o.castShadow = false; } });
    dressBike(bike, { key: 'cfr', finish: null });
    applySkin(slotsOf(bike), skinFromFilm(film));
    const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
    bike.position.set(-c.x, -box.min.y, -c.z);
    const holder = new THREE.Group(); holder.add(bike); holder.rotation.y = film.rotY; holder.position.y = film.top;
    film.group.add(holder); film.bike = holder;
    holder.traverse(o => { if (o.isMesh) { o.userData.sanctuary = film; pickables.push(o); } });
  }
}
const SKIN = id => (window.__SKINS?.skins || []).find(s => s.id === id);
async function loadThemeBikes() {
  const src = PIECES.find(p => p.key === 'cfr')?.glb;
  if (!src) return;
  const gltf = await loader.loadAsync(src);
  for (const room of galleries.rooms) {
    if (room.bike) continue;
    const bike = gltf.scene.clone(true);
    bike.traverse(o => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      o.castShadow = !lite;
    });
    dressBike(bike, { key: 'cfr', finish: null });
    applySkin(slotsOf(bike), SKIN(`theme-${room.id}`));
    const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
    bike.position.set(-c.x, -box.min.y, -c.z);
    const holder = new THREE.Group();
    holder.add(bike);
    holder.rotation.y = room.specimenYaw || 0;
    holder.position.set(room.specimen.x, room.specimen.y + .2, room.specimen.z);
    (room.group || galleries.group).add(holder);
    room.bike = holder;
    holder.traverse(o => {
      if (!o.isMesh) return;
      delete o.userData.piece;
      o.userData.gallery = room;
      pickables.push(o);
    });
  }
}
async function loadKonaMachines() {
  const room = scene.getObjectByName('champRoom'); if (!room || !window.__konaMachines?.length) return;
  for (const spot of window.__konaMachines) {
    if (spot.bike) continue;
    const gltf = await loader.loadAsync(spot.glb);
    const bike = gltf.scene;
    dressBike(bike, { key: spot.generation, finish: spot.finish });
    const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
    bike.position.set(-c.x, -box.min.y, -c.z);
    const holder = new THREE.Group(); holder.add(bike); holder.rotation.y = spot.yaw; holder.position.set(spot.pos.x, .38, spot.pos.z);
    room.add(holder); spot.bike = holder;
    holder.traverse(o => { if (o.isMesh) { o.userData.kona = spot; pickables.push(o); } });
  }
}
function visitKona(spot) {
  if (!spot) return;
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = null;
  route(spot.view, spot.face, null); path.kona = spot;
}
function openKona(spot) {
  current = null; champ = null;
  $('cYears').textContent = 'Size M · published geometry';
  $('cName').textContent = spot.name;
  $('cMat').textContent = spot.generation === 'cfr-2019' ? 'Disc brakes · 80 mm rims' : 'Rim brakes · Trident storage';
  $('cNote').textContent = `${spot.text} Skeleton from Canyon’s size-M chart: stack 489 mm, reach 438 mm, seat angle 80.5°, chainstay 420 mm, wheelbase 1014 mm. Tube depths are a silhouette study, not a photo trace.`;
  $('cStats').hidden = true;
  $('cMedia').innerHTML = '';
  const other = window.__konaMachines.find(s => s !== spot);
  $('cActions').innerHTML = `<button class="btn primary" id="cOtherGen">${esc(other?.name || 'The other generation')} <span aria-hidden="true">→</span></button><button class="btn ghost" id="cHall">Back to the hall</button>`;
  $('cOtherGen').onclick = () => visitKona(other);
  $('cHall').onclick = () => { closeCard(); route({ x: 0, z: DZ }, null, null); };
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
async function loadHweenBike() {
  const cfr = PIECES.find(p => p.key === 'cfr'); if (!cfr?.glb || hween.piece.bike) return;
  const gltf = await loader.loadAsync(cfr.glb);
  hween.setBike(gltf.scene, b => dressBike(b, { key: 'cfr', finish: null }));
  hween.piece.bike.traverse(o => { if (o.isMesh) { o.userData.hween = hween.piece; delete o.userData.piece; } });
}
async function loadAll() {
  const order = [...modelled].sort((a, b) => a.pos.distanceTo(start) - b.pos.distanceTo(start));
  for (const p of order) {
    try { await loadBike(p); } catch (e) { console.warn('bike failed', p.key, e); }
    loaded++;
    $('loadstate').innerHTML = loaded < modelled.length ? `Unpacking the collection · ${loaded} / ${modelled.length}<i><b style="width:${loaded / modelled.length * 100}%"></b></i>` : `${modelled.length} bikes on display · ${PIECES.length - modelled.length} lost generations remembered`;
    if (loaded === 1) { const b = $('enterBtn'); if (b && !document.body.classList.contains('walking')) { b.disabled = false; } passportProgress(); }
  }
}

// ------------------------------------------------------------------ visitor
const start = new THREE.Vector3(0, 0, 3.4);
const P = { x: 0, z: 3.4, y: 0, yaw: 0, pitch: -.04, vx: 0, vz: 0 };
let started = false, path = null, keys = new Set(), current = null, drag = null, bob = 0;
let nearbyPiece = null;
const fwd = new THREE.Vector3(), look = new THREE.Vector3();
$('nearby')?.addEventListener('click', () => { if (nearbyPiece) { haptic(8); visit(nearbyPiece); } });

// ------------------------------------------------------------------ local-first Museum Passport
const passport = readPassportState();
function writePassport() {
  try { Object.assign(passport, savePassportState(passport)); } catch (_) { toast('Progress could not be saved on this device'); }
}
function passportProgress() {
  const total = modelled.length;
  const seen = passport.discoveries.filter(k => modelled.some(p => p.key === k)).length;
  const count = $('passportCount'); if (count) count.textContent = `${seen}/${total}`;
  return { seen, total };
}
function discover(p) {
  if (!p?.key || !p.glb || passport.discoveries.includes(p.key)) return false;
  passport.discoveries.push(p.key); writePassport();
  try { applyStoredEvent({ type: 'PRODUCT_VIEWED', subject: p.key, discovery: `bike:${p.key}` }); } catch (_) { }
  const { seen, total } = passportProgress();
  if (started) toast(`Museum Passport · discovered ${p.name} · ${seen}/${total}`);
  return true;
}
function savePose() {
  if (!started) return;
  const region = roomOf(P.x, P.z);
  if (region === 'horror') return;
  passport.pose = { x: P.x, z: P.z, yaw: P.yaw, pitch: P.pitch, region };
  writePassport();
}
addEventListener('pagehide', savePose);
$('passportBtn')?.addEventListener('click', () => {
  const { seen, total } = passportProgress();
  const found = readFinds().length;
  toast(`Museum Passport · ${seen} of ${total} bikes · ${found} of ${FINDS.length} shoreline finds${seen === total && found === FINDS.length ? ' · the coast is complete' : ''}`);
});
passportProgress();

const roomOf = (x, z) => {
  const art = window.__museumArt?.regionOf?.(x, z); if (art) return art;
  if (atlas.inside(x, z)) return 'gallery';                         // the data-built wings are part of the upper floor
  if (x > 7.15 && z > .6 && z < 28 && x < 26) return galleryFloorY(x, z) > 2.2 ? 'gallery' : 'stair';
  if (z > HALL.z0 - .15 && x > SROOM.x0 && x < SROOM.x1) return 'sanctuary';
  for (const r of brandRooms) if (r.walkable(x, z)) return r.desc.id;
  if (KY && pierWalkable(x, z)) return 'pier';
  if (x >= WALK.x0 - .05) return 'hall';
  return z > -8.6 ? 'hween' : z > -26.1 ? 'champ' : 'wyld';
};
const DOORZ = { champ: DZ, wyld: WZ, pier: -46.5, hween: (HDOOR.z0 + HDOOR.z1) / 2, ...Object.fromEntries(brandRooms.map(r => [r.desc.id, r.desc.door ? (r.desc.door.z0 + r.desc.door.z1) / 2 : (r.bounds.z0 + r.bounds.z1) / 2])) };
const PIER_IN = [{ x: 1.2, z: -38.6 }, { x: 5.6, z: -38.6 }, { x: 5.4, z: -44.6 }, { x: 5.4, z: -48.4 }];   // round the apse plinth, through the glass door
const NAVE_LANE = 13.6;                                             // upstairs walking lane: east of the bay plinths (x 11.15), west of the room openings
const fader = document.getElementById('fade');
function teleport(end) {
  const land = () => {
    P.x = end.x; P.z = end.z; P.vx = P.vz = 0;
    P.y = atlas.floorY(P.x, P.z) ?? galleryFloorY(P.x, P.z);
    if (path?.face) { const fx = path.face.x - P.x, fz = path.face.z - P.z; P.yaw = Math.atan2(-fx, -fz); }
    if (path) path.splice(0, path.length - 1);                       // arrive: the card opens as soon as we face the piece
  };
  if (reduce || !fader) { land(); return; }
  fader.classList.add('on');
  setTimeout(() => { land(); requestAnimationFrame(() => requestAnimationFrame(() => fader.classList.remove('on'))); }, 190);
}
function route(to, face, piece) {                                   // aisle first, then the doorway — never a diagonal through the plinths
  const a = roomOf(P.x, P.z), b = roomOf(to.x, to.z);
  const pts = planRoute({ x: P.x, z: P.z, to, fromRoom: a, toRoom: b, doors: DOORZ, pierIn: PIER_IN, naveLane: NAVE_LANE });
  path = pts; path.stuck = 0; path.face = face; path.piece = piece || null;
  const end = pts[pts.length - 1], far = end && (roomOf(end.x, end.z) !== a || Math.hypot(end.x - P.x, end.z - P.z) > 9);
  if (far && profile.get().travel !== 'walk') teleport(end);
}
function visit(p) {
  if (current && current !== p && current.exT > 0) setExploded(current, false);
  partSel = null; closeCard(true);
  discover(p);
  route(p.view, p.pos.clone().setY(p.top + .75), p);
  current = p; railActive(p);
}
let champ = null;
function visitChamp(c) {
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = c;
  route(c.view, c.face, null); path.champ = c;
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.room === 'kona'));
}
function openChamp(c) {
  champ = c;
  $('cYears').textContent = `Kona ${c.year} · World Champion`;
  $('cName').textContent = c.athlete;
  $('cMat').textContent = `${c.time} · ${c.bike}`;
  $('cNote').textContent = c.note;
  $('cStats').hidden = false;
  $('cMat').textContent = `${c.time} · ${c.splits}`;
  $('cStats').innerHTML = [[c.time, 'finish'], [c.bike.replace('Speedmax ', ''), 'Speedmax'], [c.country, 'nation']]
    .map(([b, s2]) => `<div><b>${esc(b)}</b><small>${esc(s2)}</small></div>`).join('');
  const m = KONA.machines.find(x => x.generation === c.generation);
  $('cMedia').innerHTML = `<figure class="c-photo"><img src="${esc(c.photo.src)}" alt="${esc(c.athlete)} — ${esc(c.photoCaption)}" referrerpolicy="no-referrer"><figcaption>${esc(c.photoCaption)}<br><a href="${esc(c.photo.page)}" target="_blank" rel="noopener">© ${esc(c.photo.author)} · ${esc(c.photo.license)} ↗</a></figcaption></figure>`
    + (m ? `<p class="c-note" style="margin-top:14px"><b class="c-spec">${esc(m.name)}</b>${esc(m.text)} The size-M study of that generation stands in this room.</p>` : '')
    + `<a class="c-src" href="${esc(c.source)}" target="_blank" rel="noopener">Race record ↗</a>`;
  const next = champs[(c.index + 1) % champs.length];
  $('cActions').innerHTML = `<button class="btn primary" id="cNextChamp">Next: ${esc(String(next.year))} <span aria-hidden="true">→</span></button><button class="btn ghost" id="cHall">Back to the hall</button>`;
  $('cNextChamp').onclick = () => visitChamp(next);
  $('cHall').onclick = () => { closeCard(); champ = null; route({ x: 0, z: DZ }, null, null); };
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
function studioLink(v) {                                            // open the exhibit already dyed
  const cfg = { preset: 'wyld', wyld: true, wyldDark: v.wyld.darkness, wyldSheer: v.wyld.sheer, decal: v.decal };
  return `${WROOMDATA.bike.viewer}#cfg=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(cfg)))))}`;
}
function visitWyld(v) {
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = null;
  route(v.view, v.face, null); path.wyld = v;
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.room === 'wyld'));
}

// A brand room product (Nike shoe today, any gear tomorrow): walk over, face it, open its card.
function visitBrand(p) {
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = null;
  loadBrand();
  route(p.view, p.face, null); path.brand = p;
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.room === p.room));
}
function openBrand(p) {
  $('cYears').textContent = `${p.brand} · ${p.year || ''}`.trim();
  $('cName').textContent = `${p.brand} ${p.model}`;
  $('cMat').textContent = p.sub || '';
  $('cNote').textContent = p.text || '';
  $('cStats').hidden = !p.stats;
  if (p.stats) $('cStats').innerHTML = p.stats.map(([b, s]) => `<div><b>${esc(b)}</b><small>${esc(s)}</small></div>`).join('');
  $('cMedia').innerHTML = (p.legal ? `<p class="c-view" style="opacity:.7">${esc(p.legal)}</p>` : '')
    + (p.source ? `<a class="c-src" href="${esc(p.source)}" target="_blank" rel="noopener">Official specification ↗</a>` : '');
  $('cActions').innerHTML = (p.buy ? `<a class="btn primary" href="${esc(p.buy)}" target="_blank" rel="noopener">Where to buy <span aria-hidden="true">→</span></a>` : '')
    + `<button class="btn ghost" id="cBrandOut">Keep walking</button>`;
  $('cBrandOut').onclick = () => closeCard();
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
function loadBrand() {
  if (brandLoaded || !brandRooms.length) return; brandLoaded = true;
  for (const r of brandRooms) r.spinners = spinners;
  const bl = makeBrandLoader();
  Promise.all(brandRooms.map(r => loadBrandRoom(r, bl))).catch(e => console.warn('brandRoom load', e));
}
function openWyld(v) {
  const B = WROOMDATA.bike, P2 = WROOMDATA.palette;
  $('cYears').textContent = `WYLD Room · ${B.name} · ${B.year}`;
  $('cName').textContent = v.name; $('cMat').textContent = v.sub; $('cNote').textContent = v.text;
  $('cStats').hidden = false; $('cStats').innerHTML = B.stats.map(([b, s2]) => `<div><b>${esc(b)}</b><small>${esc(s2)}</small></div>`).join('');
  const V = WROOMDATA.view;
  $('cMedia').innerHTML = `<div class="c-dyes">${Object.entries(P2).map(([k, c]) => `<span style="background:${c}" title="${k} ${c}"></span>`).join('')}</div>`
    + `<p class="c-view">Through the window: ${esc(V.caption)}. <a href="${esc(V.page)}" target="_blank" rel="noopener">© ${esc(V.author)} · ${esc(V.license)} ↗</a> (${esc(V.changes)})</p>`;
  const next = wyldBikes[(v.index + 1) % wyldBikes.length];
  $('cActions').innerHTML = `<a class="btn primary" href="${esc(studioLink(v))}"><span class="long">Open in&nbsp;</span>3D studio <span aria-hidden="true">→</span></a><button class="btn ghost" id="cNextDye">Next<span class="long">:&nbsp;${esc(next.name.replace('WYLD ', ''))}</span> <span aria-hidden="true">→</span></button>`;
  $('cNextDye').onclick = () => visitWyld(next);
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
function openInfo(n) {
  if (exploded) setExploded(exploded, false);
  current = null; champ = null;
  $('cYears').textContent = n.eyebrow; $('cName').textContent = n.title; $('cMat').textContent = n.sub; $('cNote').textContent = n.text;
  $('cStats').hidden = true;
  $('cMedia').innerHTML = n.photo ? `<figure class="c-photo"><img src="${esc(n.photo.src)}" alt="${esc(n.photo.caption)}" referrerpolicy="no-referrer"><figcaption>${esc(n.photo.caption)}<br><a href="${esc(n.photo.page)}" target="_blank" rel="noopener">© ${esc(n.photo.author)} · ${esc(n.photo.license)} ↗</a></figcaption></figure>` : '';
  $('cActions').innerHTML = `<button class="btn ghost" id="cInfoClose">Keep walking</button>`;
  $('cInfoClose').onclick = () => closeCard();
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
// ------------------------------------------------------------------ the pier: a year, a machine, the finish
let yearSel = null;
function visitPier(target) {                                          // target: a year station or the finale
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = null; pier.load(); loadPierBike();
  route(target.view, target.face, null); path.pier = target;
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.room === 'pier'));
}
const credit = c => `<a href="${esc(c.source.page)}" target="_blank" rel="noopener">© ${esc(c.source.author)} · ${esc(c.source.license)} ↗</a>`;
const paintingFig = c => `<figure class="c-photo"><img src="assets/kona-years/${esc(c.id)}.jpg" alt="${esc(c.caption)}, as a painted canvas"><figcaption>${esc(c.caption)}<br>Painted from a Wikimedia Commons photograph: ${credit(c)} · the canvas carries the same licence</figcaption></figure>`;
function openYear(s) {
  yearSel = s; champ = null; current = null;
  const raced = s.status === 'raced';
  $('cYears').textContent = raced ? `Kona ${s.year} · ${s.race}'s race · best Speedmax` : `Kona ${s.year}`;
  $('cName').textContent = raced ? s.athlete : s.headline;
  $('cMat').textContent = raced ? [ordinal(s.place), s.time || s.gap, s.bike].filter(Boolean).join(' · ') : 'No world championship on the Big Island';
  $('cNote').textContent = s.note;
  $('cStats').hidden = !raced;
  if (raced) $('cStats').innerHTML = [[ordinal(s.place), s.place === 1 ? 'world champion' : 'place'], [s.time || s.gap, s.time ? 'finish' : 'to the winner'], [s.bike.replace('Speedmax ', ''), 'Speedmax']]
    .map(([b, s2]) => `<div><b>${esc(b)}</b><small>${esc(s2)}</small></div>`).join('');
  $('cMedia').innerHTML = (s.canvasInfo ? paintingFig(s.canvasInfo) : '')
    + `<p class="c-view">${s.sources.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Source ${i + 1} ↗</a>`).join(' · ')}</p>`;
  const next = pier.stations[s.index + 1];
  $('cActions').innerHTML = `<button class="btn primary" id="cNextYear">${next ? `Next: ${next.year}` : 'To the finish'} <span aria-hidden="true">→</span></button><button class="btn ghost" id="cHall">Back<span class="long"> to the hall</span></button>`;
  $('cNextYear').onclick = () => visitPier(next || pier.finale);
  $('cHall').onclick = () => { closeCard(); yearSel = null; route({ x: 0, z: -37.2 }, null, null); };
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
function openEra(e) {
  current = null; champ = null;
  $('cYears').textContent = 'The Kona machine'; $('cName').textContent = e.era.name.split(' · ')[0]; $('cMat').textContent = e.era.name.split(' · ')[1] || '';
  $('cNote').textContent = e.era.text; $('cStats').hidden = true;
  $('cMedia').innerHTML = paintingFig(e.canvas);
  $('cActions').innerHTML = `<button class="btn primary" id="cWalk">Walk the years <span aria-hidden="true">→</span></button>`;
  $('cWalk').onclick = () => visitPier(pier.stations[0]);
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
function openFinale() {
  current = null; champ = null; yearSel = null;
  const cfr = PIECES.find(p => p.key === 'cfr');
  $('cYears').textContent = 'The finish · MY2027'; $('cName').textContent = cfr?.name || 'Speedmax CFR';
  $('cMat').textContent = 'The descendant of every bike on this pier';
  $('cNote').textContent = 'Twelve Octobers end here, under the arch: the current Speedmax CFR, turning slowly over Kailua Bay. Step into its studio to take it apart, paint it, or put it in the wind tunnel.';
  $('cStats').hidden = !cfr?.stats; if (cfr?.stats) $('cStats').innerHTML = cfr.stats.map(([b, s2]) => `<div><b>${esc(b)}</b><small>${esc(s2)}</small></div>`).join('');
  $('cMedia').innerHTML = '';
  $('cActions').innerHTML = (cfr?.viewer ? `<a class="btn primary" href="${esc(cfr.viewer)}"><span class="long">Enter </span>3D studio <span aria-hidden="true">→</span></a>` : '') + `<button class="btn ghost" id="cBackYears">Back to 2014</button>`;
  $('cBackYears').onclick = () => visitPier(pier.stations[0]);
  $('card').classList.add('on'); document.body.classList.add('card-open');
}

// ------------------------------------------------------------------ Lava Night
function visitHween() {
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = null; loadHweenBike();
  route(hween.piece.view, hween.piece.face, null); path.hween = true;
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.room === 'hween'));
}
function openHween() {
  current = null; champ = null;
  const cfr = PIECES.find(p => p.key === 'cfr');
  $('cYears').textContent = 'Lava Night · Halloween'; $('cName').textContent = 'Speedmax CFR, after dark';
  $('cMat').textContent = 'Midnight black · ember lettering · a museum livery';
  $('cNote').textContent = 'Once a year the lava field under the museum wakes up. The lanterns are carved, the bats are out, and the MY2027 Speedmax CFR wears black and ember. The paint is ours, made for the night — not a Canyon colourway. The skeleton is still waiting for its finish line.';
  $('cStats').hidden = !cfr?.stats; if (cfr?.stats) $('cStats').innerHTML = cfr.stats.map(([b, s2]) => `<div><b>${esc(b)}</b><small>${esc(s2)}</small></div>`).join('');
  $('cMedia').innerHTML = '';
  $('cActions').innerHTML = (cfr?.viewer ? `<a class="btn primary" href="${esc(cfr.viewer)}"><span class="long">Enter </span>3D studio <span aria-hidden="true">→</span></a>` : '') + `<button class="btn ghost" id="cHweenOut">Back<span class="long"> to the hall</span></button>`;
  $('cHweenOut').onclick = () => { closeCard(); route({ x: -1, z: 2.5 }, null, null); };
  $('card').classList.add('on'); document.body.classList.add('card-open');
}

function visitSanctuary(film) {
  if (!film) return;
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = null;
  route(film.view, film.face, null); path.sanctuary = film;
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.room === 'sanctuary'));
}
function openSanctuary(film) {
  current = null; champ = null;
  $('cYears').textContent = `${film.film} · ${film.place}`;
  $('cName').textContent = film.name;
  $('cMat').textContent = film.sub;
  $('cNote').textContent = `${film.tagline} ${film.persona}.`;
  $('cStats').hidden = true;
  const dyes = film.stops.map(c => `<span style="background:${c}" title="${c}"></span>`).join('');
  $('cMedia').innerHTML = `<div class="c-dyes">${dyes}</div><p class="c-view">${esc(film.tagline)}</p>`;
  const next = sanctuary.films[(film.index + 1) % sanctuary.films.length];
  $('cActions').innerHTML = `<a class="btn primary" href="https://joaoccaldas.github.io/ai/studio/wyld-store/bike-porn/#${esc(film.id)}">Watch the film <span aria-hidden="true">→</span></a><button class="btn ghost" id="cNextFilm">Next<span class="long">: ${esc(next.name)}</span></button>`;
  $('cNextFilm').onclick = () => visitSanctuary(next);
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
function visitGallery(spot) {
  if (!spot) return;
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = null;
  route(spot.view, spot.face, null); path.gallery = spot;
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.room === 'gallery'));
}
function openGallery(spot) {
  current = null; champ = null;
  const list = [...galleries.bays, ...galleries.rooms], next = list[(list.indexOf(spot) + 1) % list.length];
  renderCard(roomCard({ ...spot, kindLabel: galleries.rooms.includes(spot) ? 'Themed room' : 'Themed floor' },
    { next: next.title || next.name, onNext: () => visitGallery(next), onDown: () => { closeCard(); route({ x: 0, z: 2.2 }, null, null); } }));
}

// ------------------------------------------------------------------ wings (engine/wing.js) and their cards (engine/card.js)
function visitAtlas(inst) {                                           // a bike (or the paint-shop turntable)
  if (current && current.exT > 0) setExploded(current, false);
  closeCard(); champ = null;
  route(inst.view, inst.face, null); path.atlas = inst;
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.room === `wing-${inst.room?.wing}`));
}
function visitArt(item) { closeCard(); champ = null; route(item.view, item.face, null); path.art = item; }
function visitAtlasRoom(room) {
  closeCard(); champ = null;
  if (room.feature === 'paintshop' && atlas.show) { visitAtlas(atlas.show); return; }
  if (room.bikes[0]) { visitAtlas(room.bikes[0]); return; }
  if (room.art[0]) { visitArt(room.art[0]); return; }
  route(room.view, room.look, null);
}
function openAtlas(inst) {
  current = null; champ = null;
  const b = inst.data; if (!b) return;
  const i = atlas.bikes.findIndex(x => x.data === b), next = atlas.bikes[(i + 1) % atlas.bikes.length];
  const card = bikeCard(b, {
    skin: inst.skin, method: window.__ATLAS?.method,
    onSkin: sk => { haptic(6); if (inst.showcase) { atlas.setShow(window.__ATLAS.bikes.indexOf(b), b.skins.indexOf(sk)); atlas.show.hold = 30; } else atlas.applySkin(inst, sk); },
    next: next?.data.name, onNext: () => visitAtlas(next),
    onPaint: atlas.show ? () => { if (!inst.showcase) { atlas.setShow(window.__ATLAS.bikes.indexOf(b), 0); atlas.show.hold = 30; } visitAtlas(atlas.show); } : null,
  });
  card.actions.push({ label: 'Open in the studio', href: `Studio.html?p=atlas-${b.key}` });
  renderCard(card);
}
function openArt(item) {
  current = null; champ = null;
  const list = [...atlas.paintings, ...atlas.sculptures], next = list[(list.indexOf(item) + 1) % list.length];
  const opts = { room: item.room?.name, next: next?.data.title, onNext: () => visitArt(next) };
  renderCard(item.kind === 'sculpture' ? { ...sculptureCard(item.data, opts), actions: [{ label: `Next: ${next.data.title}`, primary: true, onClick: () => visitArt(next) }] } : paintingCard(item.data, opts));
}
function openRef(ref) { current = null; champ = null; renderCard(photoCard(ref)); }

// ------------------------------------------------------------------ guided tour: hands-free walk through the highlights
const tour = { on: false, i: -1, t: 0, paused: false, stops: [] };
const DWELL = 9;                                                     // seconds at each stop
function tourStops() {
  const H = PIECES.filter(p => p.glb && !p.flagship), F = PIECES.filter(p => p.flagship);
  const stops = [{ kind: 'hween' }, ...H.map(p => ({ kind: 'piece', p })),
    ...[0, 2, 4, 5].map(i => champs[i]).filter(Boolean).map(c => ({ kind: 'champ', c })),
    ...[0, 3].map(i => wyldBikes[i]).filter(Boolean).map(v => ({ kind: 'wyld', v })),
    ...F.map(p => ({ kind: 'piece', p })),
    ...(pier ? [0, 4, 9, 10, 11].map(i => pier.stations[i]).filter(Boolean).map(y => ({ kind: 'pier', y })).concat([{ kind: 'pier', y: pier.finale }]) : [])];
  return stops;
}
function tourGo(i) {
  tour.i = i; tour.t = 0; const st = tour.stops[i];
  if (!st) return tourEnd(true);
  if (st.kind === 'piece') visit(st.p); else if (st.kind === 'champ') visitChamp(st.c); else if (st.kind === 'pier') visitPier(st.y); else if (st.kind === 'hween') visitHween(); else visitWyld(st.v);
  $('tourStep').textContent = `${i + 1} / ${tour.stops.length}`;
  $('tourBar').style.setProperty('--p', 0);
}
function tourStart() {
  $('coach').hidden = true;
  if (!started) enter();
  tour.stops = tourStops(); tour.on = true; tour.paused = false; document.body.classList.add('touring');
  $('tourPause').textContent = 'Pause'; haptic(12);
  tourGo(0);
}
function tourEnd(finished) {
  if (!tour.on) return;
  tour.on = false; document.body.classList.remove('touring');
  toast(finished ? 'That was the collection. Walk on, or tap any piece to revisit it.' : 'Tour paused — you have the controls.');
}
function tourTick(dt) {
  if (!tour.on || tour.paused || path) return;
  if (!$('card').classList.contains('on')) return;                   // wait until we've arrived and the card is up
  tour.t += dt; $('tourBar').style.setProperty('--p', Math.min(1, tour.t / DWELL));
  if (tour.t >= DWELL) tourGo(tour.i + 1);
}
$('tourBtn')?.addEventListener('click', tourStart);
$('tourPause')?.addEventListener('click', () => { tour.paused = !tour.paused; $('tourPause').textContent = tour.paused ? 'Resume' : 'Pause'; });
$('tourNext')?.addEventListener('click', () => tourGo(tour.i + 1));
$('tourStop')?.addEventListener('click', () => tourEnd(false));
function haptic(ms = 8) { try { if (coarse) navigator.vibrate?.(ms); } catch (_) { } }

// ------------------------------------------------------------------ first visit on a phone: three quick coach marks
const coachState = { k: -1, steps: [] };
function coach() {                                                  // returns true when the coach will speak
  let seen = false; try { seen = localStorage.getItem('speedmax.coach.v1') === '1'; } catch (_) { }
  if (seen || !coarse) return false;
  coachState.steps = [['joy', 'Push the tri-stick to walk'], ['look', 'Drag anywhere to look around'], ['tap', 'Tap a bike to visit it']];
  setTimeout(() => { if (!tour.on) coachShow(0); }, 900);
  return true;
}
function coachShow(k) {
  const el = $('coach'); coachState.k = k;
  if (k >= coachState.steps.length) { el.hidden = true; try { localStorage.setItem('speedmax.coach.v1', '1'); } catch (_) { } return; }
  const [kind, txt] = coachState.steps[k];
  el.dataset.kind = kind; el.querySelector('b').textContent = txt; el.querySelector('small').textContent = `${k + 1} of ${coachState.steps.length}`; el.hidden = false;
}
function coachDid(kind) {                                            // the hint advances when the visitor does the thing
  if (coachState.k < 0 || $('coach').hidden) return;
  if (coachState.steps[coachState.k]?.[0] === kind) { haptic(6); coachShow(coachState.k + 1); }
}
$('coachOk')?.addEventListener('click', () => coachShow(coachState.k + 1));

function enter() {
  if (started) return; started = true;
  document.body.classList.add('walking'); $('intro').classList.add('off');
  const coaching = coarse && (() => { try { return localStorage.getItem('speedmax.coach.v1') !== '1'; } catch (_) { return true; } })();
  const returning = passport.visits > 0 && passport.pose && ['hall', 'champ', 'wyld', 'pier', 'hween'].includes(passport.pose.region)
    && walkable(passport.pose.x, passport.pose.z);
  passport.visits = (passport.visits || 0) + 1;
  try { applyStoredEvent({ type: 'FIRST_VISIT', id: 'FIRST_VISIT:museum' }); } catch (_) { }
  if (returning) {
    P.x = passport.pose.x; P.z = passport.pose.z; P.yaw = passport.pose.yaw || 0; P.pitch = passport.pose.pitch ?? -.04;
    path = null;
    const { seen, total } = passportProgress();
    if (!coaching) toast(`Welcome back · Museum Passport ${seen}/${total}`);
  } else {
    if (!coaching) toast(coarse ? 'Walk with the tri-stick · drag to look around · tap any bike' : 'WASD to walk · drag to look · click a bike or press 1–9');
    path = [{ x: 0, z: .6 }];
  }
  writePassport(); canvas.focus({ preventScroll: true }); haptic(10); coach();
  if (profile.get().sound && $('soundBtn').getAttribute('aria-pressed') !== 'true') $('soundBtn').click();
  if (!returning && pier && new URLSearchParams(location.search).get('room') === 'pier') setTimeout(() => visitPier(pier.stations[0]), 400);
  { // app shortcuts and shared links: ?room=<map area id> walks there, ?map=1 opens the map
    const q = new URLSearchParams(location.search), room = q.get('room');
    if (room && room !== 'pier' && /^[a-z0-9-]{2,40}$/.test(room)) setTimeout(() => window.__museumGo?.(room), 450);
    if (q.get('map')) setTimeout(() => window.__map?.open(), 450);
  }
}
if ($('enterBtn') && !document.getElementById('konaShell')) $('enterBtn').onclick = enter;

// ------------------------------------------------------------------ UI: rail, card, toast, hover tag
$('railInner').innerHTML = PIECES.map((p, i) => `<button class="chip${p.glb ? '' : ' ghost'}" data-i="${i}" aria-label="${esc(p.name)}, ${esc(p.years)}">
  <span class="n">${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy">` : i + 1}</span><span><small>${esc(p.years)}</small><b>${esc(p.name.replace(/^Speed[Mm]ax /, ''))}</b></span></button>`).join('');
if (KONA.titles.length) $('railInner').insertAdjacentHTML('afterbegin', `<button class="chip kona" data-room="kona" aria-label="Kona Champions room"><span class="n">K</span><span><small>${KONA.titles.length} TITLES</small><b>Kona Champions</b></span></button>`);
if (WROOMDATA) $('railInner').insertAdjacentHTML('afterbegin', `<button class="chip wyld" data-room="wyld" aria-label="WYLD Room"><span class="n">W</span><span><small>4 DYES · MY2027</small><b>WYLD Room</b></span></button>`);
if (pier) $('railInner').insertAdjacentHTML('afterbegin', `<button class="chip pier" data-room="pier" aria-label="The Kona Pier: Kona by Year"><span class="n"><img src="assets/kona-years/y2019.jpg" alt="" loading="lazy"></span><span><small>2014 — 2025</small><b>Kona by Year</b></span></button>`);
$('railInner').insertAdjacentHTML('afterbegin', `<button class="chip hween" data-room="hween" aria-label="Lava Night, the Halloween room"><span class="n" aria-hidden="true">🎃</span><span><small>HALLOWEEN</small><b>Lava Night</b></span></button>`);
for (const r of [...brandRooms].reverse()) $('railInner').insertAdjacentHTML('afterbegin', `<button class="chip brand" data-room="${esc(r.desc.id)}" aria-label="${esc(r.desc.name)}"><span class="n" style="background:${esc(r.desc.theme?.accent || '#c9a13b')};-webkit-background-clip:text;background-clip:text;color:transparent">${esc(r.desc.name.slice(0, 1))}</span><span><small>${r.products.length} PRODUCT${r.products.length > 1 ? 'S' : ''}</small><b>${esc(r.desc.name)}</b></span></button>`);
$('railInner').insertAdjacentHTML('afterbegin', `<button class="chip sanctuary" data-room="sanctuary" aria-label="Sanctuary chapel, eight films"><span class="n">S</span><span><small>8 FILMS</small><b>Sanctuary</b></span></button>`);
for (const w of [...atlas.wings].reverse()) $('railInner').insertAdjacentHTML('afterbegin', `<button class="chip atlas" data-room="wing-${esc(w.id)}" aria-label="${esc(w.name)}: ${esc(w.sub)}"><span class="n" aria-hidden="true">${w.features?.clock ? '⏱' : '✦'}</span><span><small>UPPER FLOOR · ${atlas.rooms.filter(r => r.wing === w.id).reduce((n, r) => n + r.bikes.length + r.art.length, 0)} WORKS</small><b>${esc(w.name)}</b></span></button>`);
for (const r of [...galleries.rooms].reverse()) $('railInner').insertAdjacentHTML('afterbegin', `<button class="chip ${r.id}" data-room="${r.id}" aria-label="${r.name}"><span class="n">${r.name.slice(0, 1)}</span><span><small>UPPER FLOOR</small><b>${r.name}</b></span></button>`);
// ------------------------------------------------------------------ museum map + canonical room-overview navigation
{
  const WORDS = Object.fromEntries((window.__ROOMS?.areas || []).map(a => [a.id, a]));
  const AREA_COLOR = { hall: '#eadfca', sanctuary: '#d7c7e6', hween: '#f0a86c', kona: '#e2b27c', wyld: '#ffc4dd', pier: '#cfe4e2', stair: '#dcd6cb', nave: '#ece6da', ...Object.fromEntries(brandRooms.map(r => [r.desc.id, r.desc.theme?.accent || '#c9a13b'])) };
  const R = (id, name, sub, rect, floor, color, extra = {}) => ({ id, name, sub, x0: rect.x0, x1: rect.x1, z0: rect.z0, z1: rect.z1, floor, color, ...extra });
  const liveAreas = [
    ...['hall', 'sanctuary', 'hween', 'kona', ...(WROOMDATA?['wyld']:[]), ...(pier ? ['pier'] : []), 'stair', 'nave'].map(id => {
      const w = WORDS[id], rect = { hall: HALL, sanctuary: SROOM, hween: HROOM, kona: ROOM, wyld: WROOM, pier: pier && { x0: PIER.x0, x1: PIER.x1, z0: PIER.z0, z1: PIER.z1 }, stair: { x0: 7.35, x1: 12.3, z0: .75, z1: 6.55 }, nave: { x0: 7.5, x1: 16.5, z0: 5.55, z1: 27.2 } }[id];
      return R(id, w?.short || id, w?.sub || '', rect, w?.floor || 'ground', AREA_COLOR[id], id === 'stair' || id === 'nave' ? { layer: 0 } : {});
    }),
    ...brandRooms.map(r => R(r.desc.id, r.desc.name, r.desc.kicker || '', r.bounds, 'ground', r.desc.theme?.accent || '#c9a13b')),
    ...galleries.bays.map(b => R('bay-' + b.id, b.title, b.sub, { x0: 8.4, x1: 14.8, z0: b.z - 1.8, z1: b.z + 1.8 }, 'upper', b.floor, { layer: 1, ink: /^#(1|0)/.test(b.floor) ? '#fbf9f5' : '#12181d', kind: 'bay' })),
    ...galleries.rooms.map(r => R('room-' + r.id, r.name, r.sub, { x0: 16.5, x1: 25.1, z0: r.z1, z1: r.z0 }, 'upper', r.vein, { layer: 1, ink: '#12181d' })),
    ...atlas.wings.map(w => R('wing-' + w.id, w.name, w.sub, w.corridor, w.floor, w.corridor.map_color || '#c89b62', { layer: 0 })),
    ...atlas.rooms.map(r => R('atlas-' + r.wing + '-' + r.id, r.name, r.feature === 'paintshop' ? 'Every livery' : r.feature === 'references' ? 'The photographs' : [r.bikes.length ? `${r.bikes.length} bike${r.bikes.length > 1 ? 's' : ''}` : '', r.art.length ? `${r.art.length} work${r.art.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') || r.sub, r.rect, 'upper', r.tint, { layer: 1, ink: '#fbf9f5' })),
  ];
  const areas = withFutureLevels(liveAreas);

  function prepareRoom(id){
    if(id==='pier'){pier?.load?.();loadPierBike();}
    else if(id==='hween') loadHweenBike();
    else if(brandRooms.some(r=>r.desc.id===id)) loadBrand();
  }
  function safeOverview(area){
    const overview=roomOverview(area,{upperY:UPPER+1.6,groundY:EYE});
    if(!overview) return null;
    if(walkable(overview.to.x,overview.to.z)) return overview;
    const cx=(area.x0+area.x1)/2,cz=(area.z0+area.z1)/2;
    const candidates=[
      {x:cx,z:cz},
      {x:area.x0+(area.x1-area.x0)*.25,z:cz},
      {x:area.x0+(area.x1-area.x0)*.75,z:cz},
      {x:cx,z:area.z0+(area.z1-area.z0)*.25},
      {x:cx,z:area.z0+(area.z1-area.z0)*.75},
    ];
    const to=candidates.find(p=>walkable(p.x,p.z))||overview.to;
    return {...overview,to};
  }
  const accessForRoom=id=>roomAccess(id,{admin:globalThis.__konaAccess?.admin===true});
  const go = id => {
    const area=liveAreas.find(a=>a.id===id);
    if(!area) return;
    const gate=accessForRoom(id);
    if(!gate.unlocked){toast(`Level ${gate.requiredLevel} · keep exploring to unlock ${area.name}`);return;}
    if (!started) enter();
    tourEnd(false); closeCard(); prepareRoom(id);
    const ov=safeOverview(area); if(!ov) return;
    const face=new THREE.Vector3(ov.face.x,ov.face.y,ov.face.z);
    route(ov.to,face,null);
    path.roomOverview=id;
    document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.room===id));
    toast(`${area.name} · room overview`);
  };
  window.__museumGo = go;
  window.__map = initMap({ areas, go, access:accessForRoom, button: $('mapBtn'), pose: () => ({ x: P.x, z: P.z, yaw: P.yaw, floor: P.y > 3.3 ? 'upper' : 'ground' }) });

  const where = $('where'); let lastWhere = null, wingHinted = (() => { try { return localStorage.getItem('speedmax.atlas.hint') === '1'; } catch (_) { return false; } })();
  where?.addEventListener('click', () => window.__map.open());
  setInterval(() => {
    if (!started || !where) return;
    const a = window.__map.here();
    const id = a?.id || null; if (id === lastWhere) return; lastWhere = id;
    where.hidden = !a;
    if (a) { where.querySelector('b').textContent = a.name; where.querySelector('small').textContent = a.floor === 'upper' ? 'Upper floor' : 'Ground floor'; where.querySelector('i').style.background = a.color; where.classList.remove('pop'); void where.offsetWidth; where.classList.add('pop'); }
    if ((id?.startsWith('atlas') || id?.startsWith('wing')) && !wingHinted) { wingHinted = true; try { localStorage.setItem('speedmax.atlas.hint', '1'); } catch (_) { } toast('Tap any bike or artwork for its story · M opens the world map'); }
  }, 350);
}
$('railInner').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return; if (!started) enter(); tourEnd(false); haptic(8);
  if (b.dataset.room) { window.__museumGo?.(b.dataset.room); return; }
  visit(PIECES[+b.dataset.i]);
});
function railActive(p) {
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', +c.dataset.i === p?.index));
  document.querySelector(`.chip[data-i="${p?.index}"]`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
}
function openCard(p) {
  $('cYears').textContent = `${p.years} · No. ${String(p.index + 1).padStart(2, '0')}`;
  $('cName').textContent = p.name; $('cMat').textContent = p.material || '';
  $('cNote').textContent = p.glb ? p.note : `${p.note} ${p.why || ''}`.trim();
  $('cStats').innerHTML = p.stats ? p.stats.map(([b, s]) => `<div><b>${esc(b)}</b><small>${esc(s)}</small></div>`).join('') : '';
  $('cStats').hidden = !p.stats; partSel = null; highlight(p, null);
  document.querySelectorAll('.plabel').forEach(b => b.classList.remove('on'));
  const exploded = p.exT > 0;
  $('cMedia').innerHTML = (exploded && p.anchors ? `<div class="c-parts"><small>Parts · tap to read</small><div>${p.anchors.map((a, i) => `<button data-part="${a.id}"><i>${i + 1}</i>${esc(p.parts[a.id].name)}</button>`).join('')}</div></div>` : '')
    + (p.photo ? `<figure class="c-photo"><img src="${esc(p.photo.src)}" alt="${esc(p.name)}, ${esc(p.photo.credit)}" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption><a href="${esc(p.photo.href)}" target="_blank" rel="noopener">${esc(p.photo.credit)} ↗</a></figcaption></figure>` : '')
    + (p.uncertain?.length ? `<details class="c-unc"><summary>What is reconstructed</summary><ul>${p.uncertain.map(u => `<li>${esc(u)}</li>`).join('')}</ul></details>` : '');
  $('cMedia').querySelectorAll('.c-parts button').forEach(b => b.onclick = () => openPart(p, b.dataset.part));
  const next = PIECES[(p.index + 1) % PIECES.length];
  $('cActions').innerHTML = (p.bike ? `<button class="btn ghost" id="cExplode" aria-pressed="${exploded}">${exploded ? 'Assemble' : 'Explode'}</button>` : '')
    + (p.viewer ? `<a class="btn primary" href="${esc(p.viewer)}"><span class="long">Enter </span>3D studio <span aria-hidden="true">→</span></a>` : '')
    + `<button class="btn ghost" id="cNext" aria-label="Next piece: ${esc(next.years)}">Next<span class="long">: ${esc(next.years)}</span> <span aria-hidden="true">→</span></button>`
    + (p.source && !p.viewer ? `<a class="c-src" href="${esc(p.source)}" target="_blank" rel="noopener">Archive source ↗</a>` : '');
  $('cNext').onclick = () => visit(next);
  if (p.glb && p.key) $('cActions').insertAdjacentHTML('beforeend', `<a class="btn ghost" href="Studio.html?p=canyon-${p.key === 'cfr' || p.key === 'slx' ? p.key + '-2027' : esc(p.key)}">Paint it<span class="long"> in the studio</span></a>`);
  if ($('cExplode')) $('cExplode').onclick = () => setExploded(p, !(p.exT > 0));
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
function closeCard(keepCurrent) {
  $('card').classList.remove('on'); document.body.classList.remove('card-open');
  if (!keepCurrent) { if (exploded) setExploded(exploded, false); current = null; railActive(null); }
}
$('cardClose').onclick = () => { tourEnd(false); closeCard(); };
let toastT; function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 4200); }

// ------------------------------------------------------------------ exploded view: parts with their stories
const LABEL_ORDER = ['frame', 'fork', 'wheel_front', 'wheel_rear', 'aeroshield', 'extensions', 'basebar', 'base_bar', 'stem', 'riser',
  'aerofuel_front', 'crankset', 'chain', 'cassette', 'rear_derailleur', 'front_derailleur', 'caliper_front', 'brake_front', 'brake_rear',
  'brake_levers', 'seatpost', 'saddle', 'toptube_storage_lid'];
function labelled(p) {
  if (!p.parts || !p.nodes) return [];
  return LABEL_ORDER.filter(id => p.nodes[id] && p.parts[id]).slice(0, lite ? 10 : 14);
}
let partSel = null, exploded = null;                                 // the one bike currently apart
function setExploded(p, on) {
  if (!p?.bike) return;
  if (on && exploded && exploded !== p) setExploded(exploded, false);
  p.exT = on ? 1 : 0; exploded = on ? p : (exploded === p ? null : exploded);
  if (on) {
    const ids = labelled(p);
    const wp = new THREE.Vector3();
    p.bike.updateMatrixWorld(true);
    p.anchors = ids.map(id => {                                     // label anchor: the part's own centre, in its node space
      const n = p.nodes[id], box = new THREE.Box3().setFromObject(n);
      return { id, node: n, local: n.worldToLocal(box.getCenter(wp).clone()) };
    });
    $('labels').innerHTML = p.anchors.map((a, i) => `<button class="plabel" data-part="${a.id}"><i>${i + 1}</i><span>${esc(p.parts[a.id].name)}</span></button>`).join('');
  } else { $('labels').innerHTML = ''; p.anchors = null; highlight(p, null); }
  $('labels').classList.toggle('on', on);
  if (current === p && $('card').classList.contains('on') && !partSel) openCard(p);
}
const hlMats = new Map();
function highlight(p, id) {
  for (const [m, orig] of hlMats) { m.emissive.copy(orig.e); m.emissiveIntensity = orig.i; }
  hlMats.clear();
  if (!p?.nodes || !id || !p.nodes[id]) return;
  p.nodes[id].traverse(o => {
    if (!o.isMesh) return;
    if (!o.userData.ownMat) { o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); o.userData.ownMat = true; }
    for (const m of [].concat(o.material)) if (m.emissive) { hlMats.set(m, { e: m.emissive.clone(), i: m.emissiveIntensity }); m.emissive.set('#1ba7a3'); m.emissiveIntensity = .55; }
  });
}
function openPart(p, id) {
  const info = p.parts?.[id]; if (!info) return;
  partSel = id; highlight(p, id);
  document.querySelectorAll('.plabel').forEach(b => b.classList.toggle('on', b.dataset.part === id));
  $('cYears').textContent = `${p.name} · ${info.group || 'part'}`;
  $('cName').textContent = info.name;
  $('cMat').textContent = info.specLabel ? `Archived spec · ${info.specLabel}` : info.weight ? `${info.weight} g · manufacturer weight` : '';
  $('cNote').innerHTML = [info.spec ? `<b class="c-spec">${esc(info.spec)}</b>` : '', info.note ? esc(info.note) : ''].filter(Boolean).join('<br>');
  $('cStats').hidden = true; $('cMedia').innerHTML = '';
  const ids = (p.anchors || []).map(a => a.id), i = ids.indexOf(id), nxt = ids[(i + 1) % ids.length];
  $('cActions').innerHTML = `<button class="btn ghost" id="cBack">← ${esc(p.name.replace(/^Speed[Mm]ax /, ''))}</button>`
    + (nxt && nxt !== id ? `<button class="btn primary" id="cNextPart">Next part <span aria-hidden="true">→</span></button>` : '');
  $('cBack').onclick = () => openCard(p);
  if ($('cNextPart')) $('cNextPart').onclick = () => openPart(p, nxt);
  $('card').classList.add('on'); document.body.classList.add('card-open');
}
$('labels').addEventListener('click', e => { const b = e.target.closest('.plabel'); if (b && exploded) { current = exploded; openPart(exploded, b.dataset.part); } });
function partOf(p, obj) { for (let o = obj; o; o = o.parent) { const id = o.userData?.part; if (id && p.parts?.[id] && labelled(p).includes(id)) return id; } for (let o = obj; o; o = o.parent) { const id = o.userData?.part; if (id && p.parts?.[id]) return id; } return null; }

// ------------------------------------------------------------------ input
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); ray.far = 40;
  const hits = ray.intersectObjects([...pickables, floor, window.__roomFloor, window.__wyldFloor, hween.group.visible ? hween.floor : null, ...galleries.floors, ...atlas.floors, ...(pier?.group.visible ? pier.floors : [])].filter(Boolean), false);
  for (const h of hits) { if (!h.object.visible) continue; const u = h.object.userData;
    if (u.artPortal) return { artPortal: u.artPortal }; if (u.hween) return { hween: true }; if (u.year) return { year: u.year }; if (u.era) return { era: u.era }; if (u.finale) return { finale: u.finale };
    if (u.wingBike) return { atlas: u.wingBike }; if (u.wingSwatch) return { swatch: u.wingSwatch }; if (u.wingRef) return { ref: u.wingRef }; if (u.wingArt) return { art: u.wingArt };
    if (u.sanctuary) return { sanctuary: u.sanctuary }; if (u.gallery) return { gallery: u.gallery }; if (u.kona) return { kona: u.kona }; if (u.find) return { find: u.find };
    if (u.info) return { info: u.info }; if (u.wyldBike) return { wyld: u.wyldBike }; if (u.brandProduct) { loadBrand(); return { brand: u.brandProduct }; } if (u.piece) return { piece: u.piece, obj: h.object }; if (u.champ) return { champ: u.champ }; if (u.floor) return { point: h.point }; }
  return null;
}
canvas.addEventListener('pointerdown', e => {
  if (!started) return;
  drag = { x: e.clientX, y: e.clientY, yaw: P.yaw, pitch: P.pitch, id: e.pointerId, moved: 0 };
  canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', e => {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    const k = coarse ? .0068 : .0044;
    P.yaw = drag.yaw + dx * k; P.pitch = clamp(drag.pitch + dy * k * .8, -.9, .7);
    if (drag.moved > 6) { if (tour.on) tourEnd(false); path = null; if (drag.moved > 60) coachDid('look'); }
  } else if (started && !coarse) hover = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', e => {
  canvas.style.cursor = '';
  if (!drag || !started) return;
  const moved = drag.moved; drag = null;
  if (moved > 6) return;
  const hit = pick(e.clientX, e.clientY);
  if (hit?.piece && hit.piece === current && current.exT > 0) { const id = partOf(current, hit.obj); if (id) { openPart(current, id); return; } }
  if (hit?.piece && hit.piece === current && $('card').classList.contains('on')) return;
  if (hit?.piece || hit?.champ || hit?.wyld || hit?.info || hit?.artPortal || hit?.year || hit?.era || hit?.finale || hit?.hween || hit?.sanctuary || hit?.gallery || hit?.kona || hit?.find) { haptic(8); tourEnd(false); coachDid('tap'); }
  if (hit?.artPortal) { window.__museumArt?.enter?.(hit.artPortal); closeCard(); return; }
  if (hit?.atlas) { haptic(8); tourEnd(false); hit.atlas.showcase ? openAtlas(hit.atlas) : visitAtlas(hit.atlas); return; }
  if (hit?.swatch) { haptic(8); atlas.paintWith(hit.swatch); openAtlas(atlas.show); return; }
  if (hit?.ref) { haptic(8); openRef(hit.ref); return; }
  if (hit?.art) { haptic(8); tourEnd(false); visitArt(hit.art); return; }
  if (hit?.sanctuary) { visitSanctuary(hit.sanctuary); return; }
  if (hit?.gallery) { visitGallery(hit.gallery); return; }
  if (hit?.hween) { visitHween(); return; }
  if (hit?.year || hit?.finale) { visitPier(hit.year || hit.finale); return; }
  if (hit?.era) { openEra(hit.era); return; }
  if (hit?.find) {
    const spot = hit.find;
    if (findsApi?.take(spot)) toast(`${spot.name}. ${spot.line} ${findsApi.kept.size} of ${FINDS.length}.`);
    else toast(`${spot.name} — already with you.`);
    return;
  }
  if (hit?.kona) { visitKona(hit.kona); return; }
  if (hit?.champ) { visitChamp(hit.champ); return; }
  if (hit?.wyld) { visitWyld(hit.wyld); return; }
  if (hit?.info) { openInfo(hit.info); return; }
  if (hit?.piece) visit(hit.piece);
  else if (hit?.point) { closeCard(); if (walkable(hit.point.x, hit.point.z)) path = [{ x: hit.point.x, z: hit.point.z }]; }
});
canvas.addEventListener('pointercancel', () => { drag = null; });
let hover = null;
addEventListener('wheel', e => { if (!started || e.target !== canvas) return; e.preventDefault(); nudge(-Math.sign(e.deltaY) * Math.min(1.2, Math.abs(e.deltaY) / 90)); }, { passive: false });
function nudge(f) { const nx = P.x - Math.sin(P.yaw) * f, nz = P.z - Math.cos(P.yaw) * f; if (walkable(nx, nz)) { P.x = nx; P.z = nz; } path = null; }
addEventListener('keydown', e => {
  if (e.target.closest?.('input,textarea,select,a')) return;
  const k = e.key.toLowerCase();
  if (!started) { if (k === 'enter' && !$('enterBtn').disabled) { e.preventDefault(); enter(); } return; }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e'].includes(k)) { keys.add(k); path = null; tourEnd(false); if (k.startsWith('arrow')) e.preventDefault(); }
  if (k >= '1' && k <= '9' && PIECES[+k - 1]) visit(PIECES[+k - 1]);
  if (k === 'escape') { if (partSel && current) openCard(current); else closeCard(); }
  if (k === 'x' && current?.bike) setExploded(current, !(current.exT > 0));
  if (k === 'k' && champs.length) visitChamp(champs[0]);
  if (k === 'y' && wyldBikes.length) visitWyld(wyldBikes[0]);
  if (k === 'p' && pier) visitPier(pier.stations[0]);
  if (k === 'h') visitHween();
  if (k === 'enter' && current?.viewer) location.href = current.viewer;
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// ------------------------------------------------------------------ triathlon joystick: swim · bike · run ring, walk with the thumb
const joy = { on: false, x: 0, y: 0, id: null };
{
  const pad = $('joy'), knob = pad?.querySelector('.joy-knob');
  const R = 46;
  const move = e => { const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    joy.x = dx / R; joy.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  pad?.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tourEnd(false); setTimeout(() => coachDid('joy'), 700); joy.on = true; joy.id = e.pointerId; pad.setPointerCapture(e.pointerId); pad.classList.add('on'); path = null; move(e); });
  pad?.addEventListener('pointermove', e => { if (joy.on && e.pointerId === joy.id) move(e); });
  const end = e => { if (e.pointerId !== joy.id) return; joy.on = false; joy.x = joy.y = 0; knob.style.transform = ''; pad.classList.remove('on'); };
  pad?.addEventListener('pointerup', end); pad?.addEventListener('pointercancel', end);
}

// ------------------------------------------------------------------ ocean ambience (synthesised, opt-in)
let audio = null, roomSound = null, audioOn = false;
$('soundBtn').onclick = () => {
  const on = $('soundBtn').getAttribute('aria-pressed') !== 'true';
  $('soundBtn').setAttribute('aria-pressed', on);
  if (on && !audio) {
    const ctx = new AudioContext(), len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }   // brown noise
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const gain = ctx.createGain(); gain.gain.value = 0;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = .09; lfoG.gain.value = .12; lfo.connect(lfoG).connect(gain.gain);
    src.connect(lp).connect(gain).connect(ctx.destination); src.start(); lfo.start();
    const rooms = ctx.createGain(); rooms.gain.value = 0; rooms.connect(ctx.destination);
    roomSound = createRoomSound(ctx, rooms);
    audio = { ctx, gain, rooms };
  }
  audioOn = on;
  if (audio) { audio.ctx.resume(); audio.sea = null; audio.rooms.gain.setTargetAtTime(on ? .9 : 0, audio.ctx.currentTime, .6); }
};

// ------------------------------------------------------------------ frame
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = museumFov(); camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
let last = performance.now(), shift = 0;
function frame(now) {
  requestAnimationFrame(frame);
  // Zero visual cost: pause expensive 3D work when it cannot be seen.
  // Reset the clock while paused so resuming never creates a physics/camera jump.
  if (document.hidden || document.body.classList.contains('kona-panel-open') || document.body.classList.contains('settings-open')) { last = now; return; }
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  // movement: gentle acceleration, slide along obstacles
  let ix = 0, iz = 0;
  if (keys.has('w') || keys.has('arrowup')) iz += 1;
  if (keys.has('s') || keys.has('arrowdown')) iz -= 1;
  if (keys.has('a')) ix -= 1;
  if (keys.has('d')) ix += 1;
  if (keys.has('arrowleft') || keys.has('q')) P.yaw += dt * 1.7;
  if (keys.has('arrowright') || keys.has('e')) P.yaw -= dt * 1.7;
  if (joy.on) { ix += joy.x; iz += -joy.y; }                          // triathlon joystick (touch)
  const sp = (keys.has('shift') ? 5.8 : 3.35) * (joy.on ? Math.min(1, Math.hypot(joy.x, joy.y)) * 1.08 : 1);
  let wx = 0, wz = 0, following = false;
  if (Math.hypot(ix, iz) > .08) {
    const s = Math.sin(P.yaw), c = Math.cos(P.yaw), l = Math.max(1e-3, Math.hypot(ix, iz));
    wx = (-s * iz + c * ix) / l * sp; wz = (-c * iz - s * ix) / l * sp;
    if (current) { if (current.exT > 0) setExploded(current, false); closeCard(); }
  } else if (path && path.length) {
    const g = path[0], dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz);
    if (d < .22) { path.shift(); }
    else {
      following = true;
      const v = Math.min(4.8, d * 3.0 + 1.0); wx = dx / d * v; wz = dz / d * v;
      if (!path.face || path.length > 1) { const want = Math.atan2(-dx, -dz); P.yaw += (((want - P.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * (1 - Math.exp(-dt * 5.2)); }
    }
  }
  if (path && path.face && path.length <= 1) {                        // arrive and turn to the piece
    const fx = path.face.x - P.x, fz = path.face.z - P.z;
    const want = Math.atan2(-fx, -fz), dyaw = ((want - P.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const wantPitch = Math.atan2(path.face.y - (P.y + EYE), Math.hypot(fx, fz));
    P.yaw += dyaw * (1 - Math.exp(-dt * 5.6)); P.pitch += (wantPitch - P.pitch) * (1 - Math.exp(-dt * 4.8));
    if (!path.length && Math.abs(dyaw) < .02) { const pc = path.piece, ch = path.champ, wy = path.wyld, pr = path.pier, hw = path.hween, sa = path.sanctuary, gy = path.gallery, kn = path.kona, ax = path.atlas, ar = path.art, br = path.brand; path = null; if (ax) openAtlas(ax); if (ar) openArt(ar); if (hw) openHween(); if (sa) openSanctuary(sa); if (gy) openGallery(gy); if (kn) openKona(kn); if (pc) openCard(pc); if (ch) openChamp(ch); if (wy) openWyld(wy); if (br) openBrand(br); if (pr) pr.kind === 'finale' ? openFinale() : openYear(pr); }
  } else if (path && !path.length) path = null;
  const k = 1 - Math.exp(-dt * 15); P.vx += (wx - P.vx) * k; P.vz += (wz - P.vz) * k;
  const nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
  if (walkable(nx, nz)) { P.x = nx; P.z = nz; }
  else if (walkable(nx, P.z)) { P.x = nx; P.vz *= .5; }
  else if (walkable(P.x, nz)) { P.z = nz; P.vx *= .5; }
  else P.vx = P.vz = 0;
  if (following && path?.length) {                                   // a waypoint is blocked when it stops getting closer, even while we slide along a wall
    const g = path[0], d = Math.hypot(g.x - P.x, g.z - P.z);
    if (noteProgress(path, g, d, dt)) path.shift();
  }
  const moving = Math.hypot(P.vx, P.vz); bob += dt * moving * 3.1;
  const activeKeys = keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d') || keys.has('arrowup') || keys.has('arrowdown');
  const flowing = started && !tour.on && !$('card').classList.contains('on')
    && (moving > .72 || joy.on || activeKeys || (!!path?.length && moving > .32));
  document.body.classList.toggle('flowing', flowing);
  const targetDpr = flowing ? flowDpr : qualityDpr;
  if (Math.abs(activeDpr - targetDpr) > .01) {
    activeDpr = targetDpr;
    renderer.setPixelRatio(activeDpr);
    renderer.setSize(innerWidth, innerHeight, false);
  }
  // before entering, the camera breathes at the doorway
  const idle = started ? 0 : 1;
  const wantY = atlas.floorY(P.x, P.z) ?? galleryFloorY(P.x, P.z);
  P.y += (wantY - P.y) * (1 - Math.exp(-dt * 8));
  const yaw = P.yaw + idle * Math.sin(t * .13) * .1, pitch = P.pitch + idle * Math.sin(t * .1) * .015;
  camera.position.set(P.x, P.y + EYE + (reduce ? 0 : Math.sin(bob) * .045 * Math.min(1, moving)), P.z);
  fwd.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(look.copy(camera.position).add(fwd));
  const cardOn = $('card').classList.contains('on'), W = innerWidth, H = innerHeight;
  shift += ((cardOn ? 1 : 0) - shift) * (1 - Math.exp(-dt * 4));
  if (shift > .002) { const dx = small ? 0 : W * .17 * shift, dy = small ? H * .23 * shift : 0; camera.setViewOffset(W + 2 * dx, H + 2 * dy, 2 * dx, 2 * dy, W, H); }
  else if (camera.view?.enabled) camera.clearViewOffset();
  // hover (desktop): halo + name tag
  let hot = null;
  if (hover && !drag) { const h = pick(hover.x, hover.y); hot = h?.piece || null; const hc = (h?.art ? { year: h.art.kind === 'sculpture' ? 'Sculpture' : 'Painting', athlete: h.art.data.title, time: h.art.room?.name } : h?.atlas ? { year: h.atlas.data?.year || h.atlas.data?.era || 'Type', athlete: h.atlas.data?.name, time: h.atlas.room?.wingName || 'Paint shop' } : h?.swatch ? { year: 'Paint', athlete: h.swatch.s.name, time: h.swatch.b.name } : h?.ref ? { year: 'Photograph', athlete: h.ref.artist, time: h.ref.license } : null) || h?.champ || (h?.hween ? { year: 'Lava Night', athlete: 'Speedmax CFR, after dark', time: 'Halloween' } : null) || (h?.year ? { year: h.year.year, athlete: h.year.athlete || h.year.headline, time: h.year.status === 'raced' ? `${ordinal(h.year.place)} · ${h.year.bike}` : 'no race' } : h?.finale ? { year: 'Finish', athlete: 'Speedmax CFR', time: 'MY2027' } : h?.era ? { year: 'Machine', athlete: h.era.era.name, time: '' } : null) || (h?.wyld ? { year: 'WYLD', athlete: h.wyld.name, time: h.wyld.sub } : h?.sanctuary ? { year: h.sanctuary.film, athlete: h.sanctuary.name, time: h.sanctuary.persona } : h?.gallery ? { year: 'Upper floor', athlete: h.gallery.title || h.gallery.name, time: h.gallery.sub } : h?.info ? { year: h.info.eyebrow, athlete: h.info.title, time: h.info.sub } : null); const tag = $('tag');
    tag.classList.toggle('on', !!(hot || hc)); canvas.classList.toggle('hot', !!(hot || hc));
    if (hc) { tag.textContent = `${hc.year} · ${hc.athlete} · ${hc.time}`; tag.style.left = hover.x + 'px'; tag.style.top = hover.y + 'px'; }
    if (hot) { tag.textContent = `${hot.years} · ${hot.name}`; tag.style.left = hover.x + 'px'; tag.style.top = hover.y + 'px'; } }
  let nearest = null, nearestD = Infinity;
  if (started && roomOf(P.x, P.z) === 'hall' && !current) {
    for (const p of PIECES) {
      const d = Math.hypot(P.x - p.pos.x, P.z - p.pos.z);
      if (d < nearestD) { nearestD = d; nearest = p; }
    }
    if (nearestD > 4.2) nearest = null;
  }
  nearbyPiece = nearest;
  const nearBtn = $('nearby');
  if (nearBtn) {
    const showNearby = !!nearest && moving < .82 && !$('card').classList.contains('on') && !tour.on;
    nearBtn.hidden = !showNearby;
    if (showNearby) $('nearbyName').textContent = nearest.name.replace(/^Speed[Mm]ax /, '');
  }
  for (const p of PIECES) {
    const want = p === current ? .85 : p === hot ? .6 : p === nearest ? .24 : 0;
    p.ring.material.opacity += (want - p.ring.material.opacity) * (1 - Math.exp(-dt * 7.5));
    if (p.bike && p.bikeIn < 1) { p.bikeIn = Math.min(1, p.bikeIn + dt * 1.4); const e = 1 - Math.pow(1 - p.bikeIn, 3); p.bike.scale.setScalar(Math.max(.001, e)); }
  }
  for (const p of PIECES) {
    if (!p.explodables || Math.abs(p.ex - p.exT) < .0005) continue;
    p.ex += Math.sign(p.exT - p.ex) * Math.min(Math.abs(p.exT - p.ex), dt * (reduce ? 10 : 1.1));
    for (const x of p.explodables) {
      const u = clamp((p.ex * 1.35 - x.delay * .35), 0, 1), e = u * u * (3 - 2 * u);
      x.node.position.copy(x.base).addScaledVector(x.vec, e * 1.15);
    }
  }
  if (exploded && Math.hypot(P.x - exploded.pos.x, P.z - exploded.pos.z) > 7.5) setExploded(exploded, false);   // walked away
  const lab = exploded?.anchors ? exploded : null;
  $('labels').style.visibility = lab && lab.ex > .05 ? 'visible' : 'hidden';
  if (lab && lab.ex > .05) {
    const v = new THREE.Vector3(), els = $('labels').children;
    lab.anchors.forEach((a, i) => {
      a.node.localToWorld(v.copy(a.local)); v.project(camera);
      const el = els[i]; if (!el) return;
      const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      el.style.opacity = vis ? Math.min(1, (lab.ex - .05) * 2) : 0; el.style.pointerEvents = vis ? '' : 'none';
      const margin = 10, top = 70, bottom = 100;
      let x = (v.x * .5 + .5) * innerWidth, y = (-v.y * .5 + .5) * innerHeight;
      el.style.transform = `translate(${x}px,${y}px)`;
      const maxX = Math.max(margin, innerWidth - el.offsetWidth - margin);
      const maxY = Math.max(top, innerHeight - el.offsetHeight - bottom);
      x = Math.min(Math.max(x, margin), maxX); y = Math.min(Math.max(y, top), maxY);
      el.style.transform = `translate(${x}px,${y}px)`;
    });
  }
  { // draw only what can be seen: rooms hide each other's bikes (walls between them)
    const reg = roomOf(P.x, P.z);
    // hide a bike only where a wall really blocks it. Rooms without a door entry (sanctuary, stair, art portals)
    // look straight into the hall, so they keep the hall bikes; only the closed side rooms and upstairs cull.
    for (const p of PIECES) if (p.bike) p.bike.visible = reg !== 'gallery' && (DOORZ[reg] == null || reg === 'pier' || Math.abs(p.pos.z - DOORZ[reg]) < 7);
    for (const b of wyldBikes) if (b.bike) b.bike.visible = reg === 'wyld' || (reg !== 'gallery' && reg !== 'champ' && P.z < -14);
    const upstairs = reg === 'gallery' || reg === 'stair';
    hween.group.visible = reg === 'hween' || P.z > -32;
    sanctuary.group.visible = true;                                   // the chapel's walls and roof always draw; upstairs only its bikes are culled
    for (const f of sanctuary.films) if (f.bike) f.bike.visible = reg !== 'gallery';
    const themeRoom = galleries.update(t, P, reduce, scene, renderer, reg);
    atlas.update(t, dt, P, upstairs, reduce);
    if (audio) {                                                      // the sea fades upstairs; each room brings its own bed
      roomSound.set(themeRoom?.id || null);
      const sea = audioOn ? (upstairs ? .05 : .2) : 0;
      if (sea !== audio.sea) { audio.sea = sea; audio.gain.gain.setTargetAtTime(sea, audio.ctx.currentTime, .8); }
    }
    if (hween.group.visible) hween.update(t, reduce);
    if (pier) {
      pier.group.visible = reg === 'pier' || (reg === 'hall' && P.z < -22);
      // out on the pier the two walled rooms can't be seen and the hall's shadows don't move: skip both
      const out = reg === 'pier';
      if (out !== pierOut) { pierOut = out; for (const r of sideRooms) r.visible = !out; renderer.shadowMap.autoUpdate = !out; renderer.shadowMap.needsUpdate = true; }
      if (out && P.z < -62) for (const p of PIECES) if (p.bike) p.bike.visible = false;
      if (P.z < -26 && reg !== 'champ' && reg !== 'wyld' && started) { pier.load(); loadPierBike(); }
      pier.update(dt, reduce);
    }
  }
  tourTick(dt);
  if (!reduce) for (const s2 of spinners) s2.o.rotation[s2.axis] += dt * s2.speed;
  if (!reduce) for (const wb of wyldBikes) if (wb.hover) wb.hover.position.y = wb.top + Math.sin(t * .8 + wb.index) * .014;   // Dye breathes on its cushion of air
  if (!reduce) for (const w of sway) { const a = Math.sin(t * .9 + w.phase) * w.amp + Math.sin(t * 2.3 + w.phase * 2) * w.amp * .3; w.o.rotation.z = a; w.o.rotation.x = a * .5; }
  if (!reduce) for (const bd of birds) { const a = t * bd.speed + bd.phase; bd.o.position.set(bd.c.x + Math.cos(a) * bd.r, bd.c.y + Math.sin(a * 1.7) * .8, bd.c.z + Math.sin(a) * bd.r);
    bd.o.rotation.y = -a; const f = Math.sin(t * bd.flap + bd.phase) * .6; bd.l.rotation.z = f; bd.r2.rotation.z = -f; }
  if (window.__ocean) window.__ocean.uniforms.t.value = t;
  if (window.__foam) window.__foam.opacity = .38 + Math.sin(t * .9) * .14;
  if (window.__shaft) window.__shaft.opacity = .045 + Math.sin(t * .35) * .012;   // the shaft breathes with the trade wind
  window.__museumArt?.update?.(dt, t, P, camera, roomOf(P.x, P.z));
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
onFontsReady();
initAppShell();
// progressive loading: the hall first (loadAll), then each room in the background, with a quiet status chip
{
  const steps = [...(WROOMDATA?[['the WYLD Room',loadWyldBikes]]:[]), ['Lava Night', loadHweenBike], ['the Sanctuary', loadSanctuaryBikes], ['the Champions room', loadKonaMachines], ['the upper floor', loadThemeBikes], ['the wings', () => atlas.load(loader)], ['the brand rooms', loadBrand]];
  const chip = $('bgload'), say = t => { if (chip) { chip.hidden = false; chip.querySelector('span').textContent = t; } };
  let chain = loadAll();
  let offline = false;
  const failed = e => { if (!offline && /fetch|network|load/i.test(String(e?.message || e))) { offline = true; say(navigator.onLine === false ? 'You are offline · rooms will open when you reconnect' : 'Cannot reach the museum files · check the server or your connection'); chip?.classList.add('warn'); } };
  addEventListener('online', () => { if (offline) location.reload(); });
  steps.forEach(([label, fn], i) => { chain = chain.then(() => { if (!offline) say(`Opening ${label} · ${i + 1} of ${steps.length}`); return fn(); }).catch(e => { console.warn('rooms', label, e); failed(e); }); });
  chain.then(() => { if (offline) return; say('Every room is open'); setTimeout(() => { if (chip) chip.hidden = true; }, 2400); });
}
window.__gallery = galleries;
// ------------------------------------------------------------------ profile, settings and sharing
const settingsUI = window.__konaSettingsUI;
window.__konaWorldSettings = {
  onQuality:id=>{
    const n = renderSettings(id, { lite: coarse || small, dpr: devicePixelRatio });
    qualityDpr = n.dpr; flowDpr = n.flowDpr; activeDpr = -1;
    if (renderer.shadowMap.enabled !== n.shadows) {
      renderer.shadowMap.enabled = n.shadows;
      scene.traverse(o => { for (const m of [].concat(o.material || [])) m.needsUpdate = true; });
    }
    return n.lite !== lite;
  },
  onSound:on=>{ if (($('soundBtn')?.getAttribute('aria-pressed') === 'true') !== on) $('soundBtn')?.click(); },
  onMotion:()=>true,
};
{ const p = profile.get(), ip = $('introProfile');
  if (ip) { ip.querySelector('i').style.background = p.avatar; ip.querySelector('span').textContent = p.name ? `Welcome back, ${p.name} · settings` : 'Create a profile · choose your quality'; } }
async function shareView(title) {
  const here = window.__map?.here();
  const blob = await captureView(renderer, scene, camera, { title, place: here?.name });
  if (!blob) { toast('Could not capture this view'); return; }
  const url = location.origin + location.pathname + (here ? `?room=${encodeURIComponent(here.id)}` : '');
  const slug = String(title || here?.name || 'museum').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const r = await shareImage(blob, { title: title || 'KONA', text: `${title ? title + ' · ' : ''}KONA, Kailua-Kona`, url, filename: `kona-${slug}.jpg` });
  toast({ shared: 'Shared', link: 'Link shared', saved: 'Image saved to your device', cancelled: 'Not shared' }[r]);
}
$('shareBtn')?.addEventListener('click', () => shareView($('card').classList.contains('on') ? $('cName').textContent : ''));
const worldMore=$('worldMoreMenu'),worldMoreBtn=$('worldMoreBtn');
$('backKonaBtn')?.addEventListener('click',()=>window.__konaShell?.now?.());
worldMoreBtn?.addEventListener('click',()=>{
  const open=worldMore?.hidden!==false;
  if(worldMore)worldMore.hidden=!open;
  worldMoreBtn.setAttribute('aria-expanded',String(open));
});
worldMore?.querySelector('[data-world-share]')?.addEventListener('click',()=>{worldMore.hidden=true;worldMoreBtn?.setAttribute('aria-expanded','false');shareView($('card').classList.contains('on') ? $('cName').textContent : '');});
worldMore?.querySelector('[data-world-tour]')?.addEventListener('click',()=>{worldMore.hidden=true;worldMoreBtn?.setAttribute('aria-expanded','false');tourStart?.();});
worldMore?.querySelector('[data-world-settings]')?.addEventListener('click',()=>{worldMore.hidden=true;worldMoreBtn?.setAttribute('aria-expanded','false');settingsUI?.open?.();});
document.addEventListener('click',e=>{if(!worldMore||worldMore.hidden)return;if(e.target.closest('#worldMoreBtn,#worldMoreMenu'))return;worldMore.hidden=true;worldMoreBtn?.setAttribute('aria-expanded','false');});
$('cardShare')?.addEventListener('click', () => shareView($('cName').textContent));
const konaShell = window.__konaShell;
if (!konaShell) throw new Error('KONA consumer Shell authority missing');
window.__app = { profile, settings: settingsUI, shareView, openArt, openAtlas, konaShell };
window.__atlas = atlas;
window.__museum = { P, PIECES, visit, enter, scene, camera, champs, visitChamp, wyldBikes, visitWyld, renderer, tour, tourStart, pier, visitPier, hween, visitHween, pickables, obstacles, loader, halt: () => { path = null; P.vx = P.vz = 0; } };
initArtWorld(window.__museum).catch(e => console.warn('art world', e));
