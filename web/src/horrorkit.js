// horrorkit.js — shared primitives for dark rooms that are lit from within.
// Used by The Hollow House and Lava Night. Nothing here owns a renderer, camera or loop: the host
// does. A room imports what it needs and keeps its composition to itself.
//   - shieldMaterial: the room's materials ignore the hall's sun, sky light and environment map and are lit
//     only by the room's own point lights + one ambient uniform the room controls (the museum's global
//     lights would otherwise wash a night interior out, and the sun's shadow frustum doesn't reach every room)
//   - GeoBatch: collects static geometry per material and merges it, so a hyper-detailed room is a handful of draws
//   - createLightPool: N real point lights re-aimed at the nearest of many light sources, faded so nothing pops
//   - createAtmosphere: swaps the host's daylight fog for room fog while the visitor is inside, then restores it
//   - shared Halloween props: skeleton, bat, cobweb lattice, ribbed pumpkin, draped dust sheet
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------ lighting shield
export const interior = {
  ambient: { value: new THREE.Color('#0c0b11') },                    // what a shielded surface gets with every flame out
  env: { value: 0 },                                                 // image-based light; the hall's RoomEnvironment is a bright room, so off
};

// Cut a preprocessor block (header line through its matching #endif) out of a shader chunk.
function cutBlocks(src, headers) {
  const out = []; let depth = 0;
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (depth > 0) {
      if (/^#if/.test(t)) depth++; else if (/^#endif/.test(t)) depth--;
      continue;
    }
    if (headers.includes(t)) { depth = 1; continue; }
    out.push(line);
  }
  return out.join('\n');
}
let patched = null;
export function shieldedChunks() {                                   // exported so a test can prove the patch applies to this three
  patched ||= {
    lights: cutBlocks(THREE.ShaderChunk.lights_fragment_begin, [
      '#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )',
      '#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )',
      '#if ( NUM_HEMI_LIGHTS > 0 )',
    ]).replace('getAmbientLightIrradiance( ambientLightColor )', 'uInteriorAmbient'),
    env: THREE.ShaderChunk.envmap_physical_pars_fragment.replaceAll('envMapIntensity', 'uInteriorEnv'),
  };
  return patched;
}
export function shieldMaterial(mat) {
  mat.onBeforeCompile = shader => {
    const c = shieldedChunks();
    shader.uniforms.uInteriorAmbient = interior.ambient;
    shader.uniforms.uInteriorEnv = interior.env;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uInteriorAmbient;\nuniform float uInteriorEnv;')
      .replace('#include <envmap_physical_pars_fragment>', c.env)
      .replace('#include <lights_fragment_begin>', c.lights);
  };
  mat.customProgramCacheKey = () => 'interior-shield-v1';
  return mat;
}

// ------------------------------------------------------------------ geometry batching
export const xf = (x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));

export class GeoBatch {
  constructor() { this.lists = new Map(); this.tris = 0; }
  // tile > 0 maps the texture in world metres (one tile per `tile` m) on the dominant axis of each face,
  // so every surface in the room has the same texel density whatever its size.
  add(key, geo, matrix, tile = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (matrix) g.applyMatrix4(matrix);
    if (tile > 0) {
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
        if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
        else if (ax >= az) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile);
        else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile);
      }
    }
    this.tris += g.attributes.position.count / 3;
    (this.lists.get(key) || this.lists.set(key, []).get(key)).push(g);
    return this;
  }
  box(key, w, h, d, matrix, tile = 1) { return this.add(key, new THREE.BoxGeometry(w, h, d), matrix, tile); }
  build(materials, parent, { frustumCulled = true } = {}) {
    const meshes = {};
    for (const [key, list] of this.lists) {
      if (!materials[key]) throw new Error('GeoBatch: no material for ' + key);
      const m = new THREE.Mesh(mergeGeometries(list), materials[key]);
      m.name = 'hh:' + key; m.frustumCulled = frustumCulled; m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m); meshes[key] = m;
      for (const g of list) g.dispose();
    }
    this.lists.clear();
    return meshes;
  }
}

