// Heritage exhibit viewer: orbit, part picking, explode, reference-photo overlay, sourced profile.
// No aerodynamics or wind-tunnel features (those belong in their own change).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const profile = window.__PROFILE;
const $ = (s) => document.querySelector(s);
const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(2, 3, 2);
scene.add(key, new THREE.HemisphereLight(0xffffff, 0x888888, 0.5));
const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({ color: 0xdcdcde, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

function applyTheme() {
  const dark = document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  scene.background = new THREE.Color(dark ? 0x17181b : 0xeeeff1);
  floor.material.color.set(dark ? 0x222326 : 0xdcdcde);
}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

const parts = new Map();   // part id -> {objects, rest positions, explode}
let root;
new GLTFLoader().load(profile.glb, (g) => {
  root = g.scene;
  scene.add(root);
  root.traverse((o) => {
    const id = o.userData?.part;
    if (!id) return;
    // a child that repeats its parent's id is decorative; group under the first holder
    if (!parts.has(id)) parts.set(id, { objects: [], explode: o.userData.explode || [0, 0, 0] });
    parts.get(id).objects.push({ o, rest: o.position.clone() });
  });
  const box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  controls.target.copy(c);
  camera.position.set(c.x + 1.2, c.y + 0.55, c.z + 2.3);
  floor.position.y = box.min.y;
  buildPartList();
  $('#loading').hidden = true;
}, undefined, (e) => { $('#loading').textContent = 'Could not load the model: ' + e.message; });

function buildPartList() {
  const ul = $('#parts');
  const ids = [...parts.keys()].sort();
  for (const id of ids) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.textContent = (profile.parts?.[id]?.label) || id.replaceAll('_', ' ');
    b.onclick = () => select(id);
    li.append(b);
    ul.append(li);
  }
}

let selected = null;
const highlight = new THREE.Color(0xff6a00);
function select(id) {
  if (selected) for (const { o } of parts.get(selected).objects) o.traverse((m) => { if (m.isMesh && m.userData.__orig) { m.material = m.userData.__orig; delete m.userData.__orig; } });
  selected = selected === id ? null : id;
  const card = $('#partcard');
  if (!selected) { card.hidden = true; return; }
  for (const { o } of parts.get(selected).objects) o.traverse((m) => {
    if (m.isMesh) { m.userData.__orig = m.material; m.material = m.material.clone(); m.material.emissive = highlight; m.material.emissiveIntensity = 0.35; }
  });
  const info = profile.parts?.[selected] || {};
  card.hidden = false;
  card.querySelector('h3').textContent = info.label || selected.replaceAll('_', ' ');
  card.querySelector('.spec').textContent = info.spec || 'Not published';
  card.querySelector('.basis').textContent = info.basis || '';
}

const ray = new THREE.Raycaster();
canvas.addEventListener('click', (e) => {
  if (!root) return;
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObject(root, true)[0];
  if (!hit) return;
  let o = hit.object;
  while (o && !o.userData?.part) o = o.parent;
  if (o) select(o.userData.part);
});

$('#explode').addEventListener('input', (e) => {
  const k = +e.target.value;
  for (const [, p] of parts) {
    const [x, y, z] = p.explode;              // Blender XYZ (Z up) -> glTF (Y up, -Z = Blender +Y)
    for (const { o, rest } of p.objects) {
      if (o.parent && o.parent.userData?.part && o.parent !== root) continue;
      o.position.set(rest.x + x * k, rest.y + z * k, rest.z - y * k);
    }
  }
});

// reference photo overlay in an orthographic side view at the calibrated scale
const photoImg = $('#photo');
$('#sideview').addEventListener('click', () => {
  const c = controls.target;
  camera.position.set(c.x, c.y, c.z + 3.2);
  camera.lookAt(c);
});
$('#overlay').addEventListener('change', (e) => { photoImg.hidden = !e.target.checked; });

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
(function loop() { resize(); controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); })();
