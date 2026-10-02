// Heritage exhibit viewer: one reference-backed historical bike per page.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const PROFILE = window.__BIKE_PROFILE;
const B = PROFILE.bike;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ------------------------------------------------------------------ text
$('#eyebrow').textContent = `Canyon museum · ${B.era} · Exhibit ${B.exhibit}`;
$('#name').innerHTML = `${esc(B.family)}<br><span>${esc(B.name)}</span>`;
$('#lede').textContent = B.lede;
const stats = (B.stats || []).map(s => `<div><b>${esc(s.value)}</b><small>${esc(s.label)}</small></div>`).join('');
$('#paneExhibit').innerHTML = `<div class="stat">${stats}</div>
  <h2>Generation</h2><p style="margin:0 0 6px;color:var(--muted)">${esc(B.story)}</p>
  <h2>Specification · ${esc(B.years)}</h2><dl class="kv">${(B.spec || []).map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>
  <h2>Geometry · size ${esc(B.size)}</h2><dl class="kv">${(B.geometry || []).map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>`;
$('#paneEvidence').innerHTML = `<h2>How this model was made</h2><p style="margin:0 0 12px;color:var(--muted)">${esc(B.method)}</p>
  <h2>Measured against the photo</h2><dl class="kv">${(B.checks || []).map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>
  <h2>Inferred or uncertain</h2>${(B.uncertainties || []).map(u => `<p class="note">${esc(u)}</p>`).join('')}
  <h2>Sources</h2>${(B.sources || []).map(s => `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}<small>${esc(s.url)}</small></a>`).join('')}`;

$$('.tabs button').forEach(b => b.onclick = () => {
  $$('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
  $$('.pane').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
});
$('#togglePanel').onclick = () => { const o = $('#panel').classList.toggle('open'); $('#togglePanel').setAttribute('aria-expanded', o); };

// ------------------------------------------------------------------ renderer
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#10151b');
scene.fog = new THREE.Fog('#10151b', 4.5, 9);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .75;
const camera = new THREE.PerspectiveCamera(32, 1, .02, 60);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = .6; controls.maxDistance = 6;
controls.maxPolarAngle = Math.PI * .52;
const key = new THREE.DirectionalLight('#fff4e6', 2.2); key.position.set(1.2, 3.2, 2.4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4 }); key.shadow.bias = -.0004;
scene.add(key, new THREE.HemisphereLight('#c9dcf0', '#1a2027', .55));
const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 96), new THREE.MeshStandardMaterial({ color: '#080b0e', roughness: .82, metalness: .05, envMapIntensity: .25 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const plinth = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.27, 128), new THREE.MeshBasicMaterial({ color: '#bde9d9', transparent: true, opacity: .25 }));
plinth.rotation.x = -Math.PI / 2; plinth.position.y = .001; scene.add(plinth);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < 820 ? 42 : 32;
  // Desktop: centre the bike in the space left of the details panel.
  if (w >= 820) camera.setViewOffset(w, h, 180, 0, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ model
const bike = new THREE.Group(); scene.add(bike);
const parts = {}, meshesOf = {}, explodables = [];
const b64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
$('#loader i').style.width = '30%';
let centre = new THREE.Vector3(0, .55, 0);
loader.parse(b64(window.__SPEEDMAX_GLB).buffer, '', gltf => {
  const root = gltf.scene; bike.add(root);
  root.traverse(o => {
    const ud = o.userData || {};
    if (ud.part) parts[ud.part] = o;
    if (ud.explode) explodables.push({ node: o, base: o.position.clone(), vec: new THREE.Vector3(ud.explode[0], ud.explode[2], -ud.explode[1]) });
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      let p = o; while (p && !(p.userData && p.userData.part)) p = p.parent;
      if (p) (meshesOf[p.userData.part] ||= []).push(o);
      o.userData.baseMat = o.material;
    }
  });
  const box = new THREE.Box3().setFromObject(root); centre = box.getCenter(new THREE.Vector3());
  plinth.position.x = floor.position.x = centre.x;
  buildPartList();
  view('hero', true);
  $('#loader i').style.width = '100%';
  setTimeout(() => { $('#loader').style.opacity = 0; setTimeout(() => $('#loader').remove(), 500); document.body.classList.add('ready'); window.__heritage = { parts: Object.keys(parts) }; }, 150);
}, err => { $('#loader div').textContent = 'Model failed to load'; console.error(err); });

