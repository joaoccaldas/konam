// Three night experiences, each a full scene around one Speedmax CFR in its own livery.
//   lava    Lava Night — Halloween on the lava field above Kona: jack-o'-lanterns, a glowing
//           crack-lit field, Hualālai's silhouette, bats and a moon
//   camp13  Camp 13 — a cheesy summer-camp slasher night (Friday the 13th spirit, all our own):
//           misty lake, a dock, cabins, a campfire and a goalie-masked counselor holding a pump
//   tunnel  Ghost Tunnel — an abandoned wind tunnel, haunted: rusted ribs, a slow fan, smoke
//           streamlines flowing over a translucent ghost Speedmax
// Each theme returns: livery, lights, environment, props, 3 hidden objects, hotspots, audio.
import * as THREE from 'three';
import { FONT, SERIF } from '../engine/type.js';
import { canvasTex, seeded, lite, reduce } from './engine.js';


const mat = (o) => new THREE.MeshStandardMaterial(o);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

function sky({ top, mid, horizon, moon = [.35, .42, -.84], moonColor = '#f4efdc', stars = 1, moonSize = .9994 }) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, hor: { value: new THREE.Color(horizon) }, moon: { value: new THREE.Vector3(...moon).normalize() }, mc: { value: new THREE.Color(moonColor) }, stars: { value: stars }, ms: { value: moonSize } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; uniform vec3 top, mid, hor, mc, moon; uniform float stars, ms;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      void main(){ float y = vD.y; vec3 c = mix(hor, mid, smoothstep(-.02, .25, y)); c = mix(c, top, smoothstep(.25, .9, y));
        vec3 g = floor(vD * 420.); float s = step(.9975, h(g)) * smoothstep(.02, .3, y) * stars; c += vec3(s) * (.6 + .4 * h(g + 1.));
        float d = dot(vD, moon); c += mc * (smoothstep(ms, ms + .0003, d) * 1.6 + pow(max(d, 0.), 60.) * .35 + pow(max(d, 0.), 8.) * .08);
        gl_FragColor = vec4(c, 1.); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), m);
}
function crackTex(seed, count = 9, repeat) {
  const rnd = seeded(seed);
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.lineCap = g.lineJoin = 'round';
    const crack = (x, y, a, len, width, depth) => { g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < len; i++) { a += (rnd() - .5) * .7; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); if (depth < 2 && rnd() < .07) crack(x, y, a + (rnd() > .5 ? 1 : -1) * (.6 + rnd()), len * .5, width * .6, depth + 1); }
      g.lineWidth = width * 3.2; g.strokeStyle = 'rgba(120,28,0,.55)'; g.stroke(); g.lineWidth = width * 1.4; g.strokeStyle = '#c23a00'; g.stroke(); g.lineWidth = width * .5; g.strokeStyle = '#ffc24d'; g.stroke(); };
    for (let i = 0; i < count; i++) crack(rnd() * w, rnd() * h, rnd() * 6.28, 22 + rnd() * 26, 4 + rnd() * 4, 0);
  }, repeat);
}
function noiseTex(seed, base, spots, repeat) {
  const rnd = seeded(seed);
  return canvasTex(512, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const [r, gg, b, a] = spots(rnd); g.fillStyle = `rgba(${r},${gg},${b},${a})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } }, repeat);
}
function label(w, h, draw, px = 1024) {
  const t = canvasTex(px, Math.round(px * h / w), (g, cw, ch) => { g.scale(cw / w, ch / h); draw(g); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
}
function turntable(topColor, ringColor) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, .28, 64), mat({ color: topColor, roughness: .35, metalness: .2 })); base.position.y = .14; base.receiveShadow = true; g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.75, .02, 8, 96), new THREE.MeshBasicMaterial({ color: ringColor, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = .28; g.add(ring);
  g.userData.top = .28; return g;
}
function pumpkins(n, radius, s = 1) {
  const face = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const cx = w * .25;
    const glow = p => { g.save(); g.shadowColor = '#ffcc55'; g.shadowBlur = 14; g.fillStyle = '#ffd27a'; g.beginPath(); p(); g.closePath(); g.fill(); g.restore(); };
    glow(() => { g.moveTo(cx - 44, 108); g.lineTo(cx - 20, 70); g.lineTo(cx - 6, 108); });
    glow(() => { g.moveTo(cx + 44, 108); g.lineTo(cx + 20, 70); g.lineTo(cx + 6, 108); });
    glow(() => { g.moveTo(cx - 54, 140); for (let i = 0; i <= 8; i++) g.lineTo(cx - 54 + i * 13.5, 140 + (i % 2 ? 10 : 0) + Math.sin(i / 8 * Math.PI) * 26); for (let i = 8; i >= 0; i--) g.lineTo(cx - 54 + i * 13.5, 150 + Math.sin(i / 8 * Math.PI) * 36 - (i % 2 ? 0 : 8)); });
  });
  const geo = new THREE.SphereGeometry(.3, 40, 20), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), rib = 1 - .075 * Math.pow(Math.abs(Math.sin(a * 4)), .6); v.x *= rib; v.z *= rib; v.y *= .78; p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const m = mat({ color: '#e8641a', roughness: .55, emissive: new THREE.Color('#ffae42'), emissiveMap: face, emissiveIntensity: 2.2 });
  const inst = new THREE.InstancedMesh(geo, m, n), q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .3, r = radius + (i % 3) * .35, k = s * (.7 + (i % 4) * .15), x = Math.cos(a) * r, z = Math.sin(a) * r;
    q.setFromAxisAngle(up, Math.atan2(-x, -z)); inst.setMatrixAt(i, m4.compose(new THREE.Vector3(x, .234 * k, z), q, new THREE.Vector3(k, k, k))); }
  inst.castShadow = !lite; inst.userData.mat = m; return inst;
}
function bats(n, center, rad) {
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(.12, .08, .26, .05); shape.lineTo(.22, -.02); shape.quadraticCurveTo(.18, .02, .15, -.03); shape.quadraticCurveTo(.1, .01, .07, -.04); shape.quadraticCurveTo(.04, -.01, 0, -.03); shape.closePath();
  const wing = new THREE.ShapeGeometry(shape); wing.rotateX(-Math.PI / 2);
  const bm = new THREE.MeshBasicMaterial({ color: '#07060a', side: THREE.DoubleSide }), list = [], g = new THREE.Group();
  for (let i = 0; i < n; i++) { const o = new THREE.Group(), l = new THREE.Mesh(wing, bm), r = new THREE.Mesh(wing, bm); r.scale.x = -1; o.add(l, r); o.scale.setScalar(1.6 + (i % 3) * .4); g.add(o);
    list.push({ o, l, r, c: center.clone().add(new THREE.Vector3((i % 3 - 1) * 2, (i % 2) * .8, (i % 4 - 1.5) * 1.5)), rad: rad + (i % 3) * .8, sp: .5 + (i % 4) * .15, ph: i * 1.3, fl: 14 + (i % 3) * 4 }); }
  g.userData.tick = t => { for (const b of list) { const a = t * b.sp + b.ph; b.o.position.set(b.c.x + Math.cos(a) * b.rad, b.c.y + Math.sin(a * 2.3) * .3, b.c.z + Math.sin(a) * b.rad); b.o.rotation.y = -a; const f = Math.sin(t * b.fl + b.ph) * .8; b.l.rotation.z = f; b.r.rotation.z = -f; } };
  return g;
}
function flickerOf(t, seed = 0) { return reduce ? 1 : .82 + Math.sin(t * 7.3 + seed) * .07 + Math.sin(t * 13.1 + 1.3 + seed) * .06 + Math.sin(t * 2.1 + seed) * .05; }
function mergeInto(geos, material) { const m = new THREE.Mesh(mergeSafe(geos), material); m.castShadow = !lite; m.receiveShadow = true; return m; }
function mergeSafe(geos) {                                             // tiny merge (position/normal/uv, non-indexed)
  const parts = geos.map(g => g.index ? g.toNonIndexed() : g);
  const out = new THREE.BufferGeometry();
  for (const a of ['position', 'normal', 'uv']) {
    if (!parts.every(p => p.attributes[a])) continue;
    const size = parts[0].attributes[a].itemSize, total = parts.reduce((n, p) => n + p.attributes[a].count, 0), arr = new Float32Array(total * size); let off = 0;
    for (const p of parts) { arr.set(p.attributes[a].array, off); off += p.attributes[a].array.length; }
    out.setAttribute(a, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

// ======================================================================= Lava Night
function lava(stage) {
  const { scene } = stage;
  scene.background = new THREE.Color('#05030a'); scene.fog = new THREE.FogExp2('#150709', .045);
  const skyM = sky({ top: '#03040b', mid: '#0c0a1c', horizon: '#3a0f10', moon: [-.4, .45, -.8], moonColor: '#ffe9c4' }); scene.add(skyM);
  const cracks = crackTex(5, 11, [8, 8]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat({ map: noiseTex(3, '#141013', r => { const v = 20 + r() * 40; return [v, v - 4, v, .5]; }, [30, 30]), color: '#2a2326', roughness: .8, emissive: '#ffffff', emissiveMap: cracks, emissiveIntensity: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // Hualālai on the horizon, its summit glowing
  const volcano = new THREE.Mesh(new THREE.ConeGeometry(38, 14, 48, 1, true), mat({ color: '#0a0708', roughness: 1 })); volcano.position.set(-18, 5, -70); scene.add(volcano);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: '#ff5a1f', transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.set(-18, 12.4, -69); scene.add(glow);
  const table = turntable('#1c1719', '#ff7a1a'); scene.add(table);
  const pk = pumpkins(11, 3.1); scene.add(pk);
  const bt = bats(7, new THREE.Vector3(0, 3.6, 0), 2.6); scene.add(bt);
  // lava rocks
  const rocks = [], rnd = seeded(9); for (let i = 0; i < 26; i++) { const g = new THREE.DodecahedronGeometry(.2 + rnd() * .6, 0); const a = rnd() * 6.28, r = 5 + rnd() * 9; g.scale(1, .55 + rnd() * .4, 1); g.translate(Math.cos(a) * r, .1, Math.sin(a) * r); rocks.push(g); }
  scene.add(mergeInto(rocks, mat({ color: '#171214', roughness: .95, flatShading: true })));
  // lights: moon, fire from below, a warm key on the bike
  scene.add(new THREE.HemisphereLight('#3b3050', '#2a0c02', .55));
  const moon = new THREE.DirectionalLight('#aebcff', 1.4); moon.position.set(-8, 10, -12); moon.castShadow = !lite; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); scene.add(moon);
  const ember = new THREE.PointLight('#ff6a1a', 14, 9, 1.6); ember.position.set(1.2, .5, 1.8); scene.add(ember);
  const ember2 = new THREE.PointLight('#ff8a3a', 8, 8, 1.6); ember2.position.set(-1.6, .4, -1.4); scene.add(ember2);
  // environment: the moon, a red horizon and fire below
  const env = new THREE.Scene(); env.add(sky({ top: '#050510', mid: '#140c1e', horizon: '#5a1a0c', moon: [-.4, .45, -.8], moonColor: '#ffe9c4', stars: 0, moonSize: .995 }));
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: '#ff5a10', side: THREE.DoubleSide })); fire.rotation.x = Math.PI / 2; fire.position.y = -3; env.add(fire);
  stage.envFrom(env, .7);
  // hidden objects
  const finds = [];
  { const raven = new THREE.Group(); const bm = mat({ color: '#0b0a0e', roughness: .4, metalness: .2 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), bm); body.scale.set(1, .8, 1.6); raven.add(body);
    const head = at(new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), bm), 0, .09, .15); raven.add(head);
    const beak = at(new THREE.Mesh(new THREE.ConeGeometry(.02, .08, 8), mat({ color: '#2a2a2a' })), 0, .08, .24); beak.rotation.x = Math.PI / 2; raven.add(beak);
    for (const x of [.03, -.03]) raven.add(at(new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffb000' })), x, .11, .2));
    raven.position.set(6.2, .55, -3.4); raven.rotation.y = -1; scene.add(raven); finds.push({ id: 'raven', label: 'The raven', text: 'Perched on the lava, watching the Queen K. Nevermore… drafting.', obj: raven }); }
  { const gel = new THREE.Mesh(new THREE.BoxGeometry(.14, .02, .22), mat({ color: '#ff7a1a', roughness: .3, emissive: '#ff4d00', emissiveIntensity: .4 })); gel.position.set(-3.8, .03, 4.6); gel.rotation.y = .6; scene.add(gel);
    finds.push({ id: 'gel', label: 'Pumpkin-spice gel', text: 'Race nutrition, seasonal edition. 25 g of carbohydrate and a regret.', obj: gel }); }
  { const spoke = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .7, 8), mat({ color: '#e9c46a', metalness: 1, roughness: .2, emissive: '#6a4a10', emissiveIntensity: .6 })); spoke.position.set(-7.5, .1, -5.2); spoke.rotation.z = Math.PI / 2 - .2; spoke.rotation.y = .7; scene.add(spoke);
    finds.push({ id: 'spoke', label: 'The golden spoke', text: 'Every lava field keeps one. Legend says it came from a wheel that never punctured.', obj: spoke }); }
  const hotspots = [
    { pos: [-18, 12.4, -69], title: 'Hualālai', text: 'Kailua-Kona sits on the slopes of Hualālai, the volcano behind the town. The Ironman bike course crosses its lava fields on the Queen Ka‘ahumanu Highway.' },
  ];
  return {
    id: 'lava', name: 'Lava Night', eyebrow: 'Halloween on the lava field', accent: '#ff7a1a', bg: '#05030a',
    story: 'Midnight above Kona. The lava field glows through its cracks, the lanterns are carved, the bats are out — and one Speedmax CFR wears black and ember.',
    livery: 'Midnight black · ember lettering · a museum livery, not a Canyon colourway',
    paint(m) { if (m.name === 'paint_frame') { m.color.set('#141116'); m.roughness = .3; m.metalness = .25; if ('clearcoat' in m) { m.clearcoat = 1; m.clearcoatRoughness = .08; } }
      if (/decal/.test(m.name)) { m.color.set('#ff7a1a'); if (m.emissive) { m.emissive.set('#ff4d00'); m.emissiveIntensity = 1.8; } } },
    table, finds, hotspots, camera: { target: [0, .95, 0], r: 4.4, yaw: .9, pitch: .14 },
    update(dt, t) { const f = flickerOf(t); pk.userData.mat.emissiveIntensity = 2.2 * f; ember.intensity = 14 * f; ember2.intensity = 8 * flickerOf(t, 2); ground.material.emissiveIntensity = .9 + (reduce ? 0 : Math.sin(t * .8) * .2); glow.material.opacity = .45 + Math.sin(t * .6) * .15; if (!reduce) bt.userData.tick(t); },
    audio(ctx, out, noise) { const n = noise(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140; const g = ctx.createGain(); g.gain.value = 1.4; n.connect(lp).connect(g).connect(out); n.start();
      const c = noise(2); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const cg = ctx.createGain(); cg.gain.value = .05; c.connect(hp).connect(cg).connect(out); c.start(); },
  };
}

// ======================================================================= Camp 13
function camp13(stage) {
  const { scene } = stage;
  scene.background = new THREE.Color('#050a16'); scene.fog = new THREE.FogExp2('#0c1626', .032);
  scene.add(sky({ top: '#02040c', mid: '#0a1428', horizon: '#1d2a3c', moon: [.2, .38, -.9], moonColor: '#ffd9c2', moonSize: .9990 }));
  const grass = noiseTex(13, '#16241a', r => { const v = r(); return [20 + v * 40, 40 + v * 50, 20 + v * 25, .6]; }, [24, 24]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat({ map: grass, color: '#5f7a62', roughness: .95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // the lake: a dark mirror that picks up the moon from the environment
  const lake = new THREE.Mesh(new THREE.CircleGeometry(30, 64), mat({ color: '#07101c', roughness: .06, metalness: .9 })); lake.rotation.x = -Math.PI / 2; lake.position.set(0, .02, -34); scene.add(lake);
  const wood = mat({ map: noiseTex(4, '#5a4330', r => { const v = r(); return [90 + v * 40, 60 + v * 30, 40 + v * 20, .35]; }, [1, 4]), color: '#8a6a50', roughness: .85 });
  const dock = [];
  { const d = new THREE.BoxGeometry(2.2, .12, 9); d.translate(3.2, .35, -6.8); dock.push(d); for (const x of [2.2, 4.2]) for (let z = -3; z > -11.5; z -= 2.6) { const p = new THREE.CylinderGeometry(.1, .1, 1.2, 8); p.translate(x, -.1, z); dock.push(p); } }
  scene.add(mergeInto(dock, wood));
  // cabins, one with a lit window
  const cabins = []; const winM = new THREE.MeshBasicMaterial({ color: '#ffcf7a', toneMapped: false });
  for (const [x, z, ry] of [[-7.5, -3.5, .5], [-8.5, 4.2, 1.2]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 2.8), wood); body.position.y = 1.1; body.castShadow = body.receiveShadow = true; g.add(body);
    const roofShape = new THREE.Shape(); roofShape.moveTo(-1.9, 0); roofShape.lineTo(0, 1.3); roofShape.lineTo(1.9, 0); roofShape.closePath();
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 3.1, bevelEnabled: false }), mat({ color: '#2a2320', roughness: .9 })); roof.position.set(0, 2.2, -1.55); g.add(roof);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(.8, .6), winM); w.position.set(.8, 1.3, 1.41); g.add(w); cabins.push(w);
    const n = label(.9, .3, gg => { gg.fillStyle = '#e9dcc8'; gg.font = `800 .2px ${FONT}`; gg.textAlign = 'center'; gg.fillText(x < -8 ? 'CABIN 13' : 'CABIN 12', .45, .22); }, 256); n.position.set(-.7, 1.75, 1.42); g.add(n);
  }
  // pines around the clearing (one instanced mesh for needles, one for trunks)
  const pine = new THREE.ConeGeometry(1, 2.4, 9); pine.translate(0, 1.2, 0);
  const trunks = new THREE.CylinderGeometry(.12, .16, 1, 6); trunks.translate(0, .5, 0);
  const N = lite ? 40 : 70, rnd = seeded(21), pines = new THREE.InstancedMesh(pine, mat({ color: '#0f2418', roughness: .9, flatShading: true }), N * 3), tr = new THREE.InstancedMesh(trunks, mat({ color: '#2a1d14' }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) { let a = rnd() * 6.28, r = 11 + rnd() * 22; if (Math.sin(a) < -.55) a += 1.6; const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 1.4 + rnd() * 1.6;
    tr.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * 1.2, s)));
    for (let k = 0; k < 3; k++) pines.setMatrixAt(i * 3 + k, m4.compose(new THREE.Vector3(x, s * (1 + k * 1.3), z), q, new THREE.Vector3(s * (1.3 - k * .3), s * (1 - k * .15), s * (1.3 - k * .3)))); }
  pines.castShadow = !lite; scene.add(pines, tr);
  // campfire: logs, flames, embers, a real (flickering) light on the bike
  const fire = new THREE.Group(); fire.position.set(2.8, 0, 2.6); scene.add(fire);
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .8, 8), mat({ color: '#3a2618', roughness: .9 })); l.rotation.z = Math.PI / 2; l.rotation.y = i / 5 * Math.PI; l.position.y = .08; fire.add(l); }
  const flameM = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flames = []; for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.12 - i * .012, .7 - i * .06, 8, 1, true), flameM); f.position.set((i % 2 - .5) * .12, .35, (i % 3 - 1) * .1); fire.add(f); flames.push(f); }
  const fireLight = new THREE.PointLight('#ff8a3a', 34, 16, 1.4); fireLight.position.set(0, .8, 0); fire.add(fireLight);
  const emberGeo = new THREE.BufferGeometry(), EN = 60, ep = new Float32Array(EN * 3); for (let i = 0; i < EN; i++) { ep[i * 3] = (Math.random() - .5) * .5; ep[i * 3 + 1] = Math.random() * 2.5; ep[i * 3 + 2] = (Math.random() - .5) * .5; }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: '#ffaa55', size: .05, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); fire.add(embers);
  // string lights over the clearing
  { const n = 22, pts = []; for (let i = 0; i < n; i++) { const u = i / (n - 1); pts.push(new THREE.Vector3(-5 + u * 11, 3.2 - Math.sin(u * Math.PI) * .7, 3.6 - u * 2)); }
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
    pts.forEach((p, i) => { bulbs.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)); bulbs.setColorAt(i, new THREE.Color(i % 2 ? '#ffd27a' : '#ff5a5a').multiplyScalar(1.5)); });
    scene.add(bulbs, new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#111' }))); }
  // the counselor: goalie mask, camp jacket, a floor pump instead of anything sharp
  const counselor = new THREE.Group(); counselor.position.set(-2.6, 0, -1.4); counselor.rotation.y = .9; scene.add(counselor);
  const jacket = mat({ color: '#1f3a2a', roughness: .85 }), jeans = mat({ color: '#1c2233', roughness: .9 });
  const cap = (r, len, a, b, m) => { const g = new THREE.CapsuleGeometry(r, len, 4, 10); const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); const mm = new THREE.Mesh(g, m); mm.position.copy(A.clone().add(B).multiplyScalar(.5)); mm.castShadow = !lite; counselor.add(mm); return mm; };
  cap(.2, .45, [0, 1.35, 0], [0, .95, 0], jacket); cap(.07, .5, [.1, .8, 0], [.1, .08, 0], jeans); cap(.07, .5, [-.1, .8, 0], [-.1, .08, 0], jeans);
  cap(.065, .4, [.25, 1.45, 0], [.32, 1.02, .18], jacket); cap(.065, .4, [-.25, 1.45, 0], [-.3, 1.05, .2], jacket);
  const head = new THREE.Group(); head.position.set(0, 1.78, 0); counselor.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(.16, 20, 16), mat({ color: '#1a1414', roughness: .8 })));
  const maskTex = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#efe9dc'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1414';
    for (const [x, y] of [[92, 120], [164, 120]]) { g.beginPath(); g.ellipse(x, y, 22, 14, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 22; i++) { const x = 60 + (i % 6) * 27 + ((i / 6 | 0) % 2) * 13, y = 170 + (i / 6 | 0) * 26; if (x < 210) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } }
    g.fillStyle = '#c21d2e'; for (const [x, y, r] of [[128, 60, 0], [70, 80, -.6], [186, 80, .6]]) { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.moveTo(-14, 0); g.lineTo(0, -22); g.lineTo(14, 0); g.lineTo(0, -8); g.closePath(); g.fill(); g.restore(); }
    g.fillStyle = '#ff7aa8'; for (const x of [70, 186]) { g.globalAlpha = .45; g.beginPath(); g.arc(x, 160, 16, 0, 7); g.fill(); } g.globalAlpha = 1;   // blush: it's a cute one
  });
  const mask = new THREE.Mesh(new THREE.SphereGeometry(.172, 24, 18, -Math.PI * .42, Math.PI * .84, Math.PI * .18, Math.PI * .66), mat({ map: maskTex, roughness: .35 }));
  mask.rotation.y = Math.PI; head.add(mask);
  const pump = new THREE.Group(); pump.position.set(.36, 0, .28); counselor.add(pump);
  pump.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .72, 12), mat({ color: '#c21d2e', roughness: .4 })), 0, .42, 0));
  pump.add(at(new THREE.Mesh(new THREE.BoxGeometry(.3, .03, .1), mat({ color: '#222' })), 0, .05, 0));
  pump.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .32, 8), mat({ color: '#111' })), 0, .8, 0)).rotation.z = Math.PI / 2;
  const sign = label(2.2, 1.2, g => {
    g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, 2.2, 1.2); g.strokeStyle = '#e9dcc8'; g.lineWidth = .02; g.strokeRect(.05, .05, 2.1, 1.1);
    g.fillStyle = '#e9dcc8'; g.textAlign = 'center'; g.font = `800 .26px ${FONT}`; g.fillText('CAMP 13', 1.1, .38);
    g.font = `600 .07px ${FONT}`; g.fillText('EST. 1980  ·  LAKESIDE  ·  TRI CLUB', 1.1, .52);
    g.fillStyle = '#ff6a6a'; g.font = `700 .08px ${FONT}`; g.fillText('NO SWIMMING AFTER DARK', 1.1, .75); g.fillText('NO DRAFTING. EVER.', 1.1, .9);
    g.fillStyle = '#e9dcc8'; g.font = `italic 400 .1px ${SERIF}`; g.fillText('It’s Friday. It’s the 13th. It’s leg day.', 1.1, 1.07);
  });
  sign.material.transparent = false; sign.position.set(-4.4, 1.5, 1.6); sign.rotation.y = 1.1; scene.add(sign);
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(.1, 1.5, .1), wood), -4.4, .7, 1.55));
  const table = turntable('#2a2320', '#c21d2e'); scene.add(table);
  scene.add(new THREE.HemisphereLight('#5a6c98', '#14200f', .9));
  const moon = new THREE.DirectionalLight('#d6deff', 1.8); moon.position.set(4, 9, -14); moon.castShadow = !lite; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); scene.add(moon);
  const env = new THREE.Scene(); env.add(sky({ top: '#040810', mid: '#101c34', horizon: '#26364a', moon: [.2, .38, -.9], moonColor: '#ffd9c2', stars: 0, moonSize: .995 }));
  const fe = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff8a3a' })); fe.position.set(8, 1, 8); env.add(fe);
  stage.envFrom(env, .75);
  const finds = [];
  { const w = new THREE.Group(); w.add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .09, 12), mat({ color: '#d7d7d7', metalness: 1, roughness: .2 }))); w.children[0].rotation.z = Math.PI / 2;
    w.add(at(new THREE.Mesh(new THREE.TorusGeometry(.12, .006, 6, 24), mat({ color: '#c21d2e' })), .08, -.1, 0)); w.position.set(3.4, .5, -9.8); scene.add(w);
    finds.push({ id: 'whistle', label: 'The counselor’s whistle', text: 'Found at the end of the dock. One blast: swim start. Two blasts: nobody goes in the lake.', obj: w }); }
  { const fl = new THREE.Group(); fl.add(new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .26, 12), mat({ color: '#e0b72a', roughness: .4 }))); fl.add(at(new THREE.Mesh(new THREE.CircleGeometry(.038, 16), new THREE.MeshBasicMaterial({ color: '#fff6c8' })), 0, .131, 0)).rotation.x = -Math.PI / 2;
    fl.rotation.z = Math.PI / 2; fl.position.set(-9.6, .04, 1.2); scene.add(fl);
    finds.push({ id: 'flashlight', label: 'A flashlight (batteries: 13%)', text: 'Dropped behind Cabin 13. Of course it was Cabin 13.', obj: fl }); }
  { const mk = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12, -Math.PI * .42, Math.PI * .84, Math.PI * .18, Math.PI * .66), mat({ map: maskTex, roughness: .35, side: THREE.DoubleSide })); mk.position.set(6.8, .3, 4.6); mk.rotation.set(-.4, -.8, 0); scene.add(mk);
    finds.push({ id: 'mini-mask', label: 'Mini goalie mask keyring', text: 'Camp 13 gift shop, $13. Blush included.', obj: mk }); }
  const hotspots = [{ pos: [-4.4, 1.5, 1.6], title: 'Camp 13 rules', text: 'No swimming after dark, no drafting, and whoever finishes last does the dishes. The counselor enforces all three — with a floor pump.' }];
  let headLook = 0;
  return {
    id: 'camp13', name: 'Camp 13', eyebrow: 'Friday the 13th, lakeside', accent: '#c21d2e', bg: '#040812',
    story: 'Summer camp, full moon, a lake nobody swims in after dark. The counselor in the goalie mask only wants one thing: to check your tyre pressure.',
    livery: 'Bone white · cherry red lettering · a museum livery, not a Canyon colourway',
    paint(m) { if (m.name === 'paint_frame') { m.color.set('#efe8da'); m.roughness = .28; m.metalness = .05; if ('clearcoat' in m) { m.clearcoat = 1; m.clearcoatRoughness = .1; } }
      if (/decal/.test(m.name)) m.color.set('#c21d2e'); },
    table, finds, hotspots, camera: { target: [0, .95, 0], r: 5.6, yaw: .35, pitch: .16 },
    update(dt, t, cam) {
      const f = flickerOf(t, 1); fireLight.intensity = 34 * f; flames.forEach((fl, i) => { fl.scale.y = .8 + Math.sin(t * (8 + i) + i) * .2; fl.rotation.y = t * (1 + i * .3); }); flameM.opacity = .75 + f * .15;
      cabins[1].material.color.setScalar(.6 + .4 * (Math.sin(t * 17) > .92 ? .2 : 1));
      if (!reduce) { const p = emberGeo.attributes.position; for (let i = 0; i < EN; i++) { let y = p.getY(i) + dt * (.4 + (i % 5) * .1); if (y > 2.6) y = 0; p.setY(i, y); } p.needsUpdate = true; }
      // the counselor turns his head toward you when you're behind him. Cheesy? Yes.
      if (cam) { const lp = counselor.worldToLocal(cam.position.clone()), want = Math.max(-1.3, Math.min(1.3, Math.atan2(lp.x, lp.z))); headLook += (want - headLook) * (1 - Math.exp(-dt * 1.5)); head.rotation.y = headLook; }
    },
    audio(ctx, out, noise) {
      const n = noise(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; const g = ctx.createGain(); g.gain.value = .5; n.connect(lp).connect(g).connect(out); n.start();
      for (const [f, rate] of [[4300, 11], [4700, 13]]) { const o = ctx.createOscillator(); o.frequency.value = f; const og = ctx.createGain(); og.gain.value = 0; const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = rate; const lg = ctx.createGain(); lg.gain.value = .012; lfo.connect(lg).connect(og.gain); o.connect(og).connect(out); o.start(); lfo.start(); }
    },
  };
}

// ======================================================================= Ghost Tunnel
function tunnel(stage) {
  const { scene } = stage;
  scene.background = new THREE.Color('#020605'); scene.fog = new THREE.Fog('#041009', 6, 34);
  const R = 5, L = 44;
  const rust = noiseTex(31, '#2a2e2a', r => { const v = r(); return v > .7 ? [110 + v * 60, 60 + v * 30, 30, .35] : [40 + v * 30, 50 + v * 30, 45 + v * 25, .5]; }, [10, 3]);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 48, 1, true), mat({ map: rust, color: '#7a8a80', roughness: .85, metalness: .35, side: THREE.BackSide }));
  shell.rotation.x = Math.PI / 2; shell.position.set(0, R - .6, -L / 2 + 10); scene.add(shell);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7.6, L), mat({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#1a1e1c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2c332f'; g.lineWidth = 6; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }, [8, 44]), roughness: .6, metalness: .6 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -L / 2 + 10); floor.receiveShadow = true; scene.add(floor);
  const ribs = new THREE.InstancedMesh(new THREE.TorusGeometry(R - .05, .09, 6, 48), mat({ color: '#3a3f3a', roughness: .5, metalness: .8 }), 22);
  const m4 = new THREE.Matrix4(); for (let i = 0; i < 22; i++) ribs.setMatrixAt(i, m4.makeTranslation(0, R - .6, 10 - i * 2)); scene.add(ribs);
  // fluorescent tubes, a few dying
  const tubeG = new THREE.BoxGeometry(.08, .06, 1.6), steady = [], dying = [];
  for (let i = 0; i < 9; i++) (i % 3 === 1 ? dying : steady).push([(i % 2 ? 1.6 : -1.6), R + R - .6 - .9, 8 - i * 4.4]);
  const tubeM = new THREE.MeshBasicMaterial({ color: '#c8ffe0', toneMapped: false }), dyingM = tubeM.clone();
  const mk = (list, m) => { const im = new THREE.InstancedMesh(tubeG, m, list.length); list.forEach(([x, y, z], i) => im.setMatrixAt(i, m4.makeTranslation(x, y - 1.7, z))); scene.add(im); };
  mk(steady, tubeM); mk(dying, dyingM);
  // the fan at the far end
  const fan = new THREE.Group(); fan.position.set(0, R - .6, -L + 11); scene.add(fan);
  const bladeM = mat({ color: '#1c201e', roughness: .5, metalness: .7 });
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.9, 4.2, .08), bladeM); b.position.y = 2.1; const piv = new THREE.Group(); piv.rotation.z = i / 6 * Math.PI * 2; b.rotation.y = .35; piv.add(b); fan.add(piv); }
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .6, 24), bladeM)).rotation.x = Math.PI / 2;
  const behind = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({ color: '#9fffd0', toneMapped: false })); behind.position.set(0, R - .6, -L + 10.4); scene.add(behind);
  // smoke streamlines: lines whose light travels along them (one draw call)
  const lines = [], U = [], starts = [];
  for (let yi = 0; yi < 7; yi++) for (let xi = 0; xi < 5; xi++) starts.push([(xi - 2) * .32, .35 + yi * .22]);
  const pos = [];
  for (const [x0, y0] of starts) {
    const seg = 60; let prev = null;
    for (let i = 0; i <= seg; i++) {
      const z = 6 - i * .2, near = Math.exp(-(z * z) / 1.4), dy = y0 - .9, bump = near * .35 * Math.sign(dy || 1) * Math.exp(-Math.abs(dy) * 1.2), side = near * .28 * Math.sign(x0 || .01) * Math.exp(-Math.abs(x0) * 2);
      const p = [x0 + side + Math.sin(i * .3 + y0 * 9) * .01 * i / seg, y0 + bump, z];
      if (prev) { pos.push(...prev, ...p); U.push((i - 1) / seg, i / seg); }
      prev = p;
    }
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('u', new THREE.Float32BufferAttribute(U, 1));
  const smokeM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 } },
    vertexShader: 'attribute float u; varying float vU; void main(){ vU = u; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying float vU; uniform float t; void main(){ float w = fract(vU * 3. - t * .45); float a = smoothstep(0., .1, w) * smoothstep(.55, .12, w) * smoothstep(0., .08, vU) * smoothstep(1., .85, vU); gl_FragColor = vec4(vec3(.6, 1., .8) * a, a * .8); }' });
  scene.add(new THREE.LineSegments(lg, smokeM)); lines.push(smokeM);
  // the gauge panel with a glitching readout
  let readout = 0; const panelC = document.createElement('canvas'); panelC.width = 512; panelC.height = 256; const pg = panelC.getContext('2d');
  const panelT = new THREE.CanvasTexture(panelC); panelT.colorSpace = THREE.SRGBColorSpace;
  const drawPanel = t => { pg.fillStyle = '#031008'; pg.fillRect(0, 0, 512, 256); pg.fillStyle = '#7dffb0'; pg.font = '700 26px ui-monospace,monospace'; const g = Math.sin(t * 3) > .7;
    pg.fillText('TUNNEL 4 · SINCE 19??', 24, 46); pg.fillText(`WIND   ${g ? '6̶6̶' : '50'} km/h`, 24, 100); pg.fillText(`YAW    ${g ? '−13' : '0'}°`, 24, 144); pg.fillText(`DRAG   ${g ? 'B O O' : (18 + Math.sin(t) * .6).toFixed(1) + ' N'}`, 24, 188);
    pg.fillStyle = 'rgba(125,255,176,.15)'; for (let y = 0; y < 256; y += 4) pg.fillRect(0, y, 512, 1); panelT.needsUpdate = true; };
  drawPanel(0);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .8), new THREE.MeshBasicMaterial({ map: panelT, toneMapped: false })); panel.position.set(-3.1, 1.6, -1.2); panel.rotation.y = 1.2; scene.add(panel);
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, .12), mat({ color: '#1a1e1c', metalness: .6, roughness: .4 })), -3.14, 1.6, -1.26)).rotation.y = 1.2;
  const table = turntable('#1c201e', '#7dffb0'); scene.add(table);
  scene.add(new THREE.HemisphereLight('#4a7a60', '#050a08', .5));
  const key = new THREE.DirectionalLight('#d0ffe8', 1.2); key.position.set(0, 6, -12); key.castShadow = !lite; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); scene.add(key);
  const green = new THREE.PointLight('#5dffa0', 10, 8, 1.6); green.position.set(1.6, 2.2, 1.4); scene.add(green);
  const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: '#0a1812', side: THREE.BackSide })));
  for (let i = 0; i < 6; i++) env.add(at(new THREE.Mesh(new THREE.BoxGeometry(.6, .3, 8), new THREE.MeshBasicMaterial({ color: '#c8ffe0' })), (i % 2 ? 3 : -3), 6, 12 - i * 6));
  env.add(at(new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshBasicMaterial({ color: '#9fffd0' })), 0, 3, -30));
  stage.envFrom(env, .8);
  const finds = [];
  { const tuft = new THREE.Group(); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.006, .004, .16, 4), mat({ color: '#ff3d8e' })); s.position.set(i * .03, .08, 0); s.rotation.z = .6 + i * .1; tuft.add(s); }
    tuft.position.set(3.6, .02, 3.2); scene.add(tuft); finds.push({ id: 'tuft', label: 'A wool tuft', text: 'Engineers tape wool tufts to frames to see where air sticks and where it tears away. This one escaped.', obj: tuft }); }
  { const wand = new THREE.Group(); wand.add(new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .9, 8), mat({ color: '#b8c0bc', metalness: 1, roughness: .3 }))); wand.children[0].rotation.z = Math.PI / 2;
    wand.add(at(new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), new THREE.MeshBasicMaterial({ color: '#c8ffe0' })), .46, 0, 0)); wand.position.set(-2.6, .06, 5.6); wand.rotation.y = .5; scene.add(wand);
    finds.push({ id: 'wand', label: 'The smoke wand', text: 'Held upstream, it draws the lines you see flowing over the bike. Someone left it on. For decades.', obj: wand }); }
  { const sw = new THREE.Group(); sw.add(new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .025, 24), mat({ color: '#c9ced3', metalness: 1, roughness: .25 }))); sw.children[0].rotation.x = Math.PI / 2;
    sw.add(at(new THREE.Mesh(new THREE.CircleGeometry(.06, 24), new THREE.MeshBasicMaterial({ color: '#e8fff2' })), 0, 0, .014)); sw.position.set(4.1, 2.9, -6); sw.rotation.y = -1; scene.add(sw);
    finds.push({ id: 'stopwatch', label: 'A stopwatch, still running', text: 'Stopped at 7:35:53. Nobody touched it. Nobody.', obj: sw }); }
  const hotspots = [{ pos: [-3.1, 1.6, -1.2], title: 'The readout', text: 'Real tunnels read drag in newtons at a fixed wind speed and sweep the yaw angle — the angle of the wind to the bike. This one reads whatever it wants.' }];
  let nextPanel = 0;
  return {
    id: 'tunnel', name: 'Ghost Tunnel', eyebrow: 'The haunted wind tunnel', accent: '#7dffb0', bg: '#020605',
    story: 'An abandoned wind tunnel, still running at night. Smoke threads over a Speedmax that isn’t entirely there; the fan never stops; the drag gauge says “BOO”.',
    livery: 'Ghost: translucent frame · glowing lettering · a museum livery, not a Canyon colourway',
    paint(m) { if (m.name === 'paint_frame') { m.color.set('#dff7ec'); m.transparent = true; m.opacity = .42; m.depthWrite = false; m.roughness = .15; if (m.emissive) { m.emissive.set('#3dffa0'); m.emissiveIntensity = .18; } }
      if (/decal/.test(m.name)) { m.color.set('#7dffb0'); if (m.emissive) { m.emissive.set('#3dffa0'); m.emissiveIntensity = 1.4; } } },
    table, finds, hotspots, camera: { target: [0, .95, 0], r: 4.3, yaw: .7, pitch: .1, rMax: 7.5 },
    update(dt, t) { if (!reduce) fan.rotation.z += dt * .8; smokeM.uniforms.t.value = t; const on = Math.sin(t * 23) > -.6 && Math.sin(t * 3.1) > -.9; dyingM.color.set(on ? '#c8ffe0' : '#1a2a22'); green.intensity = 10 * flickerOf(t, 4);
      if (t > nextPanel) { nextPanel = t + .5; drawPanel(t); readout++; } },
    audio(ctx, out, noise) { const n = noise(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .7; const g = ctx.createGain(); g.gain.value = 1.2; n.connect(bp).connect(g).connect(out); n.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = .12; const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(bp.frequency); lfo.start();
      const hum = ctx.createOscillator(); hum.frequency.value = 55; const hg = ctx.createGain(); hg.gain.value = .05; hum.connect(hg).connect(out); hum.start(); },
  };
}

export const NIGHTS = { lava, camp13, tunnel };
export const NIGHT_LIST = [['lava', 'Lava Night', '🎃'], ['camp13', 'Camp 13', '🏕️'], ['tunnel', 'Ghost Tunnel', '👻']];