// ------------------------------------------------------------------ pooled point lights
// Real lights cost every material in view, so a room with fifty flames gets a handful of lights that
// follow whichever sources are closest to the visitor, cross-fading as the nearest set changes.
export function createLightPool({ parent, count, decay = 1.7, distance = 9 }) {
  const lights = Array.from({ length: count }, () => {
    const l = new THREE.PointLight('#ffb26b', 0, distance, decay); l.userData = { src: null, cur: 0 }; parent.add(l); return l;
  });
  const sources = [];
  const flick = (s, t) => {
    switch (s.flicker) {
      case 'candle': return .84 + Math.sin(t * 9.1 + s.ph) * .07 + Math.sin(t * 17.3 + s.ph * 2) * .05 + Math.sin(t * 3.3 + s.ph) * .04;
      case 'bulb': return .9 + Math.sin(t * 31 + s.ph) * (.04 + .06 * Math.max(0, Math.sin(t * .7 + s.ph) ** 6));
      case 'fire': return .8 + Math.sin(t * 5.3 + s.ph) * .1 + Math.sin(t * 11.7 + s.ph) * .06 + Math.sin(t * 2.1) * .04;
      default: return 1;
    }
  };
  return {
    sources,
    add(s) { const o = { x: 0, y: 1.5, z: 0, base: 8, color: '#ffb26b', flicker: 'steady', level: 1, ph: sources.length * 1.9, prio: 1, ...s }; sources.push(o); return o; },
    update(px, pz, dt, master, t, reduce) {
      const want = sources.filter(s => s.base * s.level > .01)
        .map(s => ({ s, d: Math.hypot(s.x - px, s.z - pz) * s.prio })).sort((a, b) => a.d - b.d).slice(0, count).map(o => o.s);
      for (const l of lights) {
        const u = l.userData, wanted = u.src && want.includes(u.src);
        if (!wanted && u.cur < .04) {
          u.src = want.find(s => !lights.some(o => o.userData.src === s)) || null;
          if (u.src) { l.position.set(u.src.x, u.src.y, u.src.z); l.color.set(u.src.color); l.distance = u.src.range || distance; }
        }
        const target = u.src && want.includes(u.src) ? u.src.base * u.src.level * (reduce ? .86 : flick(u.src, t)) : 0;
        u.cur += (target - u.cur) * (1 - Math.exp(-dt * 5));
        l.intensity = u.cur * master;
      }
    },
  };
}

// ------------------------------------------------------------------ fog swap
// The hall's fog is a day-lit haze that starts 70 m out. Inside a night house it is the darkness that gives
// the corridor its depth, so it is swapped while the visitor is in and handed back, intact, when they leave.
export function createAtmosphere(scene) {
  let saved = null, k = 0;
  const tint = new THREE.Color();
  return {
    get k() { return k; },
    update(dt, inside, { color = '#050408', near = 1.5, far = 24 } = {}) {
      const to = inside ? 1 : 0;
      if (k === to) return;
      k += (to - k) * (1 - Math.exp(-dt * (inside ? 7 : 5)));
      if (Math.abs(to - k) < .002) k = to;
      if (!scene.fog) return;
      saved ||= { color: scene.fog.color.clone(), near: scene.fog.near, far: scene.fog.far };
      if (k === 0) { scene.fog.color.copy(saved.color); scene.fog.near = saved.near; scene.fog.far = saved.far; saved = null; return; }
      scene.fog.color.copy(saved.color).lerp(tint.set(color), k);
      scene.fog.near = saved.near + (near - saved.near) * k; scene.fog.far = saved.far + (far - saved.far) * k;
    },
  };
}

// ------------------------------------------------------------------ shared Halloween props (first built for Lava Night)
const plain = g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal'].includes(a)) n.deleteAttribute(a); return n; };

export function pumpkinGeometry(r = .3) {
  const g = new THREE.SphereGeometry(r, 40, 20), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), rib = 1 - .075 * Math.pow(Math.abs(Math.sin(a * 4)), .6); v.x *= rib; v.z *= rib; v.y *= .78; if (v.y > .19) v.y -= (v.y - .19) * .6; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}

// One finisher with an arm raised: merged bones, one mesh, plus two ember eyes.
export function makeSkeleton({ lite = false, bone = '#e9e1cd', eye = '#ff8a2a', glow = '#ff7a1a' } = {}) {
  const bones = [], cap = (r, len, a, b) => { const g = new THREE.CapsuleGeometry(r, len, 4, 8); const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const mid = A.clone().add(B).multiplyScalar(.5), d = B.clone().sub(A); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(mid.x, mid.y, mid.z); bones.push(g); };
  const skull = new THREE.SphereGeometry(.11, 20, 14); skull.scale(1, 1.08, 1.12); skull.translate(0, 1.6, 0); bones.push(skull);
  const jaw = new THREE.BoxGeometry(.13, .05, .1); jaw.translate(0, 1.49, .035); bones.push(jaw);
  cap(.022, .12, [0, 1.46, 0], [0, 1.36, 0]);                                    // neck
  cap(.03, .5, [0, 1.34, 0], [0, .93, 0]);                                       // spine
  for (let i = 0; i < 6; i++) { const y = 1.28 - i * .055, w = .14 - Math.abs(i - 2) * .012; const r = new THREE.TorusGeometry(w, .011, 5, 20, Math.PI * 1.5); r.rotateX(Math.PI / 2); r.rotateY(Math.PI * .25 + Math.PI); r.scale(1, 1, .75); r.translate(0, y, .01); bones.push(r); }
  cap(.018, .3, [-.17, 1.3, 0], [.17, 1.3, 0]);                                  // collarbones
  const pelvis = new THREE.TorusGeometry(.12, .03, 6, 16); pelvis.rotateX(Math.PI / 2 - .3); pelvis.translate(0, .9, 0); bones.push(pelvis);
  cap(.022, .26, [.18, 1.3, 0], [.28, 1.58, .02]); cap(.018, .24, [.28, 1.58, .02], [.34, 1.86, .06]);   // right arm, raised
  cap(.022, .26, [-.18, 1.3, 0], [-.24, 1.02, .04]); cap(.018, .24, [-.24, 1.02, .04], [-.22, .78, .12]); // left arm
  cap(.028, .38, [.08, .88, 0], [.1, .47, .02]); cap(.024, .36, [.1, .47, .02], [.1, .06, -.01]);        // legs
  cap(.028, .38, [-.08, .88, 0], [-.1, .47, .02]); cap(.024, .36, [-.1, .47, .02], [-.1, .06, -.01]);
  for (const x of [.1, -.1]) { const f = new THREE.BoxGeometry(.07, .035, .17); f.translate(x, .02, .05); bones.push(f); }
  for (const [x, y, z] of [[.34, 1.9, .07], [-.22, .74, .13]]) { const h = new THREE.SphereGeometry(.035, 8, 6); h.translate(x, y, z); bones.push(h); }
  const m = new THREE.Mesh(mergeGeometries(bones.map(plain)), new THREE.MeshStandardMaterial({ color: bone, roughness: .7, emissive: glow, emissiveIntensity: .05 }));
  m.castShadow = !lite;
  const g = new THREE.Group(); g.add(m);
  const eyes = new THREE.MeshBasicMaterial({ color: eye, toneMapped: false });
  for (const x of [.04, -.04]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), eyes); e.position.set(x, 1.62, .095); g.add(e); }
  g.userData.skull = m;
  return g;
}

