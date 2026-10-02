// History Lane: a cobbled street in Koblenz, walked from the 1980s to today.
// Chapters stand along both sides — painted photographs on easels, empty frames for bikes no
// photograph survives of, stone steles for dates, and two abstract bronze tributes: the trailer
// of Italian parts, and the brothers who started it. The lane ends at a glass building with the
// current Speedmax in front. Drag up/down (or scroll) to walk; tap a chapter to read it.
import * as THREE from 'three';
import { FONT, SERIF } from '../engine/type.js';
import { canvasTex, seeded, lite } from './engine.js';


const mat = o => new THREE.MeshStandardMaterial(o);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function label(w, h, draw, px = 1024, opaque = false) {
  const t = canvasTex(px, Math.round(px * h / w), (g, cw, ch) => { g.scale(cw / w, ch / h); draw(g); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: !opaque, depthWrite: opaque, toneMapped: false }));
}
export const LANE = { step: 5.2, x: 2.3 };

export function buildHistory(stage, data) {
  const { scene } = stage;
  scene.background = new THREE.Color('#cfdde6'); scene.fog = new THREE.Fog('#d9e2e6', 30, 120);
  const n = data.chapters.length, zEnd = -(n - 1) * LANE.step;
  // afternoon sky
  const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 vD; void main(){ float h = clamp(vD.y, 0., 1.); vec3 c = mix(vec3(.93,.9,.84), vec3(.42,.62,.82), smoothstep(0., .6, h)); float s = pow(max(dot(vD, normalize(vec3(.5,.35,-.8))), 0.), 30.); gl_FragColor = vec4(c + vec3(1.,.9,.7) * s * .5, 1.); }' });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyM));
  // cobbles
  const rnd = seeded(85);
  const cob = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6d6259'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 120 + rnd() * 50; g.fillStyle = `rgb(${v},${v - 8},${v - 18})`; g.beginPath(); g.ellipse(x * 32 + 16 + (y % 2) * 16, y * 32 + 16, 13 + rnd() * 2, 12 + rnd() * 2, rnd(), 0, 7); g.fill(); } }, [4, 40]);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(9, -zEnd + 40), mat({ map: cob, roughness: .85 })); street.rotation.x = -Math.PI / 2; street.position.set(0, 0, zEnd / 2 - 6); street.receiveShadow = true; scene.add(street);
  // facades: half-timbered and plaster, both sides, one merged mesh per side via a long textured box
  const facade = seedN => canvasTex(1024, 512, (g, w, h) => {
    const r = seeded(seedN); let x = 0;
    while (x < w) { const bw = 120 + r() * 120, col = ['#e9dfcf', '#d9c3a3', '#c9d3c6', '#e6cdb8', '#d8d2c4', '#b9a58c'][r() * 6 | 0]; g.fillStyle = col; g.fillRect(x, 0, bw, h);
      if (r() > .5) { g.strokeStyle = '#4a3322'; g.lineWidth = 8; for (let y = 120; y < h; y += 130) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + bw, y); g.stroke(); } for (let k = 0; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * bw / 3, 0); g.lineTo(x + k * bw / 3, h); g.stroke(); } g.beginPath(); g.moveTo(x, 250); g.lineTo(x + bw / 3, 120); g.stroke(); }
      g.fillStyle = '#39424a'; for (let y = 60; y < h - 80; y += 130) for (let k = 0; k < 2; k++) { g.fillRect(x + 22 + k * bw / 2, y, bw / 2 - 44, 70); g.fillStyle = '#f3efe6'; g.fillRect(x + 20 + k * bw / 2, y + 70, bw / 2 - 40, 6); g.fillStyle = '#39424a'; }
      g.fillStyle = '#5a4030'; g.fillRect(x + bw / 2 - 20, h - 100, 40, 100); x += bw; }
  }, [(-zEnd + 40) / 14, 1]);
  for (const sx of [-1, 1]) {
    const len = -zEnd + 40, f = new THREE.Mesh(new THREE.BoxGeometry(.4, 9, len), [mat({ color: '#ddd' }), mat({ color: '#ddd' }), mat({ color: '#6a4a3a' }), mat({ color: '#ddd' }), mat({ color: '#ddd' }), mat({ color: '#ddd' })]);
    f.material[sx > 0 ? 1 : 0] = mat({ map: facade(sx > 0 ? 7 : 3), roughness: .9 });
    f.position.set(sx * 6.4, 4.5, zEnd / 2 - 6); f.receiveShadow = true; scene.add(f);
    const roofs = new THREE.Mesh(new THREE.BoxGeometry(2.6, .5, len), mat({ color: '#5a3a30', roughness: .8 })); roofs.position.set(sx * 6.9, 9.1, zEnd / 2 - 6); roofs.rotation.z = sx * .5; scene.add(roofs);
  }
  // lamps (instanced posts + glass heads)
  const L = Math.ceil(n / 2) + 2, posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.05, .07, 3.6, 8), mat({ color: '#1f2326', metalness: .6, roughness: .4 }), L * 2), heads = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .4, .3), mat({ color: '#fff4d6', emissive: '#ffd990', emissiveIntensity: .6 }), L * 2);
  const m4 = new THREE.Matrix4(); for (let i = 0; i < L; i++) for (const sx of [-1, 1]) { const k = i * 2 + (sx > 0 ? 1 : 0), z = 2 - i * LANE.step * 2 - (sx > 0 ? LANE.step : 0); posts.setMatrixAt(k, m4.makeTranslation(sx * 4.3, 1.8, z)); heads.setMatrixAt(k, m4.makeTranslation(sx * 4.3, 3.7, z)); }
  scene.add(posts, heads);
  // lights
  scene.add(new THREE.HemisphereLight('#dfeaf2', '#8a7a68', 1.1));
  const sun = new THREE.DirectionalLight('#fff0d8', 2.2); sun.position.set(12, 18, 10); sun.target.position.set(0, 0, -20); scene.add(sun, sun.target);
  sun.castShadow = !lite; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 50, bottom: -50, far: 90 });
  const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), skyM.clone())); env.add(at(new THREE.Mesh(new THREE.BoxGeometry(60, 1, 60), new THREE.MeshBasicMaterial({ color: '#7a6a5c' })), 0, -4, 0));
  stage.envFrom(env, .9);

  // ---- chapters
  const bronze = mat({ color: '#8a6a3a', metalness: .9, roughness: .35 }), stone = mat({ color: '#d8d0c2', roughness: .8 }), gold = mat({ color: '#c49a55', metalness: .9, roughness: .3 });
  const tl = new THREE.TextureLoader(), byId = Object.fromEntries(data.canvases.map(c => [c.id, c]));
  const stations = [], pickables = [];
  data.chapters.forEach((c, i) => {
    const side = i % 2 ? 1 : -1, z = -i * LANE.step, x = side * LANE.x;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = side > 0 ? -Math.PI / 2 + .55 : Math.PI / 2 - .55; scene.add(g);
    let hit;
    if (c.kind === 'photo' && byId[c.canvas]) {
      const cv = byId[c.canvas], h = 1.5, w = h * (cv.aspect || 1.5);
      const pm = mat({ color: '#cfc6b8', roughness: .5 }); const pic = at(new THREE.Mesh(new THREE.PlaneGeometry(w, h), pm), 0, 1.75, .05); g.add(pic);
      tl.load(`${data.dir}/${cv.id}.jpg`, t => { t.colorSpace = THREE.SRGBColorSpace; pm.map = t; pm.color.set('#fff'); pm.needsUpdate = true; });
      tl.load(`${data.dir}/${cv.id}_n.jpg`, t => { pm.normalMap = t; pm.normalScale.set(1.1, 1.1); pm.needsUpdate = true; });
      g.add(at(new THREE.Mesh(new THREE.BoxGeometry(w + .16, h + .16, .08), gold), 0, 1.75, 0));
      for (const dx of [-w / 2 + .15, w / 2 - .15]) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(.05, 1.0, .05), mat({ color: '#1f2326' })), dx, .5, -.02));
      hit = pic;
    } else if (c.kind === 'lost') {
      g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.8, .08, .08), gold), 0, 2.45, 0)); g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.8, .08, .08), gold), 0, .95, 0));
      for (const dx of [-.9, .9]) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(.08, 1.58, .08), gold), dx, 1.7, 0));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.5, .012, 8, 64), new THREE.MeshBasicMaterial({ color: '#35c2bf' })); halo.position.y = 1.7; g.add(halo);
      hit = at(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })), 0, 1.7, 0); g.add(hit);
      for (const dx of [-.7, .7]) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(.05, .95, .05), mat({ color: '#1f2326' })), dx, .47, -.02));
    } else if (c.kind === 'sculpture' && c.sculpture === 'trailer') {
      const tr = new THREE.Group(); tr.position.y = .1; g.add(tr);
      const blue = mat({ color: '#1d4fa3', roughness: .35, metalness: .3 });
      tr.add(at(new THREE.Mesh(new THREE.BoxGeometry(2, .9, 1.1), blue), 0, .75, 0));
      for (const dx of [-.55, .55]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(.26, .07, 10, 24), mat({ color: '#141414', roughness: .8 })); wh.rotation.y = Math.PI / 2; wh.position.set(.62 * Math.sign(dx) * 0 + dx, .26, .58); tr.add(wh); }
      tr.add(at(new THREE.Mesh(new THREE.BoxGeometry(.6, .06, .06), blue), 1.3, .5, 0));
      for (let k = 0; k < 4; k++) tr.add(at(new THREE.Mesh(new THREE.BoxGeometry(.4, .25 + k * .05, .3), mat({ color: ['#c9a36a', '#b58a52', '#d2b27a', '#a8844d'][k], roughness: .9 })), -.7 + k * .45, 1.32 + k * .02, (k % 2 - .5) * .3));
      const whl = new THREE.Mesh(new THREE.TorusGeometry(.32, .015, 6, 40), mat({ color: '#d0d4d8', metalness: 1, roughness: .2 })); whl.position.set(.2, 1.72, 0); whl.rotation.y = .4; tr.add(whl);
      const flag = label(.9, .3, gg => { gg.fillStyle = '#009246'; gg.fillRect(0, 0, .3, .3); gg.fillStyle = '#fff'; gg.fillRect(.3, 0, .3, .3); gg.fillStyle = '#ce2b37'; gg.fillRect(.6, 0, .3, .3); }, 128, true); flag.position.set(-.95, 1.1, .56); tr.add(flag);
      tr.traverse(o => { if (o.isMesh) o.castShadow = !lite; });
      hit = at(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 1.4), new THREE.MeshBasicMaterial({ visible: false })), 0, 1, 0); g.add(hit);
    } else if (c.kind === 'sculpture' && c.sculpture === 'founders') {
      const base = at(new THREE.Mesh(new THREE.BoxGeometry(1.8, .5, 1), stone), 0, .25, 0); base.receiveShadow = true; g.add(base);
      const fig = (x, withWheel) => { const f = new THREE.Group(); f.position.set(x, .5, 0);
        const cap = (r, len, a, b) => { const gg = new THREE.CapsuleGeometry(r, len, 4, 10), A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A); gg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); const m = new THREE.Mesh(gg, bronze); m.position.copy(A.clone().add(B).multiplyScalar(.5)); m.castShadow = !lite; f.add(m); };
        cap(.16, .55, [0, 1.3, 0], [0, .8, 0]); cap(.07, .6, [.08, .72, 0], [.09, .04, 0]); cap(.07, .6, [-.08, .72, 0], [-.09, .04, 0]);
        cap(.055, .45, [.2, 1.45, 0], [withWheel ? .42 : .3, 1.0, .12]); cap(.055, .45, [-.2, 1.45, 0], [withWheel ? -.1 : -.3, withWheel ? 1.2 : 1.0, .2]);
        f.add(at(new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 16), bronze), 0, 1.72, 0));
        if (withWheel) { const w = new THREE.Mesh(new THREE.TorusGeometry(.34, .025, 8, 48), bronze); w.position.set(.2, 1.1, .3); w.rotation.y = .3; f.add(w); }
        g.add(f); };
      fig(-.4, true); fig(.4, false);
      hit = at(new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.4, 1), new THREE.MeshBasicMaterial({ visible: false })), 0, 1.2, 0); g.add(hit);
    } else {
      const st = at(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, .3), stone), 0, .75, 0); st.castShadow = !lite; g.add(st);
      const face = label(1, 1.3, gg => { gg.fillStyle = '#5a4a3a'; gg.font = `400 .36px ${SERIF}`; gg.textAlign = 'center'; gg.fillText(c.year, .5, .5); gg.fillStyle = '#c49a55'; gg.fillRect(.4, .62, .2, .01); gg.fillStyle = '#5a4a3a'; gg.font = `700 .07px ${FONT}`; const t = c.title.toUpperCase(); gg.fillText(t.length > 16 ? t.slice(0, 16) + '…' : t, .5, .78); }, 512);
      face.position.set(0, .8, .16); g.add(face); hit = st;
    }
    // the plaque on the ground in front: year and title
    const pl = label(1.7, .5, gg => { gg.fillStyle = 'rgba(30,24,18,.82)'; gg.fillRect(0, 0, 1.7, .5); gg.fillStyle = '#c49a55'; gg.font = `400 .2px ${SERIF}`; gg.fillText(c.year, .08, .2); gg.fillStyle = '#f3ede4'; gg.font = `700 .07px ${FONT}`; gg.fillText(c.title.toUpperCase(), .08, .37); }, 512, true);
    pl.rotation.x = -Math.PI / 2; pl.position.set(0, .012, 1.35); g.add(pl);
    const s = { ...c, index: i, pos: new THREE.Vector3(x, 0, z), t: 0 };
    hit.userData.chapter = s; pl.userData.chapter = s; pickables.push(hit, pl); stations.push(s);
  });
  // the end: a glass building with the name, the current Speedmax in front
  const endZ = zEnd - 9;
  const glass = mat({ color: '#9fb6c4', roughness: .05, metalness: .9, envMapIntensity: 1.4 });
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 3), glass), 0, 3, endZ - 1.5));
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(12.2, .4, 3.2), mat({ color: '#f3f1ed' })), 0, 6.2, endZ - 1.5));
  const name = label(6, 1, gg => { gg.fillStyle = '#12181d'; gg.font = `800 .7px ${FONT}`; gg.textAlign = 'center'; gg.letterSpacing = '.25px'; gg.fillText('CANYON', 3, .78); }, 1024); name.position.set(0, 4.8, endZ + .02); scene.add(name);
  const plinth = at(new THREE.Mesh(new THREE.BoxGeometry(2.6, .4, 1.1), stone), 0, .2, endZ + 3); plinth.receiveShadow = true; scene.add(plinth);
  return { stations, pickables, zEnd, bikeSpot: new THREE.Vector3(0, .4, endZ + 3) };
}
