// engine/wing.js — builds museum wings from data (museum/world/wings/*.json).
//
// A wing is a corridor with rooms either side. Everything about it — outline, doors, room colours,
// which bikes, paintings, sculptures, plates and features it holds — comes from the wing file and the
// catalogues (museum/atlas/bikes.json, museum/art/*.json). This module turns that into geometry,
// walkable space, pick targets and one update loop. Nothing here names a particular room.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { decorateRoom } from './decoration-props.js';
import { rng } from '../roomkit.js';
import { slotsOf, applySkin as paintBike } from './skins.js';

// ---------------------------------------------------------------- geometry helpers (pure, testable)
export const sideRect = (wing, r) => ({ x0: wing.sides[r.side].x0, x1: wing.sides[r.side].x1, z0: r.z0, z1: r.z1 });
const inRect = (q, x, z, m = 0) => x > q.x0 + m && x < q.x1 - m && z > q.z0 + m && z < q.z1 - m;

/** Can a visitor stand at (x, z) in this wing? Corridor, doorways and rooms (rooms open onto the corridor). */
export function wingWalkable(w, x, z) {
  const c = w.corridor, ds = w.doors?.south, dn = w.doors?.north;
  const inDoorX = d => d && x > d.x0 + .3 && x < d.x1 - .3;
  if (ds && inDoorX(ds) && z > c.z0 - .7 && z < c.z0 + .6) return true;
  if (dn && inDoorX(dn) && z > c.z1 - .6 && z < c.z1 + .7) return true;
  if (x > c.x0 && x < c.x1 && z > c.z0 + .3 && z < c.z1 - .4) return true;
  return w.rooms.some(r => {
    const q = sideRect(w, r);
    return x > q.x0 + (r.side === 'west' ? .45 : -.1) && x < q.x1 - (r.side === 'east' ? .45 : -.1) && z > q.z0 + .45 && z < q.z1 - .45;
  });
}
export function wingContains(w, x, z) {
  const c = w.corridor;
  return x > w.sides.west.x0 && x < w.sides.east.x1 && z > c.z0 - (w.doors?.south?.depth ? .7 : 0) && z < c.z1;
}
export function wingRoomAt(w, x, z) { return w.rooms.find(r => { const q = sideRect(w, r); return x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1; }) || null; }

/** Where exhibits go in a room: bikes on plinths, paintings on walls, sculptures on the floor. Pure. */
export function layoutRoom(w, r, nBikes, paintings, nSculptures) {
  const q = sideRect(w, r), depth = q.x1 - q.x0, face = r.side === 'east' ? -1 : 1, cz = (q.z0 + q.z1) / 2;
  const fromOpen = f => (face < 0 ? q.x0 + depth * f : q.x1 - depth * f);
  const back = face < 0 ? q.x1 : q.x0;
  const along = [[], [.5], [.36, .7], [.3, .55, .8]][Math.min(3, nBikes)] || [];
  const zoffs = [[], [0], [-1.25, 1.25], [-1.45, 1.2, -.5]][Math.min(3, nBikes)] || [];
  const bikes = along.map((f, k) => ({ x: fromOpen(f), z: cz + zoffs[k], zoff: zoffs[k] }));
  // sculptures: in the open floor; with bikes, between the opening and the first bike
  const sculptures = Array.from({ length: nSculptures }, (_, k) => nBikes ? { x: fromOpen(.16), z: cz + (k ? 1.6 : -1.6) * (nSculptures > 1 ? 1 : 0) } : { x: fromOpen(.52), z: cz + (nSculptures > 1 ? (k ? 1.5 : -1.5) : 0) });
  // paintings: back wall first when no bikes (their photos hang there), then the side walls
  const slots = [];
  const backSlots = nBikes ? [] : (paintings.length === 1 ? [0] : [-1.75, 1.75]);
  for (const zz of backSlots) slots.push({ wall: 'back', x: back + face * .09, z: cz + zz, ry: face > 0 ? Math.PI / 2 : -Math.PI / 2 });
  for (const f of [.62, .34]) for (const wall of ['south', 'north']) slots.push({ wall, x: fromOpen(f), z: wall === 'south' ? q.z0 + .12 : q.z1 - .12, ry: wall === 'south' ? 0 : Math.PI });
  return { q, depth, face, back, cz, bikes, sculptures, paintings: paintings.map((p, i) => ({ ...slots[i], id: p })).filter(s => s.wall) };
}

