// engine/roomscene.js — builds a brandRoom descriptor into a real scene group.
// One generic path for every brand: floor, walls, ceiling, accent cove light, plinths,
// product GLBs, a caption and a light pool. No Nike-specific (or Canyon-specific) code.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { marbleTex, travertineTex, basaltTex, lettering, contactShadow, FONT, SERIF } from './textures.js';
import { decorateRoom } from './decoration-props.js';
import { layoutStations } from './brandroom.js';
import { motes, lightShaft } from '../roomkit.js';

const FLOOR_TEX = {
  marble: r => marbleTex('#f7f5f4', '120,118,122', r),
  travertine: r => travertineTex(r),
  basalt: r => basaltTex(r),
};

function lightPool(w, d, color, strength = .5) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(.45, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; return m;
}

// Returns { group, products:[{...p, view, face, holder}], bounds } — plus a .walkable used by the router.
// openings: extra doorways cut into the north wall by a neighbouring room ({ wall:'north', x0, x1, h }).
export function buildBrandRoom(desc, { lite = false, spinners = [], obstacles = [], pickables = [], openings = [] } = {}) {
  layoutStations(desc);
  const b = desc.bounds, th = desc.theme || {};
  const RW = b.x1 - b.x0, RD = b.z0 - b.z1, CX = (b.x0 + b.x1) / 2, CZ = (b.z0 + b.z1) / 2;
  const H = desc.height ?? 4.8;
  const group = new THREE.Group(); group.name = `brand-${desc.id}`;
  const accent = th.accent || '#c9a13b';

  // floor — glossy for brand labs so products read as if lit from within
  const rep = [RW / 4, RD / 4];
  const ftex = (FLOOR_TEX[th.floor] || FLOOR_TEX.marble)(rep);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .16, RD),
    new THREE.MeshPhysicalMaterial({ map: ftex, roughness: th.floor === 'basalt' ? .3 : .12, metalness: 0, clearcoat: th.gloss ?? .6, clearcoatRoughness: .3, envMapIntensity: 1.1 }));
  floor.position.set(CX, -.08, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor);

  // walls + ceiling
  const wallMat = new THREE.MeshStandardMaterial({ color: th.wall || '#f0eee9', roughness: th.wallRough ?? .85, envMapIntensity: .5 });
  const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m; };
  const northCuts = openings.filter(o => o.wall === 'north').sort((a, c) => a.x0 - c.x0);
  { let x = b.x0;                                                     // north, with any neighbour's doorways cut out
    for (const o of northCuts) {
      if (o.x0 - x > .05) wall(o.x0 - x, H, .3, (x + o.x0) / 2, H / 2, b.z0 + .15);
      const oh = o.h ?? 3.2; wall(o.x1 - o.x0, H - oh, .3, (o.x0 + o.x1) / 2, oh + (H - oh) / 2, b.z0 + .15);
      x = o.x1;
    }
    if (b.x1 - x > .05) wall(b.x1 - x, H, .3, (x + b.x1) / 2, H / 2, b.z0 + .15); }
  wall(RW, H, .3, CX, H / 2, b.z1 - .15);            // south
  const ceilM = new THREE.MeshStandardMaterial({ color: th.ceil || th.wall || '#fbf9fa', roughness: .3, envMapIntensity: .7 });
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(RW, .14, RD), ceilM); ceil.position.set(CX, H + .07, CZ); group.add(ceil);
  // east wall is a glass curtain onto the ocean (consistent with the hall's daylight language)
  const mull = new THREE.MeshStandardMaterial({ color: '#efeae6', roughness: .35, metalness: .25 });
  for (let i = 0; i <= 5; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.1, H, .08), mull); m.position.set(b.x1, H / 2, b.z0 - i * RD / 5); group.add(m); }
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(RD, H), new THREE.MeshStandardMaterial({ color: '#eaf2f4', roughness: .05, transparent: true, opacity: .08, envMapIntensity: 1.1, depthWrite: false }));
  pane.rotation.y = -Math.PI / 2; pane.position.set(b.x1, H / 2, CZ); group.add(pane);
  // west wall (the museum party wall) with the door opening
  const doorH = desc.door?.h ?? 3.4;
  if (desc.door?.wall === 'west') {
    const near = Math.max(desc.door.z0, desc.door.z1), far = Math.min(desc.door.z0, desc.door.z1);
    const northSpan = b.z0 - near, southSpan = far - b.z1;
    if (northSpan > .05) wall(.3, H, northSpan, b.x0 - .15, H / 2, (b.z0 + near) / 2);
    if (southSpan > .05) wall(.3, H, southSpan, b.x0 - .15, H / 2, (far + b.z1) / 2);
    const lin = new THREE.Mesh(new THREE.BoxGeometry(.3, Math.max(.2, H - doorH), Math.max(.2, near - far)), wallMat);
    lin.position.set(b.x0 - .15, doorH + (H - doorH) / 2, (near + far) / 2); group.add(lin);
  } else {
    wall(.3, H, RD, b.x0 - .15, H / 2, CZ);                                         // full west wall
  }
  if (desc.light?.skyStrip) {
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(RW - 4, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false }));
    sky.rotation.x = Math.PI / 2; sky.position.set(CX, H - .002, CZ); group.add(sky);
  }
  // accent cove: a thin dyed ribbon of light at the ceiling edge on the two long walls
  const cove = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false, fog: false, transparent: true, opacity: .9 });
  for (const z of [b.z0 - .005, b.z1 + .005]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(RW - .4, .06), cove); s.position.set(CX, H - .3, z); s.rotation.y = z === b.z0 ? Math.PI : 0; group.add(s); }

  // lighting: neutral fill + optional accents (skipped on lite phones)
  const mood = desc.mood || null;
  group.add(new THREE.PointLight('#ffffff', mood?.fill ?? (lite ? 22 : (desc.light?.fillI ?? 18)), 24, 1.2).translateY(0));
  const fill = group.children[group.children.length - 1]; fill.position.set(CX, H - .5, CZ);
  if (!lite) for (const a of desc.light?.accents || []) { const pl = new THREE.PointLight(a.color || accent, a.i ?? 6, a.dist ?? 12, 1.4); pl.position.set(a.x, a.y, a.z); group.add(pl); }

  // brand wordmark + kicker over the door
  if (desc.name) {
    const mark = lettering(Math.min(5, desc.name.length * .9), 1.0, g => {
      g.fillStyle = accent; g.font = `800 1.0px ${FONT}`; g.letterSpacing = '.08px'; g.fillText(desc.name.toUpperCase(), .06, .95);
      if (desc.kicker) { g.fillStyle = '#12181d'; g.font = `italic 400 .34px ${SERIF}`; g.fillText(desc.kicker, .08, 1.5); }
    }, 1024);
    const doorZ = desc.door ? (desc.door.z0 + desc.door.z1) / 2 : CZ;
    mark.position.set(desc.door?.wall === 'west' ? b.x1 - .02 : b.x1 - .02, 3.9, doorZ); mark.rotation.y = -Math.PI / 2; group.add(mark);
  }

  decorateRoom(desc.decorations,{group,lite,obstacles});

  // products on plinths with light pools + contact shadows
  const chrome = new THREE.MeshStandardMaterial({ color: '#e8eaee', metalness: 1, roughness: .12 });
  const products = (desc.products || []).map((p, i) => {
    const st = p.station;
    const holder = new THREE.Group(); holder.position.set(st.x, 0, st.z); group.add(holder);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(.5, .56, .14, 48), wallMat);
    plinth.position.y = .07; plinth.receiveShadow = plinth.castShadow = true; holder.add(plinth);
    holder.add(lightPool(1.8, 1.8, '#ffffff', lite ? .1 : .16).translateY(.01));
    const cs = contactShadow(1.1, .6); cs.position.y = .012; holder.add(cs);
    const rec = { ...p, index: i, kind: 'brandRoom', room: desc.id, holder, station: st, pos: new THREE.Vector3(st.x, 0, st.z), rotY: st.rotY ?? 0 };
    holder.traverse(o => { if (o.isMesh) { o.userData.brandProduct = rec; pickables.push(o); } });
    if (st.kind === 'plinth' || !st.kind) obstacles.push({ c: rec.pos, r: .9 });
    products_assignView(rec, b);
    return rec;
  });

  if (mood?.env != null) { floor.material.envMapIntensity = mood.env; wallMat.envMapIntensity = mood.env * .5; if (mood.floor) floor.material.color.set(mood.floor); }
  const living = mood ? cinematic(desc, mood, { group, lite, b, H, accent, obstacles, pickables }) : null;

  const inRoom = (x, z) => x > b.x0 + .5 && x < b.x1 - .4 && z < b.z0 - .5 && z > b.z1 + .5;
  const inCut = (x, z) => northCuts.some(o => x > o.x0 + .3 && x < o.x1 - .3 && z < b.z0 + .95 && z >= b.z0 - .6);
  const walkable = (x, z) => inRoom(x, z) || inCut(x, z);
  return { group, products, bounds: b, walkable, desc, mood, update: living?.update || null };
}

