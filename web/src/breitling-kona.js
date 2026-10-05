// breitling-kona.js — BREITLING × KONA · The Finish-Line Atelier (review room, ?reviewRoom=breitling-kona).
//
// A dark lava hall measured by one clock. In the middle a 2.2 m Endurance Pro geometry study floats over a molten
// dais and slowly comes apart and back together (case, bezel, crystal, dial, hands, quartz module, strap) through the
// shared machine-inspection kernel. A 17-hour race-clock ring is set into the floor around it. Along the walls,
// six real IRONMAN® editions from breitling.com stand in vitrines, each lit in its own strap colour. At the far end,
// a letterbox of the Kona sunset.
//
// Truth / rights: editions, references, edition sizes and prices come only from pitch/breitling-kona/collection-v1.json
// (breitling.com pages). The watch is KONA.m's geometry study from the public specification (blender/watch_build.py),
// not a replica: no logo, no IRONMAN mark, no product photography. The brand name appears in plain type for a
// reported client request; marks stay off until collection.commission.marks_allowed is true with an approval ref.
//
// Efficiency: six vitrine watches = one InstancedMesh per material (dial and strap colours per instance); the
// monument is one hero GLB; fissures, haze and the clock ring animate on the GPU; one shadow-casting key.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { indexMachine, applyExplosion } from './engine/machine-inspection.js';
import { bake, instance } from './engine/decor.js';
import { localEnvCapture } from './engine/env-capture.js';
import { lightShaft } from './roomkit.js';
import collection from '../../pitch/breitling-kona/collection-v1.json' with { type: 'json' };
import { BROOM, BDOOR } from './beast-cave.js';

export const BREITLING_MOOD = Object.freeze({ exposure: .95, hemi: .05, sun: .02, fog: { near: 9, far: 44 }, fogColor: new THREE.Color('#07080b') });
export const BREITLING_ASSETS = Object.freeze({
  watch: 'assets/watches/endurance-pro-study/watch.glb',
  watchLite: 'assets/watches/endurance-pro-study/watch-lite.glb',
  plate: 'assets/rooms/nor3-winter/kona-winter-plate-2048.webp',   // reused: its right half is the Kona sunset
});
const rng = (seed = 0xB4E17) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
let rectLib = false;