// ------------------------------------------------------------------ parts, picking, isolate
const LABELS = PROFILE.partLabels || {};
const label = id => LABELS[id] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const TOP = ['frame', 'fork', 'wheel_front', 'wheel_rear', 'crankset', 'chain', 'cassette', 'rear_derailleur', 'front_derailleur',
  'brake_front', 'brake_rear', 'seatpost', 'saddle', 'stem', 'base_bar', 'extensions', 'brake_levers', 'cables'];
let selected = null;
function buildPartList() {
  const ids = TOP.filter(id => parts[id]);
  $('#partList').innerHTML = ids.map(id => `<li><button data-part="${id}" aria-pressed="false">${esc(label(id))}<small>${esc((PROFILE.partNotes || {})[id] || '')}</small></button></li>`).join('');
  $$('#partList button').forEach(b => b.onclick = () => select(selected === b.dataset.part ? null : b.dataset.part, true));
}
const ghost = new THREE.MeshStandardMaterial({ color: '#8fa3b0', transparent: true, opacity: .09, depthWrite: false });
function select(id, focus) {
  selected = id;
  $$('#partList button').forEach(b => b.setAttribute('aria-pressed', b.dataset.part === id));
  const keep = new Set();
  if (id && parts[id]) parts[id].traverse(o => { if (o.isMesh) keep.add(o); });
  bike.traverse(o => { if (o.isMesh) o.material = !id || keep.has(o) ? o.userData.baseMat : ghost; });
  if (id && focus && parts[id]) {
    const bx = new THREE.Box3().setFromObject(parts[id]); const c = bx.getCenter(new THREE.Vector3());
    const r = Math.max(.18, bx.getSize(new THREE.Vector3()).length() * .9);
    const dir = camera.position.clone().sub(controls.target).normalize();
    fly(c.clone().add(dir.multiplyScalar(r * 2.2)), c);
  }
}
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObject(bike, true)[0];
  if (!hit) return null;
  let o = hit.object; while (o && !(o.userData && o.userData.part && TOP.includes(o.userData.part))) o = o.parent;
  return o ? o.userData.part : null;
}
let down = null;
canvas.addEventListener('pointerdown', e => down = [e.clientX, e.clientY]);
canvas.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const id = pick(e); select(id && id !== selected ? id : null, false); } down = null; });
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const id = pick(e), tip = $('#tip');
  tip.style.opacity = id ? 1 : 0; if (id) { tip.textContent = label(id); tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
  canvas.style.cursor = id ? 'pointer' : 'grab';
});

// ------------------------------------------------------------------ views, explode, turntable
const VIEWS = {
  side: [[0, 0, 3.2], [0, 0, 0]], hero: [[1.55, .75, 2.6], [0, 0, 0]],
  cockpit: [[1.25, .95, .9], [.45, .38, 0]], drivetrain: [[.1, .05, 1.35], [-.18, -.2, 0]],
};
let flight = null;
function fly(pos, tgt, instant) {
  if (instant || reduced) { camera.position.copy(pos); controls.target.copy(tgt); controls.update(); return; }
  flight = { t0: performance.now(), p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos, t1: tgt };
}
function view(name, instant) {
  const [p, t] = VIEWS[name];
  // In a phone's "Desktop view" the layout is ~980 px wide but the physical
  // screen is small — pull the camera back like a phone so the bike fits.
  const physicalPhone = Math.min(screen.width || 1e5, screen.height || 1e5) <= 500;
  const phoneish = physicalPhone || innerWidth < 820;
  const k = phoneish ? ((physicalPhone || innerWidth < 480) ? 1.9 : 1.45) : 1;
  fly(new THREE.Vector3(p[0], p[1], p[2]).multiplyScalar(k).add(centre), new THREE.Vector3(t[0], t[1], t[2]).add(centre), instant);
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === name));
}
$$('[data-view]').forEach(b => b.onclick = () => view(b.dataset.view));
let eT = 0, e = 0, spin = false;
$('#explode').oninput = ev => eT = +ev.target.value;
$('#spin').onclick = () => { spin = !spin; $('#spin').setAttribute('aria-pressed', spin); };

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05);
  if (flight) {
    const k = Math.min(1, (performance.now() - flight.t0) / 900), s = ease(k);
    camera.position.lerpVectors(flight.p0, flight.p1, s); controls.target.lerpVectors(flight.t0v, flight.t1, s);
    if (k >= 1) flight = null;
  }
  e += (eT - e) * (reduced ? 1 : Math.min(1, dt * 7));
  for (const x of explodables) x.node.position.copy(x.base).addScaledVector(x.vec, ease(Math.min(1, e)));
  if (spin && !flight) bike.rotation.y += dt * .25;
  controls.update(); renderer.render(scene, camera);
});
