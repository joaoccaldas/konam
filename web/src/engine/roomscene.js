// engine/roomscene.js — builds a brandRoom descriptor into a real scene group.
// One generic path for every brand: floor, walls, ceiling, accent cove light, plinths,
// product GLBs, a caption and a light pool. No Nike-specific (or Canyon-specific) code.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { marbleTex, travertineTex, basaltTex, lettering, contactShadow, FONT, SERIF } from './textures.js';
import { decorateRoom } from './decoration-props.js';
import { layoutStations } from './brandroom.js';

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
export function buildBrandRoom(desc, { lite = false, spinners = [], obstacles = [], pickables = [] } = {}) {
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
  wall(RW, H, .3, CX, H / 2, b.z0 + .15);            // north
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
  group.add(new THREE.PointLight('#ffffff', lite ? 22 : (desc.light?.fillI ?? 18), 24, 1.2).translateY(0));
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

  const walkable = (x, z) => x > b.x0 + .5 && x < b.x1 - .4 && z < b.z0 - .5 && z > b.z1 + .5;
  return { group, products, bounds: b, walkable, desc };
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