// ---------------------------------------------------------------- surfaces
function planks(base, seam, seed, lanes = false) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16; i++) {
    const x = i * 32; const l = (r() - .5) * 26;
    g.fillStyle = `rgba(${l > 0 ? '255,240,220' : '60,30,10'},${Math.abs(l) / 260})`; g.fillRect(x, 0, 32, 512);
    g.fillStyle = seam; g.globalAlpha = .5; g.fillRect(x, 0, 1.5, 512);
    const cut = r() * 512; g.fillRect(x, cut, 32, 1.5); g.globalAlpha = 1;
    for (let k = 0; k < 18; k++) { g.strokeStyle = `rgba(90,50,20,${.04 + r() * .06})`; g.beginPath(); const y = r() * 512; g.moveTo(x + 2, y); g.bezierCurveTo(x + 10, y + 30, x + 22, y - 20, x + 30, y + 40); g.stroke(); }
  }
  if (lanes) { g.fillStyle = '#12181d'; g.fillRect(150, 0, 7, 512); g.fillStyle = '#c8161d'; g.fillRect(300, 0, 7, 512); g.fillStyle = '#1d4fd6'; g.globalAlpha = .85; g.fillRect(0, 0, 44, 512); g.globalAlpha = 1; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function washTex() {                                                 // a picture light's pool on the wall
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 40, 4, 64, 64, 64); r.addColorStop(0, 'rgba(255,244,224,.9)'); r.addColorStop(1, 'rgba(255,244,224,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function clockFace() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#fbf9f5'; g.beginPath(); g.arc(512, 512, 500, 0, 6.29); g.fill(); g.strokeStyle = '#12181d'; g.lineWidth = 18; g.stroke();
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2, big = i % 5 === 0; g.lineWidth = big ? 16 : 5; g.strokeStyle = big ? '#12181d' : '#5f6a72';
    g.beginPath(); g.moveTo(512 + Math.sin(a) * (big ? 400 : 440), 512 - Math.cos(a) * (big ? 400 : 440)); g.lineTo(512 + Math.sin(a) * 470, 512 - Math.cos(a) * 470); g.stroke();
  }
  g.fillStyle = '#c8161d'; g.font = '700 54px Manrope, sans-serif'; g.textAlign = 'center'; g.fillText('AGAINST THE CLOCK', 512, 330);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a GLB made cheap: one mesh per material
function compact(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    (byMat.get(o.material) || byMat.set(o.material, []).get(o.material)).push(g.index ? g.toNonIndexed() : g);
  });
  const out = new THREE.Group();
  for (const [m, gs] of byMat) { const merged = mergeGeometries(gs, false); if (merged) { const mesh = new THREE.Mesh(merged, m.clone()); mesh.name = m.name; out.add(mesh); } }
  return out;
}

export function applySkin(inst, skin) { if (!inst?.paint || !skin) return; paintBike(inst.paint, skin); inst.skin = skin; }