// Watch faces are printed, not modelled: one print texture over a per-edition dial colour (instanceColor).
function dialPrint(FONT) {
  return canvas(1024, 1024, (g, W) => {
    const c = W / 2, R = W / 2, P = (x, y) => [c + x / 17.6 * R, c - y / 17.6 * R];        // mm on the dial → canvas
    g.clearRect(0, 0, W, W); g.strokeStyle = '#f2f4f6'; g.fillStyle = '#f2f4f6'; g.lineCap = 'butt';
    for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2, r0 = k % 5 ? .935 : .9, [x0, y0] = [c + Math.sin(a) * R * r0, c - Math.cos(a) * R * r0], [x1, y1] = [c + Math.sin(a) * R * .975, c - Math.cos(a) * R * .975]; g.lineWidth = k % 5 ? 3 : 7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    for (let h = 0; h < 12; h++) { if (h === 3 || h === 6 || h === 9) continue; const a = h / 12 * Math.PI * 2; g.save(); g.translate(c + Math.sin(a) * R * .76, c - Math.cos(a) * R * .76); g.rotate(a);
      g.fillStyle = '#e9ecef'; const w = h === 0 ? 34 : 22; g.fillRect(-w / 2, -42, w, 84); g.fillStyle = '#d9f2c8'; g.fillRect(-w / 2 + 5, -36, w - 10, 72); if (h === 0) { g.fillStyle = '#1a1c20'; g.fillRect(-2, -42, 4, 84); } g.restore(); }
    for (const [x, y] of [[0, -8.2], [-8.2, 0], [8.2, 0]]) {               // three counters: tracks and numerals
      const [cx, cy] = P(x, y), r = 4.6 / 17.6 * R; g.strokeStyle = 'rgba(242,244,246,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r * .98, 0, 7); g.stroke();
      for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2; g.lineWidth = k % 5 ? 2 : 4; g.beginPath(); g.moveTo(cx + Math.sin(a) * r * (k % 5 ? .84 : .76), cy - Math.cos(a) * r * (k % 5 ? .84 : .76)); g.lineTo(cx + Math.sin(a) * r * .95, cy - Math.cos(a) * r * .95); g.stroke(); }
    }
    g.fillStyle = 'rgba(242,244,246,.85)'; g.font = `600 22px ${FONT}`; g.textAlign = 'center'; g.fillText('SUPERQUARTZ-STUDY · KONA.m', c, c + R * .36); g.font = `500 16px ${FONT}`; g.fillText('44 MM · 100 M', c, c + R * .42);
  });
}
// The bezel and rehaut share one print: compass letters on the bezel band, graduations at the rim (a pulsometer track on the rehaut).
function bezelPrint(FONT) {
  return canvas(1024, 1024, (g, W) => {
    const c = W / 2, R = W / 2; g.fillStyle = '#121315'; g.fillRect(0, 0, W, W);
    g.strokeStyle = '#eef0f2'; for (let k = 0; k < 120; k++) { const a = k / 120 * Math.PI * 2, long = k % 10 === 0; g.lineWidth = long ? 5 : 2.5; g.beginPath(); g.moveTo(c + Math.sin(a) * R * (long ? .925 : .95), c - Math.cos(a) * R * (long ? .925 : .95)); g.lineTo(c + Math.sin(a) * R * .995, c - Math.cos(a) * R * .995); g.stroke(); }
    g.fillStyle = '#eef0f2'; g.font = `800 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, d]) => { const a = d * Math.PI / 180; g.save(); g.translate(c + Math.sin(a) * R * .875, c - Math.cos(a) * R * .875); g.rotate(a); g.fillText(t, 0, 0); g.restore(); });
    g.font = `700 26px ${FONT}`; for (let d = 30; d < 360; d += 30) { if (d % 90 === 0) continue; const a = d * Math.PI / 180; g.save(); g.translate(c + Math.sin(a) * R * .875, c - Math.cos(a) * R * .875); g.rotate(a); g.fillText(String(d), 0, 0); g.restore(); }
    g.fillStyle = '#ff6b35'; g.beginPath(); const a0 = 0; g.moveTo(c, c - R * .995); g.lineTo(c - 16, c - R * .93); g.lineTo(c + 16, c - R * .93); g.fill();
  });
}
// Print over a base colour: instanceColor (vitrines) or the material colour (monument).
function printed(mat) {
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '').replace('#include <color_fragment>', `
      #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
        diffuseColor.rgb *= vColor.rgb;
      #endif
      #ifdef USE_MAP
        vec4 pr = texture2D( map, vMapUv ); diffuseColor.rgb = mix( diffuseColor.rgb, pr.rgb, pr.a );
      #endif`);
  };
  mat.customProgramCacheKey = () => 'bk-printed';
  return mat;
}

export function buildBreitlingKona(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);   // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2;
  const MON = new THREE.Vector3(20.2, 2.55, CZ);                           // the monument's centre
  const rand = rng();
  const infos = [], info = (mesh, rec) => { for (const m of [].concat(mesh)) { m.userData.info = rec; pickables.push(m); } infos.push(rec); return rec; };
  const envMats = [], E = m => { envMats.push(m); return m; };
  const EDS = collection.editions;

  // ------------------------------------------------------------ merged statics
  const buckets = new Map(), M4 = new THREE.Matrix4(), Qt = new THREE.Quaternion(), EU = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const put = (mat, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    let gg = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(k)) gg.deleteAttribute(k);
    if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2));
    gg.applyMatrix4(M4.compose(V.set(x, y, z), Qt.setFromEuler(EU.set(rx, ry, rz)), S.set(sx, sy, sz)));
    (buckets.get(mat) || buckets.set(mat, []).get(mat)).push(gg);
  };
  const box = (mat, w, h, d, x, y, z, ry = 0) => put(mat, new THREE.BoxGeometry(w, h, d), x, y, z, 0, ry);
  const flush = (cast = false) => { for (const [mat, list] of buckets) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast && !lite; m.receiveShadow = true; group.add(m); } buckets.clear(); };

  // ------------------------------------------------------------ materials
  const wallC = canvas(512, 512, (g, w, h) => { g.fillStyle = '#121316'; g.fillRect(0, 0, w, h); const r = rng(3);
    for (let i = 0; i < 3000; i++) { const v = 14 + r() * 14; g.fillStyle = `rgba(${v},${v + 1},${v + 4},${.3 + r() * .4})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); });
  const wallT = tex(wallC); wallT.wrapS = wallT.wrapT = THREE.RepeatWrapping; wallT.repeat.set(RW / 2.4, R.h / 2.4);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallT, color: '#9aa0a8', roughness: .78, metalness: .15, envMapIntensity: .3 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#08090b', roughness: .95 });
  const ti = E(new THREE.MeshStandardMaterial({ color: '#8d9298', roughness: .32, metalness: 1 }));
  const black = E(new THREE.MeshStandardMaterial({ color: '#111216', roughness: .42, metalness: .6 }));
  const ledRed = new THREE.MeshBasicMaterial({ color: '#ff2a3a', toneMapped: false });
  const ledWhite = new THREE.MeshBasicMaterial({ color: '#f4f6fa', toneMapped: false });
  const glass = E(new THREE.MeshPhysicalMaterial({ color: '#dfe9f2', roughness: .03, metalness: 0, transparent: true, opacity: .12, envMapIntensity: 1.5, depthWrite: false }));
  const basaltC = canvas(256, 256, (g, w, h) => { g.fillStyle = '#777'; g.fillRect(0, 0, w, h); const r = rng(11); for (let i = 0; i < 1800; i++) { const v = r() * 255; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.beginPath(); g.arc(r() * w, r() * h, .6 + r() * 2.4, 0, 7); g.fill(); } });
  const bump = tex(basaltC, false); bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  const lava = new THREE.MeshStandardMaterial({ color: '#141317', roughness: .92, bumpMap: bump, bumpScale: 2.5 });

  // ------------------------------------------------------------ floor: black lava, polished, with molten fissures that breathe
  const fissure = { t: { value: 0 } };
  const floorMat = E(new THREE.MeshPhysicalMaterial({ color: '#08080a', roughness: .5, metalness: .1, clearcoat: .45, clearcoatRoughness: .25, envMapIntensity: .35 }));
  floorMat.onBeforeCompile = sh => {
    sh.uniforms.uT = fissure.t;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vW; uniform float uT;
      float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+1.),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec2 p=vW.xz*.42; float v=abs(fbm(p)-.5); float vein=smoothstep(.009,.0,v)+smoothstep(.03,.0,v)*.18;
        float near=1.-smoothstep(1.5,9.,length(vW.xz-vec2(${MON.x.toFixed(2)},${MON.z.toFixed(2)})));
        float pulse=.75+.25*sin(uT*.7+fbm(p*3.)*6.);
        totalEmissiveRadiance+=vec3(1.,.24,.04)*vein*(.08+near*1.9)*pulse; }`);
  };
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .16, RD), floorMat); floor.position.set(CX, -.074, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);

  // ------------------------------------------------------------ shell
  const wall = (w, h, d, x, y, z, m = wallMat) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.receiveShadow = true; group.add(o); return o; };
  wall(RW, R.h, .3, CX, R.h / 2, R.z0 + .15); wall(RW, R.h, .3, CX, R.h / 2, R.z1 - .15);
  // east wall with a letterbox: Kona at sunset through a slot 1.1–3.5 m high
  const SLOT = { y0: 1.1, y1: 3.5 };
  wall(.3, SLOT.y0, RD, R.x1 - .2, SLOT.y0 / 2, CZ); wall(.3, R.h - SLOT.y1, RD, R.x1 - .2, (R.h + SLOT.y1) / 2, CZ);
  box(ceilMat, RW, .2, RD, CX, R.h + .1, CZ);
  for (const z of [R.z0 - .6, R.z1 + .6]) box(ledRed, RW - 1.2, .015, .025, CX, R.h - .02, z);     // two red hairlines run the length of the ceiling
  box(ledWhite, .03, SLOT.y1 - SLOT.y0, .03, R.x1 - .36, (SLOT.y0 + SLOT.y1) / 2, R.z0 - .3); box(ledWhite, .03, SLOT.y1 - SLOT.y0, .03, R.x1 - .36, (SLOT.y0 + SLOT.y1) / 2, R.z1 + .3);
  const plateMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(RD - .2, 4.6), plateMat); plate.rotation.y = -Math.PI / 2; plate.position.set(R.x1 - .06, 2.2, CZ); group.add(plate);
  box(glass, .02, SLOT.y1 - SLOT.y0, RD - .6, R.x1 - .32, (SLOT.y0 + SLOT.y1) / 2, CZ);
  obstacles.push({ box: [R.x1 - 1.0, R.x1 + .5, R.z1 - .5, R.z0 + .5] });

  // ------------------------------------------------------------ typography (plain type; no marks)
  const headline = lettering(9, 1.1, g => { g.textAlign = 'center'; g.fillStyle = '#eef0f3'; g.font = `300 .52px ${FONT}`; g.letterSpacing = '.09px'; g.fillText('BREITLING × KONA', 4.5, .55);
    g.fillStyle = 'rgba(238,240,243,.6)'; g.font = `500 .16px ${FONT}`; g.letterSpacing = '.08px'; g.fillText('THE FINISH-LINE ATELIER · EVERY SECOND OF KONA, MEASURED', 4.5, .92); }, 2048);
  headline.rotation.y = -Math.PI / 2; headline.position.set(R.x1 - .38, 4.35, CZ); group.add(headline);
  const lineN = lettering(14, .9, g => { g.fillStyle = 'rgba(232,235,240,.82)'; g.font = `200 .5px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('17 HOURS · 3.8 · 180 · 42.2 · ONE CLOCK', .1, .6); }, 2048);
  lineN.rotation.y = Math.PI; lineN.position.set(22, 4.1, R.z0 - .02); group.add(lineN);
  const lineS = lettering(14, .9, g => { g.fillStyle = 'rgba(232,235,240,.82)'; g.font = `200 .5px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('EVERY TENTH OF A SECOND, ON THE ISLAND', .1, .6); }, 2048);
  lineS.position.set(22, 4.1, R.z1 + .02); group.add(lineS);

  // ------------------------------------------------------------ the race-clock ring: 17 hours set into the floor around the monument
  const ringR = 3.6, CUT = [[2 + 20 / 60, '#3fa9f5', 'SWIM CUT-OFF 2:20'], [10.5, '#ff2a3a', 'BIKE CUT-OFF 10:30'], [17, '#f4f6fa', 'FINISH 17:00']];
  const clockMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: fissure.t },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float t;varying vec2 vU;
      void main(){ float a=vU.x; float h=a*17.; float tick=step(fract(h),.02)+step(fract(h*4.),.03)*.35;
        vec3 seg = h<2.333?vec3(.25,.66,.96): h<10.5?vec3(1.,.17,.23):vec3(.95,.96,.98);
        float sweep=smoothstep(.0,.04,fract(t/60.)-a+.04)*smoothstep(.06,.0,fract(t/60.)-a);  // a one-minute lap of light
        float band=smoothstep(.0,.25,vU.y)*smoothstep(1.,.75,vU.y);
        gl_FragColor=vec4(seg*(band*.28+tick*.9+sweep*1.4), 1.); }` });
  const clockRing = new THREE.Mesh(new THREE.RingGeometry(ringR, ringR + .14, lite ? 128 : 256, 1, Math.PI / 2, -Math.PI * 2), clockMat);
  { const p = clockRing.geometry.attributes.position, uv = clockRing.geometry.attributes.uv; for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k); let a = Math.atan2(x, y) / (Math.PI * 2); if (a < 0) a += 1; uv.setXY(k, a, (Math.hypot(x, y) - ringR) / .14); } }
  clockRing.rotation.x = -Math.PI / 2; clockRing.position.set(MON.x, .006, MON.z); group.add(clockRing);
  const clockLabels = lettering(2 * (ringR + .9), 2 * (ringR + .9), g => {
    const C = ringR + .9; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(238,240,243,.75)'; g.font = `500 .17px ${FONT}`;
    for (let h = 1; h <= 17; h++) { const a = h / 17 * Math.PI * 2; g.fillText(String(h), C + Math.sin(a) * (ringR + .32), C - Math.cos(a) * (ringR + .32)); }
    g.font = `600 .12px ${FONT}`; g.letterSpacing = '.02px'; for (const [h, col, t] of CUT) { const a = h / 17 * Math.PI * 2; g.fillStyle = col; g.save(); g.translate(C + Math.sin(a) * (ringR + .66), C - Math.cos(a) * (ringR + .66)); g.rotate(a); g.fillText(t, 0, 0); g.restore(); }
  }, 2048);
  clockLabels.rotation.x = -Math.PI / 2; clockLabels.position.set(MON.x, .008, MON.z); group.add(clockLabels);

  // ------------------------------------------------------------ the dais: a lava drum split by glowing seams
  const daisMat = lava.clone(); daisMat.emissive = new THREE.Color('#ff4a12'); daisMat.emissiveIntensity = 0;
  put(lava, new THREE.CylinderGeometry(2.2, 2.45, .42, 64), MON.x, .21, MON.z);
  put(black, new THREE.CylinderGeometry(2.25, 2.25, .03, 64), MON.x, .435, MON.z);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, s = .16 + rand() * .14, gr = new THREE.IcosahedronGeometry(s, lite ? 1 : 2); const p = gr.attributes.position;
    for (let k = 0; k < p.count; k++) { V.set(p.getX(k), p.getY(k), p.getZ(k)).normalize(); const d = 1 + Math.sin(V.x * 7 + i) * Math.sin(V.y * 6) * .18; p.setXYZ(k, V.x * s * d * 1.2, V.y * s * d * .6, V.z * s * d); } gr.computeVertexNormals();
    put(lava, gr, MON.x + Math.cos(a) * (2.45 + rand() * .25), s * .3, MON.z + Math.sin(a) * (2.45 + rand() * .25), 0, rand() * 6); }
  const seam = new THREE.Mesh(new THREE.TorusGeometry(2.3, .022, 8, 128), new THREE.MeshBasicMaterial({ color: '#ff5a1e', toneMapped: false })); seam.rotation.x = Math.PI / 2; seam.position.set(MON.x, .2, MON.z); group.add(seam);
  obstacles.push({ c: [MON.x, MON.z], r: 2.8 });

  // ------------------------------------------------------------ vitrines: six editions along the walls, each lit in its strap colour
  const VIT = EDS.map((e, i) => { const left = i < 3, k = i % 3; return { e, x: 23.4 + k * 3.7, z: left ? R.z1 + 1.3 : R.z0 - 1.3, face: left ? 0 : Math.PI }; });
  const poolTex = tex(canvas(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), false);
  VIT.forEach(({ e, x, z, face }, i) => {
    put(lava, new THREE.BoxGeometry(.8, 1.0, .8), x, .5, z); put(black, new THREE.BoxGeometry(.86, .04, .86), x, 1.02, z);
    put(glass, new THREE.BoxGeometry(.7, .62, .7), x, 1.35, z);
    const col = new THREE.Color(e.strap);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(.84, .012, .012), new THREE.MeshBasicMaterial({ color: col, toneMapped: false })); edge.position.set(x, 1.045, z + (face ? -.43 : .43)); group.add(edge);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: poolTex, color: col, transparent: true, opacity: lite ? .35 : .45, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(x, .009, z); group.add(pool);
    const labC = canvas(780, 500, (g, w, h) => { g.fillStyle = '#0c0d10'; g.fillRect(0, 0, w, h); g.fillStyle = e.strap; g.fillRect(50, 56, 100, 8);   // real pixels: small canvas type stays crisp
      g.fillStyle = '#eef0f3'; g.font = `700 96px ${FONT}`; g.fillText(String(e.year), 48, 168);
      g.font = `600 34px ${FONT}`; g.fillStyle = 'rgba(238,240,243,.92)'; g.fillText(e.event.toUpperCase(), 50, 236);
      g.font = `500 30px ${FONT}`; g.fillStyle = 'rgba(238,240,243,.72)'; g.fillText(`${e.case.toUpperCase()} · 44 MM`, 50, 300); g.fillText(`REF. ${e.ref}`, 50, 352); g.fillText(`${e.limited} PIECES · ${e.price}`, 50, 404); });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(.78, .5), new THREE.MeshBasicMaterial({ map: tex(labC), toneMapped: false }));
    lab.rotation.y = face; lab.position.set(x, .62, z + (face ? -.405 : .405)); group.add(lab);
    obstacles.push({ c: [x, z], r: .65 });
  });

  // ------------------------------------------------------------ light
  if (!rectLib) { RectAreaLightUniformsLib.init(); rectLib = true; }
  const sunset = new THREE.RectAreaLight('#ff9a5c', lite ? 2.4 : 3.2, RD - 1, SLOT.y1 - SLOT.y0); sunset.position.set(R.x1 - .45, (SLOT.y0 + SLOT.y1) / 2, CZ); sunset.lookAt(R.x1 - 6, 1.4, CZ); group.add(sunset);
  const key = new THREE.SpotLight('#f3f5ff', lite ? 70 : 95, 9, .5, .45, 1.2); key.position.set(MON.x - .8, R.h - .15, MON.z + .6); key.target.position.copy(MON);
  key.castShadow = !lite; if (key.castShadow) { key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .02; key.shadow.camera.near = 1; key.shadow.camera.far = 8; } group.add(key, key.target);
  const rim = new THREE.SpotLight('#7fd3ff', lite ? 30 : 45, 10, .45, .6, 1.3); rim.position.set(MON.x + 3.5, 4.6, MON.z - 2.5); rim.target.position.copy(MON); group.add(rim, rim.target);
  const molten = new THREE.PointLight('#ff5a1e', lite ? 5 : 8, 7, 1.6); molten.position.set(MON.x, .6, MON.z); group.add(molten);
  VIT.forEach(({ e, x, z }) => { const s = new THREE.SpotLight('#ffffff', lite ? 8 : 12, 4.2, .32, .5, 1.4); s.position.set(x, R.h - .2, z); s.target.position.set(x, 1.2, z); group.add(s, s.target); });
  if (!lite) { const shaft = lightShaft({ top: .14, bottom: 1.6, height: R.h - .3, color: '#dfe8ff', opacity: .1 }); shaft.position.set(MON.x - .8, R.h - .15, MON.z + .6); shaft.lookAt(MON.x, 0, MON.z); shaft.rotateX(Math.PI / 2); group.add(shaft); }

  flush(true);

  // ------------------------------------------------------------ hall-side sign
  const sign = lettering(4.6, .9, g => { g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('BREITLING × KONA', 0, .28);
    g.fillStyle = '#c8102e'; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Every second of Kona.', 0, .69); }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ materials for the watch parts
  const dialTex = tex(dialPrint(FONT)), bezelTex = tex(bezelPrint(FONT));
  const watchMat = (src, name, monument) => {
    let m;
    if (name === 'dial') m = printed(new THREE.MeshPhysicalMaterial({ name, map: dialTex, color: monument ? EDS[2].dial : '#ffffff', roughness: .38, metalness: .25, clearcoat: .5 }));
    else if (name === 'bezel_print') m = new THREE.MeshPhysicalMaterial({ name, map: bezelTex, roughness: .3, metalness: .2, clearcoat: .8 });
    else if (name === 'strap') m = new THREE.MeshPhysicalMaterial({ name, color: monument ? EDS[2].strap : '#ffffff', roughness: .55, sheen: .4, sheenColor: new THREE.Color('#ffffff') });
    else if (name === 'accent') m = new THREE.MeshStandardMaterial({ name, color: monument ? EDS[2].accent : '#ffffff', roughness: .35 });
    else if (name === 'crystal') { m = new THREE.MeshPhysicalMaterial({ name, color: '#eef6ff', roughness: .02, transparent: true, opacity: .08, depthWrite: false }); m.envMapIntensity = .25; return m; }   // AR-coated: let the dial read
    else if (name === 'lume') m = new THREE.MeshStandardMaterial({ name, color: '#dff2d0', emissive: '#9fe27a', emissiveIntensity: .25, roughness: .5 });
    else if (/titanium|caseback/.test(name)) m = new THREE.MeshStandardMaterial({ name, color: '#9ca1a7', roughness: name === 'caseback' ? .28 : .36, metalness: 1 });
    else if (/polished|hands|battery/.test(name)) m = new THREE.MeshStandardMaterial({ name, color: '#d7dade', roughness: .1, metalness: 1 });
    else if (name === 'brass') m = new THREE.MeshStandardMaterial({ name, color: '#c99b4b', roughness: .3, metalness: 1 });
    else if (name === 'copper') m = new THREE.MeshStandardMaterial({ name, color: '#c0612a', roughness: .3, metalness: 1 });
    else if (name === 'pcb') m = new THREE.MeshStandardMaterial({ name, color: '#13402a', roughness: .45, metalness: .2 });
    else m = src.clone();
    return E(m);
  };

  // ------------------------------------------------------------ local reflections (one capture, this room only)
  let envDirty = 1;
  const env = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(MON.x - 4, 1.6, MON.z), lite, mats: envMats });
  const captureEnv = () => env.capture();

  // ------------------------------------------------------------ cards
  const C = collection, marks = C.commission;
  const rights = { cls: 'G', text: `Commission: ${marks.status.replace(/-/g, ' ')}. The watch is a KONA.m geometry study from Breitling’s public specification, not a replica; no logo, IRONMAN® mark or product photograph is used until written approval is recorded.` };
  function editionCard(i, act) {
    const e = EDS[i];
    return { kind: 'beast', eyebrow: `${e.year} · ${e.event.toUpperCase()}`, title: e.name, kicker: `Ref. ${e.ref} · limited to ${e.limited} pieces`,
      lede: e.story || `${e.case[0].toUpperCase() + e.case.slice(1)}, 44 mm, on a ${e.strap ? 'coloured' : ''} rubber strap. One of Breitling’s IRONMAN® World Championship editions.`,
      stats: [{ value: '44 mm', label: e.case }, { value: String(e.limited), label: 'pieces' }, { value: e.price, label: 'list price' }],
      facts: [{ cls: 'P', text: `${C.family.movement} (breitling.com)` }, { cls: 'P', text: `${C.family.case} (breitling.com)` },
        ...(e.verify.length ? [{ cls: 'I', text: `Study colours for ${e.verify.join(' and ')} to be confirmed against Breitling’s product imagery.` }] : []), rights],
      actions: [{ label: 'View on breitling.com ↗', primary: true, href: e.source }, { label: 'See the movement →', onClick: () => { exploding = 1; act.close(); } }, { label: 'Back to the room', onClick: () => act.close() }] };
  }
  function monumentCard(act) {
    return { kind: 'beast', eyebrow: 'THE MONUMENT · 50 : 1', title: 'Every tenth of a second, taken apart.', kicker: 'Case · bezel · crystal · dial · hands · quartz module · strap',
      lede: 'A 44 mm sports chronograph at fifty times scale. It comes apart and goes back together on its own; tap again to hold it open.',
      facts: [{ cls: 'P', text: `${C.family.movement} (breitling.com)` }, { cls: 'I', text: 'The movement shown is illustrative of a thermocompensated quartz chronograph module, not Breitling’s engineering drawing.' }, rights],
      actions: [{ label: exploding ? 'Assemble' : 'Explode', primary: true, onClick: () => { exploding = exploding ? 0 : 1; act.close(); } }, { label: 'The collection →', onClick: () => ctx.renderCard?.(editionCard(2, act)) }] };
  }
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'A KONA.m ROOM · BREITLING × KONA', title: 'Every second of Kona.', kicker: '17 hours · 226 kilometres · one clock',
      lede: 'A lava hall measured by one watch. In the middle, a 2.2 m chronograph comes apart to show its quartz heart. Along the walls, six IRONMAN® editions, each in its own colour. At the end, the island at sunset.',
      facts: [{ cls: 'P', text: `${C.kona.line} (Breitling, Fratello)` }, rights],
      actions: [{ label: 'Walk to the monument →', primary: true, onClick: () => act.close() }, { label: 'The 2025 Kona edition', onClick: () => ctx.renderCard?.(editionCard(2, act)) }] };
  }

  // ------------------------------------------------------------ assets: the monument (hero) and the six vitrine watches (instanced)
  let exploding = 0, explodeT = 0, monument = null, mIndex = null;
  const bikeSpot = { kind: 'beast', pos: MON.clone(), rotY: 0, bike: null };
  const portrait = coarse && innerHeight > innerWidth;
  bikeSpot.view = portrait ? new THREE.Vector3(13.6, 0, CZ) : new THREE.Vector3(12.4, 0, CZ);
  bikeSpot.face = new THREE.Vector3(MON.x + 2, 2.2, MON.z);
  const toFace = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0));   // dial → -x (toward the door), 12 o'clock → up

  return {
    group, floor, sign, bikeSpot, infos, mood: BREITLING_MOOD, ownBikes: true, introCard,
    async useAssets(loader) {
      if (this._assets) return; this._assets = true;
      new THREE.TextureLoader().load(BREITLING_ASSETS.plate, t => { t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(.52, .62); t.offset.set(.47, .22); t.anisotropy = 8; plateMat.map = t; plateMat.needsUpdate = true; envDirty = 2; });
      try {
        const hero = (await loader.loadAsync(lite ? BREITLING_ASSETS.watchLite : BREITLING_ASSETS.watch)).scene;
        hero.traverse(o => { if (o.isMesh) { o.material = watchMat(o.material, o.material.name, true); o.castShadow = !lite; o.receiveShadow = true; } });
        monument = new THREE.Group(); const inner = new THREE.Group(); inner.add(hero); inner.applyMatrix4(toFace); monument.add(inner);
        monument.scale.setScalar(50); monument.position.copy(MON); group.add(monument);
        mIndex = indexMachine(hero);
        const pick = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); pick.position.copy(MON); group.add(pick);
        info(pick, { model: act => monumentCard(act), eyebrow: 'THE MONUMENT', title: 'Every tenth of a second, taken apart.', sub: 'Endurance Pro geometry study, 50 : 1', text: 'Tap to explode or assemble.' });
        bikeSpot.bike = group; bikeSpot.info = infos[infos.length - 1];
      } catch (e) { console.warn('breitling monument', e?.message || e); }
      try {
        const small = (await loader.loadAsync(BREITLING_ASSETS.watchLite)).scene;
        small.traverse(o => { if (o.isMesh) o.applyMatrix4(new THREE.Matrix4()); });
        const holder = new THREE.Group(); holder.add(small); holder.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2 - .28));    // dial toward +z (into the room at yaw 0), 12 o'clock up, tilted back
        const baked = bake(holder, { keep: ['position', 'normal', 'uv'] });
        const at = VIT.map(({ x, z, face }) => [x, 1.12, z, (face ? 180 : 0), 6]);
        instance(baked, at, { group, castShadow: false, materialFor: (m, name) => watchMat(m, name, false),
          colors: (i, name) => new THREE.Color(name === 'dial' ? EDS[i].dial : name === 'strap' ? EDS[i].strap : name === 'accent' ? EDS[i].accent : '#ffffff') });
        VIT.forEach(({ x, z }, i) => { const pb = new THREE.Mesh(new THREE.BoxGeometry(.72, .72, .72), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); pb.position.set(x, 1.35, z); group.add(pb);
          info(pb, { model: act => editionCard(i, act), eyebrow: `${EDS[i].year} · IRONMAN® EDITION`, title: EDS[i].name, sub: `Ref. ${EDS[i].ref}`, text: 'Tap for the edition.' }); });
      } catch (e) { console.warn('breitling vitrines', e?.message || e); }
      envDirty = 2;
    },
    setBike() {},
    explode(v = 1) { exploding = v ? 1 : 0; explodeT = exploding; },  // instant: evidence capture and automation
    update(t, reduce, dt = 1 / 60) {
      if (envDirty) { envDirty--; if (!envDirty) captureEnv(); }
      fissure.t.value = reduce ? 0 : t;
      if (mIndex) {
        // breathe apart and back: hold 5 s, open 3.5 s, hold 5 s, close 3.5 s — or follow a visitor's choice
        const cyc = (t % 17) / 17, auto = cyc < .3 ? 0 : cyc < .5 ? (cyc - .3) / .2 : cyc < .8 ? 1 : 1 - (cyc - .8) / .2;
        const want = exploding ? 1 : (reduce ? 0 : auto);
        explodeT += (want - explodeT) * Math.min(1, dt * (exploding ? 2.5 : 6));
        applyExplosion(mIndex.explodables, explodeT, { distanceScale: .75 });
        if (!reduce) monument.rotation.y = Math.sin(t * .18) * .32;
      }
      molten.intensity = (lite ? 5 : 8) * (.85 + Math.sin(t * 1.3) * .1 + Math.sin(t * 3.7) * .05);
      return { power: 0, heat: 0, riding: false, moving: !!mIndex && !reduce };   // the monument turns and opens: its shadow follows every frame
    },
  };
}
