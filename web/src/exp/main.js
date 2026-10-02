// Experiences.html — #lava · #camp13 · #tunnel (the night experiences) · #history (History Lane)
import * as THREE from 'three';
import { createStage, orbit, rail, loadSpeedmax, canyonLocale, canyonSearch, ambience, coarse, lite } from './engine.js';
import { NIGHTS, NIGHT_LIST } from './nights.js';
import { buildHistory } from './history.js';
import { createPassport } from '../passport.js';

const D = window.__EXP;                                               // parts sheet, history, Canyon links (inlined by the build)
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const passport = createPassport();
const loc = canyonLocale(D.locales);
const route = (location.hash.slice(1) || 'lava').toLowerCase();
const mode = route === 'history' ? 'history' : NIGHTS[route] ? route : 'lava';

// ---- chrome shared by every experience
const MODES = [...NIGHT_LIST, ['history', 'History Lane', '📜']];
$('switch').innerHTML = MODES.map(([id, name, icon]) => `<a class="chip${id === mode ? ' on' : ''}" href="#${id}" data-id="${id}"><span>${icon}</span>${esc(name)}</a>`).join('');
$('switch').addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); if (a.dataset.id !== mode) { location.hash = a.dataset.id; location.reload(); } });
$('ppBtn').onclick = () => passport.open();
function card(html, actions = '') { $('cBody').innerHTML = html; $('cActs').innerHTML = actions; $('card').classList.add('on'); }
$('cClose').onclick = () => $('card').classList.remove('on');
function tutorial(key, steps) {
  try { if (localStorage.getItem(key)) return; } catch (_) { }
  let i = 0; const el = $('tut');
  const show = () => { if (i >= steps.length) { el.hidden = true; try { localStorage.setItem(key, '1'); } catch (_) { } return; } el.querySelector('b').textContent = steps[i][0]; el.querySelector('small').textContent = steps[i][1]; el.querySelector('i').textContent = `${i + 1} / ${steps.length}`; el.hidden = false; };
  el.querySelector('button').onclick = () => { i++; show(); }; setTimeout(show, 800);
}
const canvas = $('stage');
const stage = createStage(canvas);
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pickAt = (x, y, list) => { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, stage.camera); return ray.intersectObjects(list, true)[0] || null; };
let soundOn = false;

if (mode === 'history') runHistory(); else runNight(NIGHTS[mode]);