// ---------------------------------------------------------------- the builder
export function buildWings(ctx, { wings, bikes: BIKES = [], extraRefs = [], paintings: PAINT = [], sculptures: SCULPT = [] }) {
  const { scene, lettering, FONT, SERIF, lite, pickables, obstacles, contactShadow } = ctx;
  const group = new THREE.Group(); group.name = 'wings'; scene.add(group);
  const floors = [], allRooms = [], bikes = [], paintings = [], sculptures = [], swatches = [], hands = [];
  const texLoader = new THREE.TextureLoader();
  const plaster = new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: .92 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: .6 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: .55, metalness: .2 });
  const whitePlinth = new THREE.MeshStandardMaterial({ color: '#f4efe7', roughness: .5 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1c1916', roughness: .5 });
  const wash = washTex();
  const paintingById = Object.fromEntries(PAINT.map(p => [p.id, p])), sculptById = Object.fromEntries(SCULPT.map(s => [s.id, s]));
  let show = null;

  for (const w of wings) {
    const Y = w.y, H = w.height, c = w.corridor, E = w.sides.east, W = w.sides.west;
    const at = (m, x, y, z) => { m.position.set(x, y, z); group.add(m); return m; };
    const box = (bw, bh, bd, x, y, z, mat) => at(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat), x, y, z);
    const cx = (c.x0 + c.x1) / 2, len = c.z1 - c.z0;

    // corridor floor, ceiling, skylights
    const floorTex = c.style === 'velodrome' ? planks('#c89b62', '#6b4520', 3, true) : planks('#e2d3b8', '#a38b66', 17);
    floorTex.repeat.set(1, len / 5.6);
    const corMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: c.style === 'velodrome' ? .42 : .5 });
    const cor = box(c.x1 - c.x0, .12, len, cx, Y - .06, (c.z0 + c.z1) / 2, corMat); cor.userData.floor = true; floors.push(cor); pickables.push(cor);
    const ds = w.doors?.south, dn = w.doors?.north;
    if (ds?.depth) { const d = box(ds.x1 - ds.x0, .12, ds.depth, (ds.x0 + ds.x1) / 2, Y - .065, c.z0 - ds.depth / 4, corMat); d.userData.floor = true; floors.push(d); }
    box(E.x1 - W.x0, .12, len, (W.x0 + E.x1) / 2, Y + H + .06, (c.z0 + c.z1) / 2, plaster);
    const sky = new THREE.MeshBasicMaterial({ color: '#fff8ea' });
    const shaftMat = new THREE.MeshBasicMaterial({ color: '#fff1d6', transparent: true, opacity: .022, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const poolMat = new THREE.MeshBasicMaterial({ color: '#ffe8c4', transparent: true, opacity: .07, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let z = c.z0 + 2; z < c.z1 - 1; z += 4) {
      box(2.4, .02, 2.6, cx, Y + H - .01, z, sky);
      const sh = new THREE.Mesh(new THREE.BoxGeometry(2.3, H, 2.5), shaftMat); sh.geometry.translate(0, -H / 2, 0);
      sh.position.set(cx + .35, Y + H, z + .5); sh.rotation.z = -.14; sh.rotation.x = .12; group.add(sh);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.8), poolMat); pl.rotation.x = -Math.PI / 2; at(pl, cx + .9, Y + .014, z + 1);
    }
    if (c.style !== 'velodrome') {                                    // a runner down the gallery corridor
      const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, len - .8), new THREE.MeshStandardMaterial({ color: '#8a3b28', roughness: .95 }));
      runner.rotation.x = -Math.PI / 2; at(runner, cx, Y + .008, (c.z0 + c.z1) / 2);
    }

    // outer walls; the north wall has a doorway when the next wing continues
    box(.2, H, len, E.x1, Y + H / 2, (c.z0 + c.z1) / 2, plaster);
    box(.2, H, len, W.x0, Y + H / 2, (c.z0 + c.z1) / 2, plaster);
    if (dn) {
      box(dn.x0 - W.x0, H, .2, (W.x0 + dn.x0) / 2, Y + H / 2, c.z1, plaster);
      box(E.x1 - dn.x1, H, .2, (dn.x1 + E.x1) / 2, Y + H / 2, c.z1, plaster);
      box(dn.x1 - dn.x0, H - 3.4, .2, (dn.x0 + dn.x1) / 2, Y + 3.4 + (H - 3.4) / 2, c.z1, plaster);
    } else box(E.x1 - W.x0, H, .2, (W.x0 + E.x1) / 2, Y + H / 2, c.z1, plaster);
    if (w.south_wall_gap) {
      const gp = w.south_wall_gap;
      box(gp.x0 - W.x0, H, .2, (W.x0 + gp.x0) / 2, Y + H / 2, c.z0 + .1, plaster);
      box(E.x1 - gp.x1, H, .2, (gp.x1 + E.x1) / 2, Y + H / 2, c.z0 + .1, plaster);
    }
    for (const side of ['east', 'west']) {                            // separators between neighbouring rooms, ending in pilasters at the corridor
      const list = w.rooms.filter(r => r.side === side).sort((a, b) => a.z0 - b.z0), S = w.sides[side];
      for (let i = 0; i + 1 < list.length; i++) {
        const zc = (list[i].z1 + list[i + 1].z0) / 2;
        box(S.x1 - S.x0, H, .36, (S.x0 + S.x1) / 2, Y + H / 2, zc, plaster);
        obstacles.push({ box: [S.x0 - (side === 'east' ? .05 : 0), S.x1 + (side === 'west' ? .05 : 0), zc - .3, zc + .3] });
      }
    }
    if (c.style === 'velodrome') {
      const band = new THREE.MeshBasicMaterial({ color: '#1d4fd6' });
      box(.02, .18, len - .4, E.x1 - .11, Y + .09, (c.z0 + c.z1) / 2, band);
      box(.02, .18, len - .4, W.x0 + .11, Y + .09, (c.z0 + c.z1) / 2, band);
    }
    // the wing's name over its entrance, both ways
    const title = lettering(5.2, .9, g => {
      g.fillStyle = '#12181d'; g.font = `700 .2px ${FONT}`; g.fillText(w.name.toUpperCase(), 0, .32);
      g.fillStyle = '#5f6a72'; g.font = `italic 400 .26px ${SERIF}`; g.fillText(w.sub, 0, .74);
    }, 1024);
    title.rotation.y = Math.PI; at(title, cx, Y + 3.95, c.z0 + .25);
    if (w.south_wall_gap || ds?.depth === 0) { const t2 = title.clone(); t2.rotation.y = 0; at(t2, cx, Y + 3.8, c.z0 - .14); }

    // features
    if (w.features?.clock) {                                          // a two-faced station clock over the track, real time
      const k = w.features.clock, clock = new THREE.Group(); clock.position.set(cx, Y + 3.2, k.z); group.add(clock);
      const faceMat = new THREE.MeshBasicMaterial({ map: clockFace() });
      box(.03, H - 3.2 - .75, .03, cx, Y + 3.2 + .75 + (H - 3.2 - .75) / 2, k.z, frameMat);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .12, 48), frameMat); rim.rotation.x = Math.PI / 2; clock.add(rim);
      for (const s of [1, -1]) {
        const f = new THREE.Group(); f.rotation.y = s > 0 ? 0 : Math.PI; f.position.z = s * .065; clock.add(f);
        f.add(new THREE.Mesh(new THREE.CircleGeometry(.75, 64), faceMat));
        const hand = (l, wd, col, z) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, l, .01), new THREE.MeshBasicMaterial({ color: col })); m.position.y = l / 2 - .05; p.add(m); p.position.z = z; f.add(p); return p; };
        hands.push([hand(.38, .04, '#12181d', .01), hand(.58, .026, '#12181d', .015), hand(.64, .01, '#c8161d', .02)]);
      }
    }

    // rooms
    const oak = planks('#d9b98c', '#8a6a44', 9); oak.repeat.set(2.2, 2.2);
    const wingBikes = BIKES.filter(b => w.rooms.some(r => r.id === b.room));
    for (const r of w.rooms) {
      decorateRoom((r.decorations||[]).map(p=>({...p,y:(p.y||0)+Y})),{group,lite,obstacles});
      const roomBikes = wingBikes.filter(b => b.room === r.id);
      const L = layoutRoom(w, r, roomBikes.length, r.paintings || [], (r.sculptures || []).length);
      const { q, face, back, cz } = L, rcx = (q.x0 + q.x1) / 2;
      const fl = box(q.x1 - q.x0, .1, q.z1 - q.z0, rcx, Y - .05, cz, new THREE.MeshStandardMaterial({ map: oak, roughness: .5 }));
      fl.userData.floor = true; floors.push(fl); pickables.push(fl);
      const feature = new THREE.Mesh(new THREE.PlaneGeometry(q.z1 - q.z0 - .36, H - .02), new THREE.MeshStandardMaterial({ color: r.wall, roughness: .88 }));
      feature.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; at(feature, back + face * .105, Y + H / 2, cz);
      for (const zz of [q.z0 + .2, q.z1 - .2]) box(q.x1 - q.x0, .12, .03, rcx, Y + .06, zz, skirtMat);
      box(.03, .12, q.z1 - q.z0, back + face * .115, Y + .06, cz, skirtMat);
      const sign = lettering(4.4, .9, g => {
        g.fillStyle = r.ink; g.font = `700 .2px ${FONT}`; g.fillText(r.name.toUpperCase(), 0, .32);
        g.fillStyle = r.tint; g.font = `italic 400 .24px ${SERIF}`; g.fillText(r.sub, 0, .72);
      }, 1024);
      sign.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; at(sign, back + face * .13, Y + 3.05, cz);
      const lamp = new THREE.PointLight('#fff1dc', lite ? 5 : 9, 11, 1.4); lamp.position.set(rcx, Y + 3.6, cz); group.add(lamp);
      const room = { ...r, wing: w.id, wingName: w.name, rect: q, back, face, center: new THREE.Vector3(rcx, Y, cz),
        view: new THREE.Vector3(r.side === 'east' ? q.x0 + 1.0 : q.x1 - 1.0, Y, cz), look: new THREE.Vector3(rcx + face * -1.5, Y + 1.4, cz), bikes: [], art: [] };
      fl.userData.wingRoom = room; allRooms.push(room);

      for (const p of r.plates || []) {                               // big numbers on a wall
        const plate = lettering(3.4, .64 * p.lines.length + .12, g => p.lines.forEach(([big, small], i) => {
          g.fillStyle = '#12181d'; g.font = `300 .44px ${FONT}`; g.fillText(big, 0, .5 + i * .64); g.font = `600 .1px ${FONT}`; g.fillStyle = '#e8471c'; g.fillText(small, 0, .66 + i * .64);
        }), 1024);
        at(plate, rcx, Y + 1.9, p.wall === 'south' ? q.z0 + .03 + (w.south_wall_gap && q.z0 - c.z0 < 1 ? .2 : .12) : q.z1 - .15);
        if (p.wall === 'north') plate.rotation.y = Math.PI;
      }

      // bikes on plinths, with their reference photograph on the back wall
      roomBikes.forEach((b, k) => {
        const { x, z, zoff } = L.bikes[k];
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.06, .16, 40), plinthMat); plinth.position.set(x, Y + .08, z); group.add(plinth);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.03, .012, 6, 64), new THREE.MeshBasicMaterial({ color: r.tint })); ring.rotation.x = Math.PI / 2; ring.position.set(x, Y + .165, z); group.add(ring);
        obstacles.push({ c: new THREE.Vector3(x, 0, z), r: 1.12 });
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(.18, 1.15, H - .2, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4e0', transparent: true, opacity: .055, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        cone.position.set(x, Y + (H - .2) / 2 + .1, z); group.add(cone);
        const glow = new THREE.Mesh(new THREE.CircleGeometry(.98, 40), new THREE.MeshBasicMaterial({ color: '#fff3dc', transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.rotation.x = -Math.PI / 2; glow.position.set(x, Y + .168, z); group.add(glow);
        const turn = new THREE.Group(); turn.position.set(x, Y + .16, z); group.add(turn);
        const standZ = THREE.MathUtils.clamp(z - Math.sign(zoff || 1) * 2.55, q.z0 + .6, q.z1 - .6);
        const inst = { data: b, room, pos: new THREE.Vector3(x, Y, z), turn, view: new THREE.Vector3(x, Y, standZ), face: new THREE.Vector3(x, Y + .75, z), phase: bikes.length * 1.7, bike: null, paint: null };
        if (b.ref) photo(b.ref, 1.5, back + face * .08, Y + 1.85, z, face > 0 ? Math.PI / 2 : -Math.PI / 2);
        const label = lettering(1.9, .3, g => { g.fillStyle = '#12181d'; g.font = `700 .085px ${FONT}`; g.fillText(b.name.toUpperCase(), 0, .11); g.fillStyle = '#5f6a72'; g.font = `italic 400 .1px ${SERIF}`; g.fillText(`${b.year || b.era || ''}${b.kind === 'type' ? ' · type study' : ''}`, 0, .25); }, 512);
        label.rotation.x = -Math.PI / 2; label.rotation.z = face > 0 ? -Math.PI / 2 : Math.PI / 2; label.position.set(x + (face > 0 ? 1.3 : -1.3), Y + .02, z); group.add(label);
        bikes.push(inst); room.bikes.push(inst);
      });

      // paintings, each with a picture light and a label
      for (const s of L.paintings) {
        const p = paintingById[s.id]; if (!p) { console.warn('painting not in catalogue', s.id); continue; }
        const aspect = p.height / p.width, wpx = aspect > 1 ? 1.45 / aspect * 1.25 : 1.75, hpx = wpx * aspect;
        const g = new THREE.Group(); g.position.set(s.x, Y + 1.9, s.z); g.rotation.y = s.ry; group.add(g);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(wpx + .14, hpx + .14, .05), frameMat); g.add(fr);
        const mat = new THREE.MeshBasicMaterial({ color: '#d8d0c4' });
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(wpx, hpx), mat); pic.position.z = .03; g.add(pic);
        texLoader.load(`assets/art/paintings/${p.file}`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; mat.map = t; mat.color.set('#ffffff'); mat.needsUpdate = true; });
        const wl = new THREE.Mesh(new THREE.PlaneGeometry(wpx + 1.1, hpx + 1.3), new THREE.MeshBasicMaterial({ map: wash, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending }));
        wl.position.set(0, .15, .004); g.add(wl);
        const cap = lettering(1.6, .28, cc => {
          cc.fillStyle = '#12181d'; cc.font = `700 .07px ${FONT}`; cc.fillText(p.title.toUpperCase(), 0, .1);
          cc.fillStyle = '#5f6a72'; cc.font = `italic 400 .075px ${SERIF}`; cc.fillText(p.provenance?.kind === 'ai-generated' ? 'AI-generated for the museum · Higgsfield' : (p.credit || ''), 0, .21);
        }, 512);
        cap.position.set(0, -hpx / 2 - .28, .03); g.add(cap);
        const item = { kind: 'painting', data: p, room, pos: g.position.clone(), view: g.position.clone().add(new THREE.Vector3(Math.sin(s.ry) * 2.4, 0, Math.cos(s.ry) * 2.4)).setY(Y), face: g.position.clone() };
        pic.userData.wingArt = item; fr.userData.wingArt = item; pickables.push(pic, fr);
        paintings.push(item); room.art.push(item);
      }
      // sculptures on white plinths; the model arrives in load()
      (r.sculptures || []).forEach((id, k) => {
        const sd = sculptById[id]; if (!sd) { console.warn('sculpture not in catalogue', id); return; }
        const { x, z } = L.sculptures[k];
        const [pw, ph, pd] = sd.plinth || [.8, .9, .8];
        const pl = box(pw, ph, pd, x, Y + ph / 2, z, whitePlinth);
        obstacles.push({ c: new THREE.Vector3(x, 0, z), r: Math.hypot(pw, pd) / 2 + .15 });
        const holder = new THREE.Group(); holder.position.set(x, Y + ph, z); group.add(holder);
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(.15, .7, H - 1.2, 28, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4e0', transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        cone.position.set(x, Y + .9 + (H - 1.2) / 2, z); group.add(cone);
        const item = { kind: 'sculpture', data: sd, room, holder, pos: new THREE.Vector3(x, Y, z), view: new THREE.Vector3(x + (face < 0 ? -2.2 : 2.2), Y, z + .6), face: new THREE.Vector3(x, Y + 1.3, z) };
        pl.userData.wingArt = item; pickables.push(pl);
        sculptures.push(item); room.art.push(item);
      });

      if (r.feature === 'paintshop') {
        show = { room, turn: new THREE.Group(), pos: room.center.clone(), view: new THREE.Vector3(r.side === 'west' ? q.x1 - 1.1 : q.x0 + 1.1, Y, cz + 2.2), face: new THREE.Vector3(rcx, Y + .8, cz), bikeIndex: 0, skinIndex: 0, t: 0, paint: null, bike: null, showcase: true };
        show.turn.position.set(rcx, Y + .22, cz); group.add(show.turn);
        box(0, 0, 0, 0, 0, 0, plaster).visible = false;
        const table = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.4, .22, 48), new THREE.MeshStandardMaterial({ color: '#f4efe7', roughness: .35 })); table.position.set(rcx, Y + .11, cz); group.add(table);
        obstacles.push({ c: new THREE.Vector3(rcx, 0, cz), r: 1.5 });
        const all = BIKES.flatMap((b, bi) => b.skins.map((s, si) => ({ b, bi, s, si }))), cols = Math.ceil(all.length / 4);
        const colW = Math.min(.5, (q.z1 - q.z0 - 1) / cols);
        all.forEach((e, k) => {
          const col = k % cols, row = (k / cols) | 0;
          const m = new THREE.Mesh(new THREE.BoxGeometry(.05, colW * .68, colW * .68), new THREE.MeshStandardMaterial({ color: e.s.frame, roughness: .3, metalness: .1 }));
          m.position.set(back + face * .14, Y + 2.45 - row * colW * .92, cz - (cols - 1) * colW / 2 + col * colW); group.add(m);
          const acc = new THREE.Mesh(new THREE.BoxGeometry(.052, colW * .2, colW * .68), new THREE.MeshBasicMaterial({ color: e.s.accent || e.s.frame })); acc.position.copy(m.position).add(new THREE.Vector3(0, -colW * .24, 0)); group.add(acc);
          m.userData.wingSwatch = e; acc.userData.wingSwatch = e; pickables.push(m, acc); swatches.push(m);
        });
        const tip = lettering(4.4, .3, g => { g.fillStyle = '#5f6a72'; g.font = `italic 400 .12px ${SERIF}`; g.fillText('Touch a swatch to paint the bike on the table', 0, .18); }, 1024);
        tip.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; at(tip, back + face * .13, Y + .75, cz);
      }
      if (r.feature === 'references') {
        const refs = [...BIKES.filter(b => b.ref).map(b => b.ref), ...extraRefs];
        refs.forEach((ref, k) => {
          const wpx = 1.3;
          if (k < 4) photo(ref, wpx, back + face * .08, Y + 1.9, cz - 2.4 + k * 1.6, face > 0 ? Math.PI / 2 : -Math.PI / 2);
          else { const j = k - 4, north = j % 2 === 0; photo(ref, wpx, (face > 0 ? q.x0 + 1.6 : q.x1 - 1.6) + face * ((j / 2) | 0) * 2.2, Y + 1.9, north ? q.z1 - .28 : q.z0 + .28, north ? Math.PI : 0); }
        });
      }
    }
    function photo(ref, wpx, x, y, z, ry) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; group.add(g);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(wpx + .12, wpx * .66 + .12, .05), frameMat); g.add(fr);
      const mat = new THREE.MeshBasicMaterial({ color: '#d8d0c4' });
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(wpx, wpx * .66), mat); pic.position.z = .03; g.add(pic);
      texLoader.load(`assets/atlas/ref/${ref.file}`, t => {
        t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.color.set('#ffffff'); mat.needsUpdate = true;
        const a = t.image.height / t.image.width; pic.scale.y = a / .66; fr.scale.y = (wpx * a + .12) / (wpx * .66 + .12);
      });
      const cap = lettering(wpx + .1, .34, cc => {
        cc.fillStyle = '#12181d'; cc.font = `600 .06px ${FONT}`; cc.fillText(ref.caption.toUpperCase().slice(0, 64), 0, .1);
        cc.fillStyle = '#5f6a72'; cc.font = `400 .055px ${FONT}`; cc.fillText(`Photo: ${ref.artist} · ${ref.license} · Wikimedia Commons`, 0, .21);
      }, 1024);
      cap.position.set(0, -wpx * .33 - .32, .03); g.add(cap);
      pic.userData.wingRef = ref; fr.userData.wingRef = ref; pickables.push(pic, fr);
    }
  }

  // ---------------------------------------------------------------- loading
  async function load(loader) {
    const cache = new Map();
    const get = key => { if (!cache.has(key)) cache.set(key, loader.loadAsync(`assets/atlas/${key}/bike.glb`).then(g => compact(g.scene))); return cache.get(key); };
    for (const inst of bikes) {
      try {
        const bike = (await get(inst.data.key)).clone(true);
        bike.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = false; } });
        inst.paint = slotsOf(bike);
        const b3 = new THREE.Box3().setFromObject(bike), cc = b3.getCenter(new THREE.Vector3()); bike.position.set(-cc.x, -b3.min.y, -cc.z);
        const h = new THREE.Group(); h.add(bike); h.rotation.y = Math.PI / 2; inst.turn.add(h); inst.bike = h;
        if (contactShadow) { const cs = contactShadow(1.9, .5); cs.rotation.z = Math.PI / 2; cs.position.y = .006; inst.turn.add(cs); }
        applySkin(inst, inst.data.skins[0]);
        h.traverse(o => { if (o.isMesh) { o.userData.wingBike = inst; pickables.push(o); } });
      } catch (e) { console.warn('wing bike', inst.data.key, e); }
    }
    for (const s of sculptures) {
      try {
        const g = (await loader.loadAsync(`assets/art/sculptures/${s.data.file}`)).scene;
        const b3 = new THREE.Box3().setFromObject(g), size = b3.getSize(new THREE.Vector3());
        g.scale.setScalar(Math.min((s.data.height || 1.2) / Math.max(size.y, 1e-3), (s.data.footprint || .9) / Math.max(size.x, size.z, 1e-3)));   // fit height and plinth, from the catalogue
        const b4 = new THREE.Box3().setFromObject(g), cc = b4.getCenter(new THREE.Vector3()); g.position.set(-cc.x, -b4.min.y, -cc.z);
        g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.userData.wingArt = s; pickables.push(o); } });
        s.holder.add(g); s.model = g;
      } catch (e) { console.warn('sculpture', s.data.id, e); }
    }
    if (show) { show.protos = await Promise.all(BIKES.map(b => get(b.key))); setShow(0, 0); }
  }
  function setShow(bi, si) {
    if (!show?.protos) return;
    if (show.bike) show.turn.remove(show.bike);
    show.bikeIndex = bi; show.skinIndex = si;
    const bike = show.protos[bi].clone(true); bike.traverse(o => { if (o.isMesh) o.material = o.material.clone(); }); show.paint = slotsOf(bike);
    const b3 = new THREE.Box3().setFromObject(bike), cc = b3.getCenter(new THREE.Vector3()); bike.position.set(-cc.x, -b3.min.y, -cc.z);
    const h = new THREE.Group(); h.add(bike); h.scale.setScalar(1.15);
    show.turn.add(h); show.bike = h; show.data = BIKES[bi];
    applySkin(show, show.data.skins[si]);
    h.traverse(o => { if (o.isMesh) o.userData.wingBike = show; });
    show.t = 0;
  }
  const paintWith = e => { setShow(e.bi, e.si); if (show) show.hold = 30; };

  // ---------------------------------------------------------------- per frame
  function update(t, dt, visitor, visible, reduce) {
    for (const b of bikes) if (b.bike) b.bike.visible = visible;
    for (const s of sculptures) if (s.model) s.model.visible = visible;
    if (show?.bike) show.bike.visible = visible;
    if (!visible) return;
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    for (const [hH, hM, hS] of hands) { hS.rotation.z = -s / 60 * Math.PI * 2; hM.rotation.z = -m / 60 * Math.PI * 2; hH.rotation.z = -h / 12 * Math.PI * 2; }
    if (reduce) return;
    for (const b of bikes) b.turn.rotation.y = Math.sin(t * .25 + b.phase) * .35;
    for (const sc of sculptures) if (sc.model) sc.holder.rotation.y += dt * .12;
    if (show) {
      show.turn.rotation.y += dt * .35;
      show.t += dt; if (show.hold) show.hold = Math.max(0, show.hold - dt);
      if (!show.hold && show.t > 9 && show.protos) {
        const skins = BIKES[show.bikeIndex].skins;
        if (show.skinIndex + 1 < skins.length) setShow(show.bikeIndex, show.skinIndex + 1); else setShow((show.bikeIndex + 1) % BIKES.length, 0);
      }
    }
  }

  const walkable = (x, z) => wings.some(w => wingWalkable(w, x, z));
  const inside = (x, z) => wings.some(w => wingContains(w, x, z));
  const floorY = (x, z) => { const w = wings.find(v => wingContains(v, x, z)); return w ? w.y : null; };
  const roomAt = (x, z) => allRooms.find(r => { const q = r.rect; return x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1; }) || null;
  return { group, floors, wings, rooms: allRooms, bikes, paintings, sculptures, swatches, get show() { return show; }, load, update, paintWith, setShow, applySkin, walkable, inside, floorY, roomAt };
}