// A bat: two wings and a body, flapped with flapBat(b, t). The wing mesh is shared by every bat.
let wingGeo = null;
export function makeBat(material, { size = 1 } = {}) {
  if (!wingGeo) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(.12, .08, .26, .05); shape.lineTo(.22, -.02); shape.quadraticCurveTo(.18, .02, .15, -.03); shape.quadraticCurveTo(.1, .01, .07, -.04); shape.quadraticCurveTo(.04, -.01, 0, -.03); shape.closePath();
    wingGeo = new THREE.ShapeGeometry(shape); wingGeo.rotateX(-Math.PI / 2);
  }
  const o = new THREE.Group(), l = new THREE.Mesh(wingGeo, material), r = new THREE.Mesh(wingGeo, material); r.scale.x = -1; o.add(l, r);
  const body = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), material); body.scale.set(1, .8, 1.6); o.add(body);
  o.scale.setScalar(size);
  return { o, l, r };
}
export const flapBat = (b, t, rate, phase) => { const fl = Math.sin(t * rate + phase) * .8; b.l.rotation.z = fl; b.r.rotation.z = -fl; };

// Spokes and rings of a corner cobweb as line-segment points; `at` is the apex, sx/sz point along the walls.
export function cobwebPoints(at, sx, sz, { R = 1.3, spokes = 7, rings = 5 } = {}) {
  const pts = [], O = at.clone();
  const end = k => { const a = k / (spokes - 1); return O.clone().add(new THREE.Vector3(sx * R * (1 - a), -R * .8 * Math.sin(a * Math.PI / 2) - .05, sz * R * a)); };
  for (let k = 0; k < spokes; k++) pts.push(O, end(k));
  for (let r = 1; r <= rings; r++) for (let k = 0; k < spokes - 1; k++) { const t = r / (rings + .4); pts.push(O.clone().lerp(end(k), t).add(new THREE.Vector3(0, -.03 * r, 0)), O.clone().lerp(end(k + 1), t).add(new THREE.Vector3(0, -.03 * r, 0))); }
  return pts;
}

const seededUnit = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;     // deterministic default: a sheet hangs the same on every device

// A dust sheet: a height field draped over a set of boxes [x, z, w, d, h] (relative to the sheet's centre),
// falling away in pleats. One cheap mesh turns any furniture composition into a covered ghost.
export function drapeGeometry(boxes, { flare = .45, seg = 36, rand = seededUnit(1), pleat = .045 } = {}) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, z, w, d] of boxes) { x0 = Math.min(x0, x - w / 2); x1 = Math.max(x1, x + w / 2); z0 = Math.min(z0, z - d / 2); z1 = Math.max(z1, z + d / 2); }
  x0 -= flare; x1 += flare; z0 -= flare; z1 += flare;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, seg, seg); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position, ph = rand() * 6.28, ph2 = rand() * 6.28;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); let y = 0;
    for (const [bx, bz, w, d, h] of boxes) {
      const dx = Math.max(Math.abs(x - bx) - w / 2, 0), dz = Math.max(Math.abs(z - bz) - d / 2, 0), dist = Math.hypot(dx, dz);
      const k = Math.max(0, 1 - dist / flare); y = Math.max(y, h * (k * k * (3 - 2 * k)));
    }
    if (y > .002) y += Math.sin(Math.atan2(z - (z0 + z1) / 2, x - (x0 + x1) / 2) * 7 + ph) * pleat * Math.min(1, y * 2) + Math.sin(x * 9 + z * 5 + ph2) * pleat * .5;
    p.setY(i, Math.max(0, y));
  }
  g.computeVertexNormals(); return g;
}