// =================================================================== the night experiences
async function runNight(build) {
  const T = build(stage);
  document.documentElement.style.setProperty('--accent', T.accent); document.body.dataset.theme = T.id;
  $('eyebrow').textContent = T.eyebrow; $('title').textContent = T.name;
  const spin = new THREE.Group(); spin.position.y = T.table.userData.top; T.table.add(spin);
  const cam = orbit(stage, canvas, { ...T.camera, rMin: 1.8 }, tap);
  // hotspots are invisible spheres: tap to read
  const hotMeshes = T.hotspots.map(h => { const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(...h.pos); m.userData.hot = h; stage.scene.add(m); return m; });
  const findMeshes = []; T.finds.forEach(f => { f.obj.traverse(o => { o.userData.find = f; }); findMeshes.push(f.obj); if (passport.has(`find:${T.id}:${f.id}`)) f.obj.visible = false; });
  const found = () => T.finds.filter(f => passport.has(`find:${T.id}:${f.id}`)).length;
  const updFinds = () => { $('finds').textContent = `🗝️ ${found()}/${T.finds.length}`; };
  updFinds();
  const snd = ambience(T.audio);
  $('soundBtn').onclick = () => { soundOn = !soundOn; $('soundBtn').setAttribute('aria-pressed', soundOn); snd.toggle(soundOn); };
  let bike = null;
  stage.onFrame((dt, t) => { T.update(dt, t, stage.camera); bike?.update(dt); if (bike && bike.exT === 0 && !cam.fly) spin.rotation.y += dt * .12; sparkles(dt); });
  $('loading').querySelector('span').textContent = 'Wheeling out the Speedmax…';
  bike = await loadSpeedmax(D.glb, { livery: m => T.paint(m) });
  spin.add(bike.holder); bike.holder.rotation.y = Math.PI / 2;
  $('loading').classList.add('off');
  passport.stamp(`night:${T.id}`, T.name, 20);
  const story = () => card(`<div class="eb">${esc(T.eyebrow)}</div><h2>${esc(T.name)}</h2><p>${esc(T.story)}</p><p class="mut">${esc(T.livery)}.</p>
    <div class="stats">${D.stats.map(([b, s]) => `<div><b>${esc(b)}</b><small>${esc(s)}</small></div>`).join('')}</div>
    <p class="mut">Three objects are hidden in this scene. Find them for your passport.</p>`,
    `<button class="btn primary" id="aEx">Explode the bike</button><a class="btn" href="${esc(D.studio)}">3D studio →</a><a class="btn" href="${esc(D.product.replace('{loc}', loc))}" target="_blank" rel="noopener">Canyon.com ↗</a>`);
  story(); $('aEx').onclick = explodeToggle;
  $('storyBtn').onclick = () => { story(); $('aEx').onclick = explodeToggle; };
  $('exBtn').onclick = explodeToggle;
  function explodeToggle() { const on = bike.exT === 0; bike.setExploded(on); $('exBtn').setAttribute('aria-pressed', on); $('exBtn').textContent = on ? 'Assemble' : 'Explode';
    cam.fly = { target: new THREE.Vector3(0, on ? 1.1 : .95, 0), r: on ? 5.4 : T.camera.r }; if (on) toast('Tap any part to read about it'); $('card').classList.remove('on'); }
  function tap(x, y) {
    const hit = pickAt(x, y, [...findMeshes.filter(o => o.visible), ...bike.meshes, ...hotMeshes]); if (!hit) return;
    let o = hit.object; const f = o.userData.find; if (f) return collect(f);
    if (o.userData.hot) { const h = o.userData.hot; return card(`<div class="eb">${esc(T.name)}</div><h2>${esc(h.title)}</h2><p>${esc(h.text)}</p>`); }
    const id = bike.partOf(o);
    if (!id) return;
    if (bike.exT === 0) { toast('Explode the bike to read its parts'); return; }
    openPart(id);
  }
  function collect(f) {
    const key = `find:${T.id}:${f.id}`; passport.stamp(key, f.label, 30); f.obj.visible = false; burst(f.obj.getWorldPosition(new THREE.Vector3()), T.accent); updFinds();
    card(`<div class="eb">Found · ${found()} of ${T.finds.length}</div><h2>${esc(f.label)}</h2><p>${esc(f.text)}</p>`, found() === T.finds.length ? `<a class="btn primary" href="#${MODES[(MODES.findIndex(m => m[0] === T.id) + 1) % MODES.length][0]}" onclick="setTimeout(()=>location.reload(),0)">Next experience →</a>` : '');
  }
  tutorial('speedmax.exp.tut.v1', coarse
    ? [['Drag to walk around the bike', 'Pinch to come closer'], ['Tap “Explode”', 'then tap any part: specs, and where Canyon sells it'], ['Three objects are hidden', 'Find them for your passport']]
    : [['Drag to orbit · scroll to zoom', 'The bike turns on its own when you let go'], ['Explode, then click a part', 'Specs, weights and a link to Canyon'], ['Three objects are hidden', 'Find them for your passport']]);
}
function openPart(id) {
  const p = D.parts[id]; if (!p) return;
  passport.stamp(`part:${id}`, p.name, 5);
  card(`<div class="eb">Part · ${esc(p.group || '')}</div><h2>${esc(p.name)}</h2>${p.spec ? `<p class="spec">${esc(p.spec)}</p>` : ''}${p.weight ? `<p class="mut">${esc(p.weight)} g · manufacturer weight</p>` : ''}${p.note ? `<p>${esc(p.note)}</p>` : ''}
    <p class="mut">The link opens Canyon’s own site search for this part; availability depends on your country.</p>`,
    `<a class="btn primary" href="${esc(canyonSearch(loc, p.query || p.name))}" target="_blank" rel="noopener">Find at Canyon ↗</a><a class="btn" href="${esc(D.studio)}">Open in 3D studio</a>`);
}