function products_assignView(rec, b) {
  const normal = new THREE.Vector3(Math.sin(rec.rotY), 0, Math.cos(rec.rotY));
  rec.normal = normal;
  rec.view = rec.pos.clone().addScaledVector(normal, 2.4);
  rec.view.x = Math.min(b.x1 - .9, Math.max(b.x0 + .9, rec.view.x));
  rec.view.z = Math.min(b.z0 - .9, Math.max(b.z1 + .9, rec.view.z));
  rec.face = rec.pos.clone().setY(1.2);
}

// Load + seat the products. Shares one loader; caller passes the GLB loader so meshopt is set once.
export async function loadBrandRoom(built, loader) {
  if (!built.products.length) return;
  for (const p of built.products) {
    try {
      const gltf = await loader.loadAsync(p.glb);
      const root = gltf.scene;
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (!o.userData.brandProduct) { o.userData.brandProduct = p; } } });
      // normalise: shoes & small gear scale to a readable museum display height
      const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
      const target = p.type === 'shoe' ? .55 : 1.6;               // shoe pedestal ~0.55 m; bikes handled by their own modules
      const s = target / Math.max(size.x, size.y, size.z, .001);
      root.scale.setScalar(s);
      const b2 = new THREE.Box3().setFromObject(root), c = b2.getCenter(new THREE.Vector3());
      root.position.set(-c.x, .15 - b2.min.y, -c.z);
      const holder = new THREE.Group(); holder.add(root); holder.rotation.y = p.rotY; holder.position.set(p.pos.x, 0, p.pos.z);
      holder.traverse(o => { if (o.isMesh && !o.userData.brandProduct) { o.userData.brandProduct = p; } });
      built.group.add(holder); p.model = holder;
      spinnersPush(p, holder);
    } catch (e) { console.warn('brandRoom: failed to load', p.glb, e); }
  }
  function spinnersPush(p, holder) { /* slow turntable handled by the host loop via spinners */ if (p.spin !== false) built.spinners?.push({ o: holder, axis: 'y', speed: .18 }); }
}

