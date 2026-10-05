import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createDirector } from '../src/hollow-director.js';
import { zoneOf, hollowWalkable, HHROOM, HHDOOR } from '../src/hollow-house.js';
import * as THREE from 'three';
import { shieldedChunks, createAtmosphere, GeoBatch, xf, createLightPool, drapeGeometry } from '../src/horrorkit.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const j = p => JSON.parse(read(p));
const landing = read('web/src/landing.js'), room = read('web/src/hollow-house.js'), kit = read('web/src/horrorkit.js'), surfaces = read('web/src/horrorkit-surfaces.js'), director = read('web/src/hollow-director.js');

// ---------------------------------------------------------------- architecture: a native room on the host, not a new runtime
test('Hollow House is a native room on the shared host, gated behind review', () => {
  assert.match(landing, /from '\.\/hollow-house\.js'/);
  assert.match(landing, /HOLLOW_REVIEW/);
  assert.match(landing, /reviewRoom'\) === 'hollow-house'/);
  assert.match(landing, /buildHollowHouse\(/);
  assert.match(read('web/src/entry.js'), /reviewRoom'\) === 'hollow-house'\) openMuseum\('hollow'\)/);
  const registry = j('museum/world/rooms.json');
  assert.equal((registry.areas || []).some(a => a.id === 'hollow' || JSON.stringify(a).includes('hollow-house')), false, 'a candidate room is not in the public registry');
});

test('room modules never create a renderer, camera, controls or environment', () => {
  for (const [name, src] of [['hollow-house', room], ['horrorkit', kit], ['horrorkit-surfaces', surfaces], ['hollow-director', director]])
    assert.doesNotMatch(src, /new\s+THREE\.WebGLRenderer|new\s+THREE\.PerspectiveCamera|new\s+OrbitControls|new\s+RoomEnvironment|new\s+WebGLRenderer/, name);
});

test('room exports the native-room contract and registers pickables and obstacles with the host', () => {
  assert.match(room, /export const HHROOM/);
  assert.match(room, /export const HHDOOR/);
  assert.match(room, /export function hollowWalkable/);
  assert.match(room, /export function buildHollowHouse/);
  assert.match(room, /group\.name = 'hollowHouseRoom'/);
  assert.match(room, /pickables\.push/);
  assert.match(room, /obstacles\.push/);
});

test('state and randomness: no storage keys, no Math.random in anything that is painted or placed', () => {
  for (const [name, src] of [['hollow-house', room], ['horrorkit', kit], ['horrorkit-surfaces', surfaces], ['hollow-director', director]]) {
    assert.doesNotMatch(src, /localStorage|sessionStorage|['"`](kona|speedmax)\.[a-z]/, name + ' must not own state');
    assert.doesNotMatch(src, /Math\.random/, name + ' must be deterministic');
  }
});

test('reuse: Lava Night and the Hollow House share one set of props', () => {
  const lava = read('web/src/halloween.js');
  for (const fn of ['makeSkeleton', 'pumpkinGeometry', 'cobwebPoints', 'makeBat']) { assert.match(lava, new RegExp(fn)); assert.match(kit, new RegExp('export (function|const) ' + fn)); }
  assert.match(room, /makeSkeleton/); assert.match(room, /cobwebPoints/);
  assert.match(room, /from '\.\/engine\/skins\.js'/);
  assert.doesNotMatch(lava, /new THREE\.CapsuleGeometry/, 'the skeleton is not copied back into Lava Night');
});

// ---------------------------------------------------------------- the lighting shield must really apply to this three
test('interior shield removes the sun, sky light and environment and keeps point lights', () => {
  const c = shieldedChunks();
  assert.doesNotMatch(c.lights, /directionalLights\[/); assert.doesNotMatch(c.lights, /getSunLightInfo/); assert.doesNotMatch(c.lights, /hemisphereLights/);
  assert.match(c.lights, /pointLights\[ i \]/);
  assert.match(c.lights, /uInteriorAmbient/); assert.doesNotMatch(c.lights, /getAmbientLightIrradiance\( ambientLightColor \)/);
  assert.match(c.env, /uInteriorEnv/); assert.doesNotMatch(c.env, /envMapIntensity/);
});

// ---------------------------------------------------------------- manifest + registry
test('Hollow House is a candidate child of a canonical room, with a validated package and reuse-first assets', () => {
  const m = j('world/konam/rooms/hollow-house.room.json');
  assert.equal(m.id, 'hollow-house');
  assert.equal(m.classification.status, 'candidate'); assert.equal(m.classification.public, false); assert.equal(m.release.public_wiring, false);
  assert.equal(m.implementation.kind, 'native-room'); assert.equal(m.implementation.module, 'web/src/hollow-house.js'); assert.equal('source_branch' in m.implementation, false);
  assert.ok(j('world/konam/rooms-v1.json').rooms.some(r => r.id === m.parent_room), 'parent is a canonical world room');
  assert.equal(m.assets.bike_pipeline, 'museum/bike.schema.json');
  assert.deepEqual(m.subjects, [], 'fiction: no real people');
  assert.equal(m.rights.real_people, false);
  assert.ok(m.release.required_gates.includes('content-safety'));
  const r = spawnSync(process.execPath, ['tools/validate-room-package.mjs', 'hollow-house'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const assets = j(m.assets.manifest);
  assert.ok(assets.assets.length >= 12);
  for (const a of assets.assets) { assert.ok(['REUSE', 'ADAPT', 'RESTYLE', 'COMPOSE', 'NEW'].includes(a.decision), a.asset_id); assert.ok(a.rights && a.lifecycle && a.source_ref, a.asset_id); }
  assert.equal(assets.assets.find(a => a.asset_id === 'hero-bike-speedmax-cfr').decision, 'REUSE');
  assert.equal(assets.constraints.real_person_likeness, false); assert.equal(assets.constraints.audio_files, false);
});

test('performance budgets are declared for every tier', () => {
  const p = j('world/konam/rooms/hollow-house.room.json').performance;
  for (const t of ['mobile', 'tablet', 'desktop']) for (const k of ['target_fps', 'max_room_draw_calls', 'max_room_triangles', 'max_texture_edge', 'max_dpr', 'particle_density', 'transmission', 'shadow_policy', 'lod_policy']) assert.ok(p[t][k] !== undefined, t + '.' + k);
  assert.ok(p.mobile.max_room_triangles < p.desktop.max_room_triangles + 1);
});

// ---------------------------------------------------------------- spatial truth
test('every walkable rect is inside the house, and zones tile the footprint', () => {
  const WALK = { x1: 6.4 };
  for (let x = HHROOM.x0 + .8; x < HHROOM.x1 - .6; x += .35) for (let z = HHROOM.z1 + .6; z < HHROOM.z0 - .6; z += .35) if (hollowWalkable(x, z, WALK)) assert.notEqual(zoneOf(x, z), 'out', `${x.toFixed(2)},${z.toFixed(2)} is walkable but outside every zone`);
  assert.equal(zoneOf(10, -38.4), 'foyer'); assert.equal(zoneOf(20, -38.4), 'corridor'); assert.equal(zoneOf(18, -34), 'parlor'); assert.equal(zoneOf(24, -34), 'nursery');
  assert.equal(zoneOf(18, -43), 'library'); assert.equal(zoneOf(24, -43), 'dining'); assert.equal(zoneOf(31, -40), 'cellar'); assert.equal(zoneOf(0, -38.4), 'out');
});

test('the way in is walkable from the hall and every room is reachable from the foyer', () => {
  const WALK = { x1: 6.4 }, mid = (HHDOOR.z0 + HHDOOR.z1) / 2;
  assert.ok(hollowWalkable(6.4, mid, WALK) && hollowWalkable(7.0, mid, WALK) && hollowWalkable(8.5, mid, WALK));
  // flood-fill the walkable grid from the doorway
  const step = .25, key = (x, z) => Math.round(x / step) + ',' + Math.round(z / step), seen = new Set(), q = [[8.5, mid]];
  while (q.length) { const [x, z] = q.pop(); const k = key(x, z); if (seen.has(k) || !hollowWalkable(x, z, WALK)) continue; seen.add(k); for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) q.push([x + dx, z + dz]); }
  for (const [name, x, z] of [['foyer', 10, -35], ['corridor', 21, -38.4], ['parlor', 18, -33], ['nursery', 24, -33], ['library', 18, -44], ['dining', 24, -44], ['cellar', 31, -40], ['bike', 29.5, -41.2]]) assert.ok(seen.has(key(x, z)), name + ' is not reachable on foot');
});

// ---------------------------------------------------------------- the director holds the house rules
const LODGER = [[16.2, -38.4], [17.4, -38.4], [18.8, -38.4], [20.4, -38.4], [22.2, -38.4], [24.2, -38.4], [26.2, -38.4]];
const mk = () => createDirector({ zoneOf, lodgerPath: LODGER, bikePos: [31.4, -41.2], sconces: 6 });
const yawToward = (P, x, z) => Math.atan2(-(x - P.x), -(z - P.z));
function run(dir, seconds, P, reduce, onFrame, dt = 1 / 30, t0 = 0) { const frames = []; for (let t = t0; t < t0 + seconds; t += dt) { const o = dir.update(t, dt, P, reduce); frames.push(o); onFrame?.(o, t, P); } return frames; }

test('outside the house the director is inert', () => {
  const d = mk(), P = { x: 0, z: -38.4, yaw: 0 };
  for (const o of run(d, 120, P, false)) { assert.equal(o.inside, false); assert.equal(o.flash, 0); assert.equal(o.cues.length, 0); assert.equal(o.lodger, null); }
});

test('lightning is soft and rare: slow attack, never faster than one flash every 13 s', () => {
  const d = mk(), P = { x: 9, z: -38.4, yaw: 0 }, starts = []; let prev = 0, maxJump = 0;
  run(d, 900, P, false, o => { for (const c of o.cues) if (c.name === 'flash') starts.push(0); maxJump = Math.max(maxJump, Math.abs(o.flash - prev)); prev = o.flash; });
  assert.ok(starts.length > 10, 'storm should actually happen');
  const times = []; const d2 = mk(); let t = 0; run(d2, 900, P, false, (o, tt) => { if (o.cues.some(c => c.name === 'flash')) times.push(tt); });
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= d.FLASH_GAP - .01, 'flashes too close: ' + (times[i] - times[i - 1]));
  assert.ok(maxJump <= 1 / 30 / .09 + .05, 'flash attack too abrupt (strobe): ' + maxJump);
});

test('reduced motion: stillness only (no lightning, flicker, blackout, door slam, rocking or movement)', () => {
  const d = mk(), P = { x: 9, z: -38.4, yaw: 0 };
  for (const [x, z] of [[9, -38.4], [16, -38.4], [22, -38.4], [22, -34], [18, -43], [31, -41.2]]) {
    P.x = x; P.z = z;
    for (const o of run(d, 40, P, true)) { assert.equal(o.flash, 0); assert.equal(o.blackout, false); assert.equal(o.doorClosed, false); assert.equal(o.rock, 0); assert.equal(o.level.all, 1); assert.ok(o.level.sconce.every(v => v === 1)); assert.ok(!o.cues.some(c => ['flash', 'thunder', 'slam', 'stinger'].includes(c.name))); }
  }
});

test('the Lodger only moves while it is out of view, and never comes closer than the standoff', () => {
  const d = mk(), P = { x: 15.4, z: -38.4, yaw: 0 };
  run(d, 8, { x: 9, z: -38.4, yaw: 0 }, false);                                  // be in the foyer first
  let last = null, moves = 0, minDist = 99, movedWhileWatched = 0;
  run(d, 120, P, false, (o, t) => {
    P.yaw = Math.floor(t / 7) % 2 ? Math.PI : yawToward(P, 26, -38.4);          // alternate: stare down the corridor, then turn away
    if (!o.lodger) { last = null; return; }
    minDist = Math.min(minDist, Math.hypot(o.lodger.x - P.x, o.lodger.z - P.z));
    if (last && (last.x !== o.lodger.x)) { moves++; const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), dx = last.x - P.x, dz = last.z - P.z, cos = (dx * fx + dz * fz) / Math.hypot(dx, dz); if (cos > Math.cos(.95) && Math.hypot(dx, dz) < 16 && !o.blackout) movedWhileWatched++; }
    last = { x: o.lodger.x, z: o.lodger.z };
  });
  assert.ok(moves > 0, 'it should advance when unseen');
  assert.equal(movedWhileWatched, 0, 'it moved while the visitor was looking at it');
  assert.ok(minDist >= d.STANDOFF - .01, 'came closer than the standoff: ' + minDist);
});

test('the front door shuts behind the visitor but lets them leave: nothing traps', () => {
  const d = mk(), P = { x: 8.4, z: -38.4, yaw: 0 };
  run(d, 1, P, false); P.x = 11;
  let closed = false; run(d, 3, P, false, o => { closed ||= o.doorClosed; });
  assert.ok(closed, 'the door should close once');
  P.x = 8.6; run(d, 8, P, false, o => { }); const after = run(d, 1, P, false);
  assert.equal(after[after.length - 1].doorClosed, false, 'the door must open again as the visitor returns to it');
  for (const o of run(d, 5, { x: 12, z: -38.4, yaw: 0 }, false)) assert.ok(hollowWalkable(7.9, -38.4, { x1: 6.4 }) && o.zone === 'foyer');   // the doorway itself is never blocked
});

test('the cellar: the lights go for a few seconds, come back, and the way out is lit', () => {
  const d = mk(); let t = 0;
  run(d, 2, { x: 9, z: -38.4, yaw: 0 }, false); run(d, 6, { x: 20, z: -38.4, yaw: 0 }, false, undefined, 1 / 30, 2);
  const P = { x: 30.4, z: -41.2, yaw: 0 };
  const frames = run(d, 14, P, false, undefined, 1 / 30, 8);
  assert.ok(frames.some(o => o.cues.some(c => c.name === 'stinger')), 'stinger');
  assert.equal(frames.filter(o => o.cues.some(c => c.name === 'stinger')).length, 1, 'only once');
  assert.ok(frames.some(o => o.level.all < .05), 'lights out');
  assert.ok(frames.some(o => o.level.all === 1 && frames.indexOf(o) > 30), 'lights return');
  const dark = frames.filter(o => o.level.all < .5).length / 30; assert.ok(dark < 5.5, 'blackout too long: ' + dark);
  assert.ok(frames[frames.length - 1].level.all === 1);
});

test('the director is deterministic', () => {
  const trace = () => { const d = mk(), out = []; run(d, 90, { x: 10, z: -38.4, yaw: 0 }, false, o => out.push(o.flash.toFixed(4) + o.zone)); return out.join('|'); };
  assert.equal(trace(), trace());
});

// ---------------------------------------------------------------- the shared primitives
test('atmosphere hands the hall its fog back, exactly, however the visitor leaves', () => {
  const scene = { fog: new THREE.Fog('#e6eef0', 70, 420) }, atmo = createAtmosphere(scene);
  const before = { c: scene.fog.color.getHexString(), n: scene.fog.near, f: scene.fog.far };
  for (let i = 0; i < 90; i++) atmo.update(1 / 30, true);
  assert.notEqual(scene.fog.color.getHexString(), before.c); assert.ok(scene.fog.far < 40, 'dark close fog inside');
  for (let i = 0; i < 6; i++) atmo.update(1 / 30, false);                                          // leaves, then the room is culled mid-fade...
  atmo.update(10, false);                                                                          // ...and the host calls hide()
  assert.deepEqual({ c: scene.fog.color.getHexString(), n: scene.fog.near, f: scene.fog.far }, before);
});

test('GeoBatch merges per material and maps textures in world metres', () => {
  const b = new GeoBatch(), m = { a: new THREE.MeshBasicMaterial(), b: new THREE.MeshBasicMaterial() }, root = new THREE.Group();
  b.box('a', 2, 2, 2, xf(0, 1, 0), 1); b.box('a', 1, 1, 1, xf(5, .5, 0), 1); b.box('b', 1, 1, 1, xf(9, .5, 0), 1);
  const out = b.build(m, root);
  assert.equal(root.children.length, 2, 'two materials, two draws');
  assert.equal(out.a.geometry.attributes.position.count, 2 * 36);
  const uv = out.b.geometry.attributes.uv, pos = out.b.geometry.attributes.position;       // a 1 m box face spans exactly 1 uv unit on its axes
  let spanX = 0; for (let i = 0; i < pos.count; i++) spanX = Math.max(spanX, Math.abs(uv.getX(i) - uv.getX(0)));
  assert.ok(spanX >= .99 && spanX <= 9.6, 'uv are in metres, not 0..1 per face');
  assert.throws(() => { const c = new GeoBatch(); c.box('nope', 1, 1, 1); c.build(m, root); }, /no material/);
});

test('the light pool never exceeds its budget and fades instead of popping', () => {
  const group = new THREE.Group(), pool = createLightPool({ parent: group, count: 3 });
  for (let i = 0; i < 20; i++) pool.add({ x: i * 2, z: 0, base: 5, flicker: i % 2 ? 'candle' : 'bulb' });
  let prev = null, maxStep = 0;
  for (let f = 0; f < 240; f++) {
    pool.update(f * .1, 0, 1 / 60, 1, f / 60, false);                                           // the visitor walks past all of them
    const total = group.children.reduce((a, l) => a + l.intensity, 0);
    assert.equal(group.children.length, 3, 'a fixed number of real lights');
    if (prev !== null) maxStep = Math.max(maxStep, Math.abs(total - prev)); prev = total;
  }
  assert.ok(maxStep < 4, 'light changed abruptly: ' + maxStep);
  pool.update(0, 0, 1 / 60, 0, 0, false); assert.ok(group.children.every(l => l.intensity === 0), 'master off puts every light out');
});

test('dust sheets are deterministic and rise over their furniture', () => {
  const a = drapeGeometry([[0, 0, 1, 1, .8]]), b = drapeGeometry([[0, 0, 1, 1, .8]]);
  assert.deepEqual([...a.attributes.position.array.slice(0, 300)], [...b.attributes.position.array.slice(0, 300)]);
  a.computeBoundingBox(); assert.ok(a.boundingBox.max.y > .75 && a.boundingBox.max.y < 1.0); assert.equal(a.boundingBox.min.y, 0);
});

// ---------------------------------------------------------------- the haunt audio bed and cues run (no audio device needed)
test('haunt sound bed and every director cue construct and fire against a WebAudio mock', async () => {
  const { createRoomSound } = await import('../src/roomSound.js');
  const param = () => ({ value: 0, setValueAtTime() { }, linearRampToValueAtTime() { }, exponentialRampToValueAtTime() { }, setTargetAtTime() { } });
  const node = () => { const n = { connect: x => x, start() { }, stop() { }, frequency: param(), gain: param(), Q: param(), type: '', buffer: null, loop: false }; return n; };
  const ctx = { currentTime: 0, sampleRate: 8000, state: 'running', destination: node(), createBuffer: (c, len) => ({ getChannelData: () => new Float32Array(len) }), createBufferSource: node, createOscillator: node, createGain: node, createBiquadFilter: node };
  const rs = createRoomSound(ctx, node());
  try {
    rs.set('haunt');
    const cues = ['slam', 'thunder', 'whisper', 'drip', 'thud', 'flicker', 'musicbox', 'stinger', 'heartbeat', 'run'];
    for (const c of cues) assert.doesNotThrow(() => rs.cue(c, .1), c);
    assert.doesNotThrow(() => rs.cue('not-a-cue'));
    rs.set(null); assert.doesNotThrow(() => rs.cue('slam'), 'cues are ignored when the haunt bed is not the active room');
  } finally { rs.stop(); }
  for (const c of ['slam', 'thunder', 'whisper', 'musicbox', 'stinger', 'heartbeat', 'run', 'thud', 'flicker', 'drip']) assert.match(read('web/src/roomSound.js'), new RegExp(c + ':'));
  assert.doesNotMatch(read('web/src/roomSound.js'), /new Audio\(|\.mp3|\.ogg|\.wav|fetch\(/, 'synthesised only: no audio files');
});