// =================================================================== History Lane
function runHistory() {
  document.body.dataset.theme = 'history'; document.documentElement.style.setProperty('--accent', '#8a5a14');
  $('eyebrow').textContent = 'Koblenz · 1985 — today'; $('title').textContent = 'History Lane';
  $('exBtn').hidden = true; $('finds').hidden = true;
  const H = buildHistory(stage, D.history);
  const pts = [new THREE.Vector3(0, 0, 6), new THREE.Vector3(.6, 0, H.zEnd * .33), new THREE.Vector3(-.6, 0, H.zEnd * .66), new THREE.Vector3(0, 0, H.zEnd - 2)];
  const curve = new THREE.CatmullRomCurve3(pts);
  H.stations.forEach(s => { s.t = Math.min(1, Math.max(0, (6 - s.pos.z) / (6 - (H.zEnd - 2)))); });
  let near = null;
  const R = rail(stage, canvas, curve, (t, out, p, q) => {
    // look ahead down the lane, turning toward the chapter you are passing
    let best = null, bd = 1e9; for (const s of H.stations) { const d = Math.abs(s.pos.z - p.z + 1.6); if (d < bd) { bd = d; best = s; } }
    const w = Math.max(0, 1 - bd / 3.2) * .85;
    out.set(q.x + (best ? best.pos.x * w : 0), 1.45, q.z - 3); if (best && w > .45) out.set(best.pos.x * .9 + q.x * .1, 1.5, best.pos.z);
    near = w > .5 ? best : null;
  }, (x, y) => { const hit = pickAt(x, y, [...H.pickables, ...(bike?.meshes || [])]); if (!hit) return; const c = hit.object.userData.chapter; if (c) return openChapter(c); if (bike && hit.object) { const id = bike.partOf(hit.object); if (id) openPart(id); } },
  t => { $('prog').style.setProperty('--p', t); const y = near ? near.year : ''; if ($('prog').dataset.y !== y) { $('prog').dataset.y = y; $('progY').textContent = y; } });
  function openChapter(c) {
    passport.stamp(`history:${c.year}`, `${c.year} · ${c.title}`, 10);
    const cv = c.canvas && D.history.canvases.find(x => x.id === c.canvas);
    card(`<div class="eb">History Lane · ${esc(c.year)}</div><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p>
      ${cv ? `<figure><img src="${esc(D.history.dir)}/${esc(cv.id)}.jpg" alt="${esc(cv.caption)}"><figcaption>${esc(cv.caption)} · painted from <a href="${esc(cv.source.page)}" target="_blank" rel="noopener">© ${esc(cv.source.author)} · ${esc(cv.source.license)} ↗</a></figcaption></figure>` : ''}
      ${c.kind === 'sculpture' ? '<p class="mut">An abstract bronze tribute made for the museum — not a likeness.</p>' : ''}
      <p class="src">${c.sources.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Source ${i + 1} ↗</a>`).join(' · ')}</p>`,
      `${c.index + 1 < H.stations.length ? '<button class="btn primary" id="aNext">Walk on →</button>' : ''}`);
    $('aNext') && ($('aNext').onclick = () => { R.want = H.stations[c.index + 1].t; $('card').classList.remove('on'); });
  }
  $('storyBtn').onclick = () => card(`<div class="eb">History Lane</div><h2>From a trailer to Kona</h2><p>${esc(D.history.note)}</p><p class="mut">Drag up or scroll to walk. Tap any chapter.</p>`);
  let bike = null;
  loadSpeedmax(D.glb).then(b => { bike = b; b.holder.position.copy(H.bikeSpot); b.holder.rotation.y = Math.PI / 2; stage.scene.add(b.holder); });
  $('loading').classList.add('off');
  passport.stamp('room:history', 'History Lane', 15);
  $('soundBtn').hidden = true;
  tutorial('speedmax.hist.tut.v1', [[coarse ? 'Drag up to walk down the lane' : 'Scroll or drag up to walk', 'Drag sideways to look around'], ['Tap a chapter', 'Photographs, dates and sources'], ['At the end of the lane', 'today’s Speedmax — tap its parts']]);
}

// ---- small effects and toasts
const sparks = [];
function burst(p, color) {
  const n = 40, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) { pos.set([p.x, p.y + .1, p.z], i * 3); vel.push(new THREE.Vector3((Math.random() - .5) * 2, Math.random() * 2.2, (Math.random() - .5) * 2)); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color, size: .06, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); stage.scene.add(m); sparks.push({ m, vel, life: 1.2 });
}
function sparkles(dt) { for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; const p = s.m.geometry.attributes.position; s.vel.forEach((v, k) => { v.y -= dt * 2.5; p.setXYZ(k, p.getX(k) + v.x * dt, p.getY(k) + v.y * dt, p.getZ(k) + v.z * dt); }); p.needsUpdate = true; s.m.material.opacity = Math.max(0, s.life); if (s.life <= 0) { stage.scene.remove(s.m); s.m.geometry.dispose(); sparks.splice(i, 1); } } }
let tt; function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 3200); }
window.__exp = { stage, passport, mode, lite };