export function makeBrandLoader() { return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); }

// ---------------------------------------------------------------- cinematic mood (data: desc.mood)
// A darker room lit with intent: stage spots with visible shafts, haze in the light, and optional
// architecture that tells the brand's story without its marks — a race-clock dial and portals.
function cinematic(desc, mood, { group, lite, b, H, accent, obstacles, pickables }) {
  const motesList = [], hands = [];
  for (const s of mood.spots || []) {
    const y = s.y ?? H - .25;
    const sp = new THREE.SpotLight(s.color || '#ffffff', (s.i ?? 60) * (lite ? .8 : 1), s.dist ?? 9, s.angle ?? .35, .6, 1.3);
    sp.position.set(s.x, y, s.z); sp.target.position.set(s.x, s.ty ?? .8, s.z);
    sp.castShadow = !lite && !!s.shadow; if (sp.castShadow) { sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -.0004; }
    group.add(sp, sp.target);
    if (s.shaft !== false) { const sh = lightShaft({ top: .12, bottom: Math.tan(s.angle ?? .35) * (y - .1) * 1.05, height: y - .05, color: s.color || '#ffffff', opacity: (s.shaftOpacity ?? .14) * (lite ? .7 : 1) }); sh.position.set(s.x, y, s.z); group.add(sh); }
  }
  if (mood.haze) {
    const h = mood.haze, m = motes({ n: lite ? Math.round((h.n || 120) * .4) : (h.n || 120), box: [b.x0 + .6, b.x1 - .6, .3, H - .4, b.z1 + .6, b.z0 - .6], color: h.color || '#ffffff', size: h.size || .02, rise: .015, sway: .3, opacity: h.opacity ?? .5, seed: 83 });
    group.add(m.points); motesList.push(m);
  }
  const mono = mood.monument;
  if (mono?.kind === 'race-clock') {
    const R = mono.r ?? 1.9, cx = mono.x ?? (b.x0 + b.x1) / 2, cy = mono.y ?? 2.7, z = b.z1 + .06;
    const dial = new THREE.Group(); dial.position.set(cx, cy, z); group.add(dial);
    const face = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshPhysicalMaterial({ color: '#0b0d11', roughness: .35, metalness: .4, clearcoat: 1, clearcoatRoughness: .15, envMapIntensity: .6 }));
    dial.add(face);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(R + .06, .07, 16, 120), new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 1, roughness: .18 }));
    dial.add(bezel);
    const hours = mono.hours ?? 17;
    const ink = lettering(R * 2, R * 2, g => {
      g.translate(R, R);
      for (let i = 0; i < hours * 4; i++) { const a = i / (hours * 4) * Math.PI * 2 - Math.PI / 2, major = i % 4 === 0, r0 = R * (major ? .82 : .88);
        g.strokeStyle = major ? '#eef0f3' : 'rgba(238,240,243,.45)'; g.lineWidth = major ? .035 : .012;
        g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * R * .95, Math.sin(a) * R * .95); g.stroke();
        if (major) { g.fillStyle = '#eef0f3'; g.font = `600 ${R * .1}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i / 4 || hours), Math.cos(a) * R * .7, Math.sin(a) * R * .7); } }
      g.fillStyle = accent; g.font = `800 ${R * .075}px ${FONT}`; g.textAlign = 'center'; g.fillText(mono.title || 'RACE CLOCK', 0, -R * .32);
      g.fillStyle = 'rgba(238,240,243,.7)'; g.font = `italic 400 ${R * .085}px ${SERIF}`; g.fillText(mono.subtitle || '', 0, R * .36);
    }, 1024);
    ink.position.z = .01; dial.add(ink);
    const hand = (len, wid, color, zz) => { const pivot = new THREE.Group(); pivot.position.z = zz; const m = new THREE.Mesh(new THREE.BoxGeometry(wid, len, .02), new THREE.MeshBasicMaterial({ color, toneMapped: false })); m.position.y = len / 2 - len * .12; pivot.add(m); dial.add(pivot); return pivot; };
    hands.push({ o: hand(R * .55, .07, '#eef0f3', .03), period: hours * 3600 }, { o: hand(R * .85, .04, '#eef0f3', .045), period: 3600 }, { o: hand(R * .92, .018, accent, .06), period: 60, tick: true });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .05, 24), new THREE.MeshStandardMaterial({ color: accent, metalness: .6, roughness: .3 })); cap.rotation.x = Math.PI / 2; cap.position.z = .08; dial.add(cap);
    const glow = new THREE.PointLight(mono.glow || '#9fb8ff', lite ? 2 : 4, 6, 1.6); glow.position.set(cx, cy, z + 1.2); group.add(glow);
    if (mono.info) { face.userData.info = mono.info; pickables.push(face); }
  }
  for (const p of mood.portals || []) {
    const fr = new THREE.Group(); fr.position.set(p.x, 0, p.z); fr.rotation.y = p.rotY ?? 0; group.add(fr);
    const mat = new THREE.MeshBasicMaterial({ color: p.color || accent, toneMapped: false });
    const w = p.w ?? 1.6, h = p.h ?? 2.8, t = .06;
    for (const [sw, sh, x, y] of [[t, h, -w / 2, h / 2], [t, h, w / 2, h / 2], [w + t, t, 0, h]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, t), mat); m.position.set(x, y, 0); fr.add(m); }
    const lab = lettering(w, .5, g => { g.fillStyle = '#eef0f3'; g.font = `800 .16px ${FONT}`; g.letterSpacing = '.08px'; g.fillText(p.label || '', .02, .2); g.fillStyle = 'rgba(238,240,243,.7)'; g.font = `500 .1px ${FONT}`; g.fillText(p.sub || '', .02, .4); }, 512);
    lab.position.set(0, h + .32, 0); fr.add(lab);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.2), new THREE.MeshBasicMaterial({ color: p.color || accent, transparent: true, opacity: lite ? .05 : .09, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, .015, .6); fr.add(pool);
    if (p.info) for (const m of fr.children) if (m.isMesh) { m.userData.info = p.info; pickables.push(m); }
  }
  return {
    update(t, reduce) {
      if (!reduce) for (const m of motesList) m.step(t);
      const now = Date.now() / 1000;
      for (const h of hands) { const v = h.tick ? Math.floor(now % h.period) / h.period : (now % h.period) / h.period; h.o.rotation.z = -v * Math.PI * 2; }
    },
  };
}
