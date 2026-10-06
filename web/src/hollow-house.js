// The Hollow House — KONA.m's Halloween haunted house, a native room beside the hall's glass wall.
// Same architecture as Lava Night / Beast Cave: one module built into landing.js, on the shared renderer,
// camera, cards, pickables, obstacles, map, quality tiers and loading. It adds no renderer or camera of its own.
//
// Story, one line: ARRIVE → LISTEN → READ → DESCEND → FIND → RUN.
// A storm night in a house that remembers every ride that never finished. You enter by the front door, the
// house watches you from its walls, and at the bottom of the cellar there is a machine nobody finished.
//
// How it stays beautiful and cheap:
//  - every static surface is batched by material (GeoBatch): ~25 draws for the whole shell and its furniture
//  - one lantern + a pool of real lights that follow the nearest flames (createLightPool); everything else is
//    emissive colour, additive glow and fake ambient occlusion
//  - materials are shielded from the hall's sun/sky/environment (shieldMaterial), so the dark is the room's own
//  - a director (hollow-director.js) owns every scare, and obeys the house rules: nothing touches you, nothing
//    traps you, nothing moves while you watch it, reduced motion gets stillness
import * as THREE from 'three';
import { GeoBatch, xf, shieldMaterial, interior, createLightPool, createAtmosphere, makeSkeleton, cobwebPoints, drapeGeometry } from './horrorkit.js';
import { createSurfaces } from './horrorkit-surfaces.js';
import { rng, motes, mistTex as softMist, scrawlTex, glyphTex } from './roomkit.js';
import { createDirector } from './hollow-director.js';
import { slotsOf, applySkin } from './engine/skins.js';

export const HHROOM = { x0: 7.35, x1: 35.35, z0: -31.2, z1: -45.6, h: 3.4 };
export const HHDOOR = { z0: -39.9, z1: -36.9, h: 3.2 };
const FOY_H = 5.2, COR_H = 3.4, CEL_H = 2.9;
const CORR = { z0: -39.69, z1: -37.11, zc: -38.4 };                    // corridor interior, z0 is the north (more negative) face
const BIKE = { x: 31.4, z: -41.2 };
const LODGER_PATH = [[26.2, -38.4], [24.2, -38.4], [22.2, -38.4], [20.4, -38.4], [18.8, -38.4], [17.4, -38.4], [16.2, -38.4]].reverse();   // index 0 = nearest the foyer

export function zoneOf(x, z) {
  if (z > HHROOM.z0 + .1 || z < HHROOM.z1 - .1 || x > HHROOM.x1 + .1) return 'out';
  if (x < HHROOM.x0) return x > HHROOM.x0 - 1.2 && z < HHDOOR.z1 && z > HHDOOR.z0 ? 'door' : 'out';
  if (x < 15.0) return 'foyer';
  if (x < 27.0) {
    if (z < -37.0 && z > -39.8) return 'corridor';
    if (z >= -37.0) return x < 21 ? 'parlor' : 'nursery';
    return x < 21 ? 'library' : 'dining';
  }
  return 'cellar';
}

// walkable = the union of rooms, doorways and the hall door, each pulled in from its walls
const RECTS = [
  [7.85, 14.45, -45.05, -31.75], [14.3, 15.7, -39.25, -37.55], [15.1, 27.3, -39.25, -37.55],        // foyer, its opening, corridor
  [15.6, 20.4, -36.4, -31.75], [21.6, 26.4, -36.4, -31.75], [15.6, 20.4, -45.05, -40.4], [21.6, 26.4, -45.05, -40.4],   // parlor, nursery, library, dining
  [16.5, 17.9, -37.6, -36.3], [23.8, 25.0, -37.6, -36.3], [18.0, 19.2, -40.7, -39.2], [22.6, 23.8, -40.7, -39.2],       // doors off the corridor
  [20.5, 21.5, -34.5, -33.9], [20.5, 21.5, -42.6, -42.0],                                                               // the two connecting doors
  [26.3, 27.9, -39.0, -37.8], [27.8, 34.85, -45.05, -31.75],                                                            // cellar door and cellar
];
export function hollowWalkable(x, z, WALK) {
  if (x > (WALK?.x1 ?? 6.4) - .1 && x < HHROOM.x0 + .75 && z < HHDOOR.z1 - .45 && z > HHDOOR.z0 + .45) return true;
  return RECTS.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);
}

export function buildHollowHouse(ctx) {
  const { scene, canvasTex, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX, onCue, loadGLB } = ctx;
  const group = new THREE.Group(); group.name = 'hollowHouseRoom'; scene.add(group);
  const R = rng(77), Rf = (a, b) => a + R() * (b - a);
  const tier = lite ? 'mobile' : 'desktop';
  const S = createSurfaces({ canvasTex, size: lite ? 512 : 1024, seed: 7 });

  // ------------------------------------------------------------------ materials (all shielded from the hall's light)
  // The room is built at once with plain dark materials; the painted surfaces arrive one per idle slice, nearest
  // the door first, so a visitor never waits on them and the museum's start-up is not blocked.
  const jobs = [];
  const later = fn => jobs.push(fn);
  const std = o => shieldMaterial(new THREE.MeshStandardMaterial(o));
  const surf = (get, o = {}, rough = null) => {
    const m = std({ bumpScale: 2.2, roughness: .85, metalness: 0, ...o });
    later(() => { const t = get(); m.map = t.map; m.bumpMap = t.bump; if (rough) m.roughnessMap = rough(); m.needsUpdate = true; });
    return m;
  };
  const wp = (key, pal, style, o = {}) => surf(() => S.wallpaper(key, { stain: [58, 42, 26], plaster: '#8a8272', ...pal }, style), { roughness: .92, ...o });
  const M = {
    marble: surf(() => S.marble(), { roughness: .9, color: '#ece6dc', bumpScale: 3 }, () => S.wet('flags', 9, .5)),
    wpFoyer: wp('foyer', { base: '#21332a', motif: '#3d6a52', accent: '#000', age: .7 }, 'damask'),
    wain: surf(() => S.wainscot(), { roughness: .6, color: '#e6d3bf' }),
    wood: surf(() => S.wainscot(), { roughness: .55, color: '#cdb59c' }),
    boards: surf(() => S.floorboards(), { roughness: .78, color: '#d9c7b2' }, () => S.wet('floor', 5, .52)),
    ceil: surf(() => S.ceiling(), { roughness: .95, color: '#c9c3b6' }),
    wpCorr: wp('corr', { base: '#3a2a20', motif: '#5c402c', accent: '#b08a3a', age: .7 }, 'stripe'),
    wpParlor: wp('parlor', { base: '#4a1520', motif: '#80303f', age: .7 }, 'damask'),
    wpNurs: wp('nurs', { base: '#a69868', motif: '#c3b784', age: .55 }, 'nursery'),
    wpDining: wp('dining', { base: '#1d3940', motif: '#3d7480', age: .7 }, 'damask'),
    brick: surf(() => S.brick(), { roughness: .95, bumpScale: 4 }),
    flags: surf(() => S.flagstone(), { roughness: .95, bumpScale: 3.5 }, () => S.wet('flags', 9, .5)),
    iron: surf(() => S.rust(), { roughness: .6, metalness: .45, bumpScale: 3 }),
    cloth: surf(() => S.sheet(), { roughness: 1, color: '#7a3038' }),
    sheet: surf(() => S.sheet(), { roughness: 1, color: '#d6d2c6', side: THREE.DoubleSide }),
    ext: std({ color: '#1b1819', roughness: 1 }),
    brass: std({ color: '#c2a057', roughness: .32, metalness: .65 }),
    wax: std({ color: '#e8dfc8', roughness: .5, emissive: '#ff9a3c', emissiveIntensity: .1 }),
    porcelain: std({ color: '#d9d3c4', roughness: .25 }),
    felt: std({ color: '#0e1c14', roughness: 1 }),
    glass: std({ color: '#9ab', roughness: .05, metalness: 0, transparent: true, opacity: .16 }),
    shadeTop: new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    night: new THREE.MeshBasicMaterial({ color: '#0a0c18', fog: false }),
    rain: new THREE.MeshBasicMaterial({ transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, visible: false }),
  };
  later(() => { M.shadeTop.map = S.shade(); M.shadeTop.opacity = 1; M.shadeTop.needsUpdate = true; });
  later(() => { M.night.map = S.storm(); M.night.color.set('#fff'); M.night.needsUpdate = true; });
  later(() => { const r = S.rain(); r.wrapT = THREE.RepeatWrapping; M.rain.map = r; M.rain.visible = true; M.rain.needsUpdate = true; });
  M.shadeBot = M.shadeTop;
  const beamTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(190,205,255,.5)'); gr.addColorStop(1, 'rgba(190,205,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const e = g.createLinearGradient(0, 0, w, 0); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(.5, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = e; g.fillRect(0, 0, w, h); });
  M.beam = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  M.stained = new THREE.MeshBasicMaterial({ color: '#05060b', fog: false }); later(() => { M.stained.map = S.stainedGlass(); M.stained.color.set('#9aa8ff'); M.stained.needsUpdate = true; });
  const flash = { v: 0 };

  // ------------------------------------------------------------------ batch helpers
  // Intelligent rendering: every static piece is filed under the zone it stands in (by its own centre), each zone is
  // its own group, and per frame only the visitor's zone and the zones they can see into are drawn.
  const ZONES = ['foyer', 'corridor', 'parlor', 'nursery', 'library', 'dining', 'cellar'];
  const zg = Object.fromEntries(ZONES.map(z => { const g = new THREE.Group(); g.name = 'hh-zone-' + z; group.add(g); return [z, g]; }));
  const clampTo = (v, a, b) => Math.min(b, Math.max(a, v));
  const zoneKey = (x, z) => zoneOf(clampTo(x, HHROOM.x0 + .05, HHROOM.x1 - .05), clampTo(z, HHROOM.z1 + .05, HHROOM.z0 - .05));   // things outside the shell (night views, rain, the hall-side wall) belong to the nearest zone
  const zadd = o => { zg[zoneKey(o.position.x, o.position.z)].add(o); return o; };
  const batches = Object.fromEntries(ZONES.map(z => [z, new GeoBatch()]));
  const B = {
    add(key, geo, matrix, tile) { geo.computeBoundingSphere(); const c = geo.boundingSphere.center.clone(); if (matrix) c.applyMatrix4(matrix); batches[zoneKey(c.x, c.z)].add(key, geo, matrix, tile); return B; },
    box(key, w, h, d, matrix, tile = 1) { return B.add(key, new THREE.BoxGeometry(w, h, d), matrix, tile); },
  };
  // Culling must never open a hole to the hall's sky: each doorway into a zone that can be hidden gets a black panel just
  // inside it, drawn only while that zone is culled (a room you have not entered reads as dark, which is the point).
  const plugBatches = Object.fromEntries(ZONES.map(z => [z, new GeoBatch()])), plugGroups = Object.fromEntries(ZONES.map(z => { const g = new THREE.Group(); g.name = 'hh-plug-' + z; group.add(g); return [z, g]; }));
  const plug = (zone, x, z, w, ry) => plugBatches[zone].add('plug', new THREE.PlaneGeometry(w, 3.4), xf(x, 1.7, z, ry), 0);
  plug('foyer', 14.4, -38.4, 2.9, Math.PI / 2); plug('cellar', 27.6, -38.4, 2.0, -Math.PI / 2);
  plug('parlor', 17.2, -36.6, 1.6, Math.PI); plug('nursery', 24.4, -36.6, 1.6, Math.PI); plug('library', 18.6, -40.2, 1.6, 0); plug('dining', 23.2, -40.2, 1.6, 0);
  const SEES = { foyer: ['corridor', 'cellar'], corridor: ['foyer', 'cellar'], parlor: ['corridor', 'nursery'], nursery: ['corridor', 'parlor'], library: ['corridor', 'dining'], dining: ['corridor', 'library'], cellar: ['corridor'] };   // who can be seen from where
  const bx = (k, w, h, d, x, y, z, ry = 0, tile = 1) => B.box(k, w, h, d, xf(x, y, z, ry), tile);
  const cyl = (k, r1, r2, h, x, y, z, seg = 14, tile = 0) => B.add(k, new THREE.CylinderGeometry(r1, r2, h, seg), xf(x, y, z), tile);
  const lathe = (k, pts, x, y, z, seg = 16, tile = 0, ry = 0) => B.add(k, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), xf(x, y, z, ry), tile);
  const plane = (k, w, h, x, y, z, ry = 0, rx = 0, tile = 1) => B.add(k, new THREE.PlaneGeometry(w, h), xf(x, y, z, ry, rx), tile);
  const floorQ = (k, x0, x1, z0, z1, tile) => plane(k, x1 - x0, Math.abs(z1 - z0), (x0 + x1) / 2, .003, (z0 + z1) / 2, 0, -Math.PI / 2, tile);
  const ceilQ = (x0, x1, z0, z1, h) => plane('ceil', x1 - x0, Math.abs(z1 - z0), (x0 + x1) / 2, h, (z0 + z1) / 2, 0, Math.PI / 2, 3);
  const baluster = [[.014, 0], [.03, .04], [.018, .09], [.036, .2], [.02, .33], [.03, .46], [.016, .56], [.022, .66], [.014, .78]];

  // a wall with openings: axis 'x' = constant x running along z, axis 'z' = constant z running along x
  const trimOpening = (axis, c, o, thick = .26) => {
    const mid = (o.a + o.b) / 2, len = o.b - o.a, top = o.top, sill = o.sill || 0;
    const put = (w, h, u, y) => axis === 'x' ? bx('wood', thick, h, w, c, y, u, 0, 1.2) : bx('wood', w, h, thick, u, y, c, 0, 1.2);
    put(.1, top - sill, o.a - .05, (top + sill) / 2); put(.1, top - sill, o.b + .05, (top + sill) / 2);
    put(len + .2, .1, mid, top + .05); if (sill) put(len + .24, .06, mid, sill - .03);
  };
  function wall(axis, c, a0, a1, h, facing, key, { open = [], dado = 0, tile = 1 } = {}) {
    const piece = (p0, p1, y0, y1, k) => {
      if (p1 - p0 < .002 || y1 - y0 < .002) return;
      const g = new THREE.PlaneGeometry(p1 - p0, y1 - y0), u = (p0 + p1) / 2, y = (y0 + y1) / 2;
      B.add(k, g, axis === 'x' ? xf(c, y, u, facing > 0 ? Math.PI / 2 : -Math.PI / 2) : xf(u, y, c, facing > 0 ? 0 : Math.PI), tile);
    };
    const solid = (p0, p1) => { if (dado) { piece(p0, p1, 0, dado, 'wain'); piece(p0, p1, dado, h, key); } else piece(p0, p1, 0, h, key); };
    let cur = a0;
    for (const o of [...open].sort((p, q) => p.a - q.a)) {
      solid(cur, o.a); if (o.top < h) piece(o.a, o.b, o.top, h, key);
      if (o.sill) piece(o.a, o.b, 0, o.sill, o.sill <= dado + .05 ? 'wain' : key);
      cur = o.b;
    }
    solid(cur, a1);
    if (dado) { const rail = (p0, p1) => axis === 'x' ? bx('wood', .05, .07, p1 - p0, c + facing * .025, dado + .035, (p0 + p1) / 2, 0, 1.2) : bx('wood', p1 - p0, .07, .05, (p0 + p1) / 2, dado + .035, c + facing * .025, 0, 1.2); let k = a0; for (const o of [...open].sort((p, q) => p.a - q.a)) { if (o.sill) continue; rail(k, o.a); k = o.b; } rail(k, a1); }
    const skirt = (p0, p1) => axis === 'x' ? bx('wood', .05, .16, p1 - p0, c + facing * .025, .08, (p0 + p1) / 2, 0, 1.2) : bx('wood', p1 - p0, .16, .05, (p0 + p1) / 2, .08, c + facing * .025, 0, 1.2);
    let k = a0; for (const o of [...open].sort((p, q) => p.a - q.a)) { if (o.sill) continue; skirt(k, o.a); k = o.b; } skirt(k, a1);
  }
  const door = (a, b, top = 2.3) => ({ a, b, top });
  const win = (a, b, sill = .95, top = 2.75) => ({ a, b, top, sill });

  // ------------------------------------------------------------------ zones: floors, ceilings, walls, openings
  const X0 = HHROOM.x0, X1 = HHROOM.x1, Z0 = HHROOM.z0, Z1 = HHROOM.z1;
  const winList = [];                                                  // {x|z, wall, c, a, b}
  const sconcePts = [];                                                // corridor sconces, nearest the foyer first
  const doorsFront = [];

  // FOYER (7.35–14.9, double height, marble)
  floorQ('marble', X0, 14.9, Z0, Z1, 1.2); ceilQ(X0, 14.9, Z0, Z1, FOY_H);
  wall('x', X0, Z1, Z0, FOY_H, 1, 'wpFoyer', { dado: 1.0, open: [door(HHDOOR.z0, HHDOOR.z1, HHDOOR.h)] });
  wall('x', X0 - .05, Z1, Z0, FOY_H, -1, 'ext', { open: [door(HHDOOR.z0, HHDOOR.z1, HHDOOR.h)] }); trimOpening('x', X0 - .02, door(HHDOOR.z0, HHDOOR.z1, HHDOOR.h), .34);
  wall('x', 14.89, Z1, Z0, FOY_H, -1, 'wpFoyer', { dado: 1.0, open: [door(CORR.z0, CORR.z1, 3.0)] }); trimOpening('x', 14.9, door(CORR.z0, CORR.z1, 3.0));
  wall('z', Z0, X0, 14.9, FOY_H, -1, 'wpFoyer', { dado: 1.0 });
  wall('z', Z1, X0, 14.9, FOY_H, 1, 'wpFoyer', { dado: 1.0, open: [win(9.2, 12.4, 2.3, 4.6)] }); winList.push({ wall: 'z', c: Z1, a: 9.2, b: 12.4, y0: 2.3, y1: 4.6, dir: -1, big: true });
  // CORRIDOR
  floorQ('boards', 15.1, 27.0, CORR.z0, CORR.z1, 2); ceilQ(15.1, 27.0, CORR.z0, CORR.z1, COR_H);
  const roomDoors = { S: [door(16.6, 17.8), door(23.8, 25.0)], N: [door(18.0, 19.2), door(22.6, 23.8)] };
  wall('z', -37.11, 15.1, 27.0, COR_H, -1, 'wpCorr', { dado: .95, open: roomDoors.S }); roomDoors.S.forEach(o => trimOpening('z', -37.0, o));
  wall('z', -39.69, 15.1, 27.0, COR_H, 1, 'wpCorr', { dado: .95, open: roomDoors.N }); roomDoors.N.forEach(o => trimOpening('z', -39.8, o));
  // PARLOR / NURSERY (south), LIBRARY / DINING (north)
  const rooms = [
    { id: 'parlor', x0: 15.1, x1: 20.89, z0: -36.89, z1: Z0, key: 'wpParlor', floor: 'boards', south: true, win: [16.4, 18.4] },
    { id: 'nursery', x0: 21.11, x1: 26.89, z0: -36.89, z1: Z0, key: 'wpNurs', floor: 'boards', south: true, win: [23.4, 25.4] },
    { id: 'library', x0: 15.1, x1: 20.89, z0: Z1, z1: -39.91, key: 'wain', floor: 'boards', south: false, win: [17.6, 19.6] },
    { id: 'dining', x0: 21.11, x1: 26.89, z0: Z1, z1: -39.91, key: 'wpDining', floor: 'boards', south: false, win: [22.2, 24.2] },
  ];
  for (const r of rooms) {
    const zA = Math.min(r.z0, r.z1), zB = Math.max(r.z0, r.z1);
    floorQ(r.floor, r.x0, r.x1, zA, zB, 2); ceilQ(r.x0, r.x1, zA, zB, COR_H);
    const dado = r.id === 'library' ? 0 : .95, wk = r.id === 'library' ? 'wain' : r.key;
    // outer wall (south wall for south rooms, north for north) with the window
    const outerZ = r.south ? Z0 : Z1, fac = r.south ? -1 : 1;
    wall('z', outerZ, r.x0, r.x1, COR_H, fac, wk, { dado, open: [win(r.win[0], r.win[1])] }); winList.push({ wall: 'z', c: outerZ, a: r.win[0], b: r.win[1], y0: .95, y1: 2.75, dir: fac * -1, room: r.id });
    trimOpening('z', outerZ + fac * .05, win(r.win[0], r.win[1]), .2);
    // corridor-side wall (room's face) with the room door
    const sideZ = r.south ? -36.89 : -39.91, sd = r.south ? roomDoors.S : roomDoors.N, idx = r.x0 < 20 ? 0 : 1;
    wall('z', sideZ, r.x0, r.x1, COR_H, r.south ? 1 : -1, wk, { dado, open: [sd[idx]]});
  }
  // partitions x = 21 between parlor|nursery and library|dining, each with a connecting door; end walls
  const conS = door(-34.75, -33.65), conN = door(-42.85, -41.75);
  wall('x', 20.89, -36.89, Z0, COR_H, -1, 'wpParlor', { dado: .95, open: [conS] }); wall('x', 21.11, -36.89, Z0, COR_H, 1, 'wpNurs', { dado: .95, open: [conS] }); trimOpening('x', 21.0, conS);
  wall('x', 20.89, Z1, -39.91, COR_H, -1, 'wain', { open: [conN] }); wall('x', 21.11, Z1, -39.91, COR_H, 1, 'wpDining', { dado: .95, open: [conN] }); trimOpening('x', 21.0, conN);
  wall('x', 15.11, -36.89, Z0, COR_H, 1, 'wpParlor', { dado: .95 }); wall('x', 15.11, Z1, -39.91, COR_H, 1, 'wain');
  wall('x', 26.89, -36.89, Z0, COR_H, -1, 'wpNurs', { dado: .95 }); wall('x', 26.89, Z1, -39.91, COR_H, -1, 'wpDining', { dado: .95 });
  // CELLAR
  const cellDoor = door(-39.2, -37.6, 2.5);
  floorQ('flags', 27.11, X1, Z0, Z1, 2); ceilQ(27.11, X1, Z0, Z1, CEL_H);
  wall('x', 27.11, Z1, Z0, CEL_H, 1, 'brick', { open: [cellDoor], tile: 1.2}); wall('x', 26.89, Z1, Z0, COR_H, -1, 'wpCorr', { dado: .95, open: [cellDoor] }); trimOpening('x', 27.0, cellDoor, .3);
  wall('x', X1, Z1, Z0, CEL_H, -1, 'brick', { tile: 1.2 }); wall('z', Z0, 27.11, X1, CEL_H, -1, 'brick', { tile: 1.2 }); wall('z', Z1, 27.11, X1, CEL_H, 1, 'brick', { tile: 1.2 });
  // hall-side reveal + the corridor's dead end beyond the door
  bx('wood', .3, .12, 3.4, X0 - .02, HHDOOR.h + .06, (HHDOOR.z0 + HHDOOR.z1) / 2, 0, 1.2);

  // fake ambient occlusion: dark ramps where walls meet ceiling and floor
  for (const [x0, x1, z0, z1, h] of [[X0, 14.9, Z0, Z1, FOY_H], [15.1, 27.0, CORR.z0, CORR.z1, COR_H], [15.1, 20.89, -36.89, Z0, COR_H], [21.11, 26.89, -36.89, Z0, COR_H], [15.1, 20.89, Z1, -39.91, COR_H], [21.11, 26.89, Z1, -39.91, COR_H], [27.11, X1, Z0, Z1, CEL_H]]) {
    for (const [len, cx, cz, ry] of [[x1 - x0, (x0 + x1) / 2, z0 - .01, Math.PI], [x1 - x0, (x0 + x1) / 2, z1 + .01, 0], [Math.abs(z1 - z0), x0 + .01, (z0 + z1) / 2, Math.PI / 2], [Math.abs(z1 - z0), x1 - .01, (z0 + z1) / 2, -Math.PI / 2]]) {
      B.add('shadeTop', new THREE.PlaneGeometry(len, .75), xf(cx, h - .375, cz, ry)); B.add('shadeBot', new THREE.PlaneGeometry(len, .5), xf(cx, .25, cz, ry, 0, Math.PI));
    }
  }

  // ------------------------------------------------------------------ FOYER set pieces
  // grand stair along the north wall, rising east to a landing with a door that glows underneath
  for (let i = 0; i < 12; i++) bx('wood', .4, (i + 1) * .22, 1.7, 8.8 + i * .4 + .2, (i + 1) * .11, Z1 + .85, 0, 1.2);
  bx('wood', 1.3, 2.64, 3.8, 14.2, 1.32, Z1 + 1.9, 0, 1.2);
  for (let i = 0; i < 12; i++) { const x = 9.0 + i * .4, y = (i + 1) * .22; B.add('wood', new THREE.LatheGeometry(baluster.map(([r, h]) => new THREE.Vector2(r, h)), 8), xf(x, y, Z1 + 1.78)); }
  const rail = Math.atan2(2.42, 4.4);                                                                  // handrail from the first baluster top (y 1.0) to the landing (y 3.42)
  B.add('wood', new THREE.BoxGeometry(5.0, .07, .09), xf(11.2, 2.21, Z1 + 1.78, 0, 0, rail), 1.2);
  bx('wood', .1, 1.0, .1, 8.9, .72, Z1 + 1.78, 0, 1.2); bx('wood', .1, 1.0, .1, 13.6, 3.14, -41.8, 0, 1.2);        // newel posts
  for (let i = 0; i < 4; i++) B.add('wood', new THREE.LatheGeometry(baluster.map(([r, h]) => new THREE.Vector2(r, h)), 8), xf(13.78 + i * .34, 2.64, -41.8));
  bx('wood', 1.3, .07, .09, 14.2, 3.42, -41.8, 0, 1.2);                                                // landing rail
  bx('wood', 1.3, 2.2, .06, 14.84, 2.64 + 1.1, -43.6, 0, 1.2);                                       // the locked door on the landing
  B.add('wood', new THREE.BoxGeometry(.06, 2.6, 2.3), xf(11.6, 1.2, Z1 + .02));                       // under-stair black
  obstacles.push({ box: [8.6, 13.8, Z1, -43.8] }, { box: [13.5, 14.9, Z1, -41.6] });
  // clock, console, mirror, dust-sheeted armchairs
  bx('wood', .5, 2.3, .38, 12.8, 1.15, Z0 - .25, 0, 1.2); bx('wood', .38, .95, .06, 12.8, 1.5, Z0 - .43);
  cyl('brass', .09, .09, .03, 12.8, 1.88, Z0 - .45, 20); B.add('brass', new THREE.CylinderGeometry(.015, .015, .5), xf(12.8, .72, Z0 - .45));
  bx('wood', 1.5, .08, .4, 10.2, .78, Z0 - .24, 0, 1.2); for (const dx of [-.65, .65]) bx('wood', .07, .78, .07, 10.2 + dx, .39, Z0 - .24);
  const mirrorMat = std({ color: '#0a0c10', roughness: .06, metalness: .9 }); const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.6), mirrorMat); mirror.position.set(10.2, 1.9, Z0 - .05); mirror.rotation.y = Math.PI; zadd(mirror);
  bx('wood', 1.16, .08, .08, 10.2, 2.73, Z0 - .06); bx('wood', 1.16, .08, .08, 10.2, 1.07, Z0 - .06); bx('wood', .08, 1.74, .08, 9.64, 1.9, Z0 - .06); bx('wood', .08, 1.74, .08, 10.76, 1.9, Z0 - .06);
  const sheetAt = (boxes, x, z, ry = 0) => { const m = new THREE.Mesh(drapeGeometry(boxes, { rand: R, flare: .5 }), M.sheet); m.position.set(x, 0, z); m.rotation.y = ry; zadd(m); return m; };
  sheetAt([[0, 0, .9, .9, .75], [0, -.38, .9, .16, 1.1]], 9.6, -34.0, 1.2); sheetAt([[0, 0, .9, .9, .75], [0, -.38, .9, .16, 1.1]], 13.4, -34.2, 1.9);
  obstacles.push({ c: new THREE.Vector3(9.6, 0, -34.0), r: .75 }, { c: new THREE.Vector3(13.4, 0, -34.2), r: .75 }, { box: [9.4, 11.0, Z0 - .5, Z0] }, { box: [12.4, 13.2, Z0 - .5, Z0] });
  // portraits (eyes follow) and the stained window over the stair
  const portraits = [];
  const frameMesh = (w, h, x, y, z, ry) => { const f = .06; for (const [bw, bh, ox, oy] of [[w + f * 2, f, 0, h / 2 + f / 2], [w + f * 2, f, 0, -h / 2 - f / 2], [f, h, -w / 2 - f / 2, 0], [f, h, w / 2 + f / 2, 0]]) { const c = Math.cos(ry), s = Math.sin(ry); bx('brass', bw, bh, .05, x + c * ox, y + oy, z - s * ox, ry, 0); } };
  const PW = .62, PH = .775;
  const pSpots = [[X0 + .03, 1.75, -43.6, Math.PI / 2], [X0 + .03, 1.75, -41.6, Math.PI / 2], [X0 + .03, 1.75, -35.2, Math.PI / 2], [X0 + .03, 1.75, -33.2, Math.PI / 2], [9.2, 2.1, Z0 - .03, Math.PI], [13.8, 2.1, Z0 - .03, Math.PI], [19.5, 1.8, -37.14, Math.PI], [24.0, 1.8, -39.66, 0]];
  pSpots.forEach(([x, y, z, ry], i) => {
    const pm = new THREE.MeshBasicMaterial({ color: '#0c0a08', fog: true }); later(() => { pm.map = S.portrait(i); pm.color.set('#7c7468'); pm.needsUpdate = true; });   // lit by the dark: painted, not lamp-lit
    const m = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), pm);
    m.position.set(x, y, z); m.rotation.y = ry; m.userData.portrait = true; zadd(m); pickables.push(m); frameMesh(PW, PH, x, y, z, ry); portraits.push({ x, y, z, ry });
  });
  const pupils = new THREE.InstancedMesh(new THREE.CircleGeometry(.0125, 14), new THREE.MeshBasicMaterial({ color: '#050403' }), portraits.length * 2); pupils.frustumCulled = false; group.add(pupils);

  // ------------------------------------------------------------------ windows: storm outside, rain, moon beams, curtains
  const beams = [];
  winList.forEach(w => {
    const mid = (w.a + w.b) / 2, wd = w.b - w.a, h = w.y1 - w.y0;
    plane('night', wd + 1.2, h + .6, mid, (w.y0 + w.y1) / 2, w.c + w.dir * 1.4, w.dir > 0 ? 0 : Math.PI, 0, 0);
    plane('rain', wd + .4, h + .2, mid, (w.y0 + w.y1) / 2, w.c + w.dir * .12, w.dir > 0 ? 0 : Math.PI, 0, 0);
    bx('wood', .05, h, .1, mid, (w.y0 + w.y1) / 2, w.c + w.dir * .02); bx('wood', wd, .05, .1, mid, (w.y0 + w.y1) / 2 + h * .12, w.c + w.dir * .02);
    if (w.big) { const g = new THREE.Mesh(new THREE.PlaneGeometry(wd, h), M.stained); g.position.set(mid, (w.y0 + w.y1) / 2, w.c + .04); zadd(g); }
    for (const k of [0, 1]) B.add('beam', new THREE.PlaneGeometry(wd * .8, w.big ? 4.4 : 2.9), xf(mid + (k ? .2 : -.2), (w.big ? 2.0 : 1.2), w.c - w.dir * (w.big ? 1.1 : .75), k ? .28 : -.28));
    if (!w.big) for (const sd of [-1, 1]) bx('cloth', .34, 2.2, .06, mid + sd * (wd / 2 + .14), 1.7, w.c - w.dir * .12, 0, 1);
    beams.push({ x: mid, z: w.c - w.dir * .8, y: w.big ? 3.0 : 1.9, big: w.big, room: w.room });
  });

  // ------------------------------------------------------------------ the pool of real lights, and every flame the house owns
  const pool = createLightPool({ parent: group, count: lite ? 2 : 4, decay: 1.7, distance: 9 });
  const flames = [], flameSrc = [];
  const flame = (x, y, z, s = 1, ph = R() * 6) => flames.push({ x, y, z, s, ph });
  const candle = (x, y, z, h = .16, r = .014) => { cyl('wax', r, r * 1.05, h, x, y + h / 2, z, 8); flame(x, y + h + .02, z, 1); };
  const src = o => { const s = pool.add(o); flameSrc.push(s); return s; };

  // ---- foyer chandelier (swings), fed by a ring of candles
  const chand = new THREE.Group(); chand.position.set(11.1, FOY_H, -38.4); zadd(chand);
  {
    const cb = new GeoBatch();
    cb.add('brass', new THREE.CylinderGeometry(.012, .012, 1.3), xf(0, -.65, 0)); cb.add('brass', new THREE.LatheGeometry([[.04, 0], [.11, -.1], [.06, -.28], [.2, -.34], [.05, -.5]].map(([r, h]) => new THREE.Vector2(r, h)), 14), xf(0, -1.3, 0));
    for (const [rad, n, y] of [[.62, 8, -1.55], [.36, 4, -1.68]]) { cb.add('brass', new THREE.TorusGeometry(rad, .018, 6, 36), xf(0, y, 0, 0, Math.PI / 2)); for (let i = 0; i < n; i++) { const a = i / n * 6.283; cb.add('wax', new THREE.CylinderGeometry(.016, .016, .2, 8), xf(Math.cos(a) * rad, y + .1, Math.sin(a) * rad)); } }
    cb.add('brass', new THREE.OctahedronGeometry(.08), xf(0, -1.82, 0, 0, 0, 0, 1, 1.9, 1));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; cb.add('brass', new THREE.CylinderGeometry(.006, .006, .4), xf(Math.cos(a) * .5, -1.38, Math.sin(a) * .5, 0, 0, 0)); }
    cb.build({ brass: M.brass, wax: M.wax }, chand);
    chand.userData.flames = [[.62, 8, -1.55], [.36, 4, -1.68]].flatMap(([rad, n, y]) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * 6.283) * rad, y + .24, Math.sin(i / n * 6.283) * rad]));
  }
  const chFlames = new THREE.InstancedMesh(new THREE.ConeGeometry(.017, .07, 8), new THREE.MeshBasicMaterial({ color: '#ffc46b', toneMapped: false, fog: false }), chand.userData.flames.length); chand.add(chFlames);
  const chSrc = src({ x: 11.1, y: 3.5, z: -38.4, base: 5.5, color: '#ffb468', flicker: 'candle', range: 11, prio: .8 });

  // ---- corridor sconces and the cellar door's glow
  for (let i = 0; i < 6; i++) {
    const x = 16.4 + i * 2.1, south = i % 2 === 0, z = south ? -37.16 : -39.64, dz = south ? -.1 : .1;
    bx('brass', .1, .22, .08, x, 1.85, z + dz * .4, 0, 0); cyl('brass', .05, .035, .12, x, 1.98, z + dz * 1.2, 10); flame(x, 2.08, z + dz * 1.2, .9);
    sconcePts.push(src({ x, y: 2.0, z: z + dz * 3, base: 3.2, color: '#ffa857', flicker: 'candle', range: 7, grp: 'sconce', gi: i }));
  }
  const furnaceSrc = src({ x: 34.6, y: 1.0, z: -38.4, base: 6.5, color: '#ff5a14', flicker: 'fire', range: 9, grp: 'furnace' });
  src({ x: 27.6, y: 1.2, z: -38.4, base: 2.4, color: '#ff6a1c', flicker: 'fire', range: 4, grp: 'furnace', prio: 1.2 });          // the red bleed through the cellar door
  src({ x: 9.0, y: 2.6, z: -38.4, base: 3.0, color: '#ffbd70', flicker: 'candle', range: 7, prio: .6 });                            // a lamp just inside the front door, so the threshold glows from the hall
  src({ x: 14.3, y: 3.4, z: -43.0, base: 2.0, color: '#ffbd70', flicker: 'bulb', range: 5, prio: 1.4 });                             // light under the landing door
  for (const b of beams) src({ x: b.x, y: b.y, z: b.z, base: b.big ? 4.5 : 2.2, color: '#8fa6ff', flicker: 'steady', range: b.big ? 8 : 6, moon: true, prio: b.big ? .9 : 1.3 });

  // ------------------------------------------------------------------ PARLOR: the table of six chairs and seven candles
  const TB = { x: 18.0, z: -34.0 };
  lathe('wood', [[.001, .74], [.9, .74], [.9, .7], [.18, .66], [.14, .5], [.3, .1], [.34, .02], [.001, .02]], TB.x, 0, TB.z, 28, 1.2);
  cyl('cloth', .78, .78, .012, TB.x, .748, TB.z, 28, 1);
  const chairGeo = (x, z, ry) => { const m = xf(x, 0, z, ry); for (const [dx, dz] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) B.add('wood', new THREE.BoxGeometry(.045, .46, .045), new THREE.Matrix4().multiplyMatrices(m, xf(dx, .23, dz)), 1.2); B.add('cloth', new THREE.BoxGeometry(.46, .07, .46), new THREE.Matrix4().multiplyMatrices(m, xf(0, .49, 0)), 1); B.add('wood', new THREE.BoxGeometry(.46, .6, .045), new THREE.Matrix4().multiplyMatrices(m, xf(0, .84, .22)), 1.2); };
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + .2, x = TB.x + Math.cos(a) * 1.2, z = TB.z + Math.sin(a) * 1.2; chairGeo(x, z, Math.atan2(-(x - TB.x), -(z - TB.z)) + (i === 3 ? .5 : (R() - .5) * .15)); obstacles.push({ c: new THREE.Vector3(x, 0, z), r: .32 }); }
  obstacles.push({ c: new THREE.Vector3(TB.x, 0, TB.z), r: .98 });
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; candle(TB.x + Math.cos(a) * .45, .75, TB.z + Math.sin(a) * .45, .1 + R() * .12); }
  cyl('porcelain', .09, .09, .02, TB.x, .76, TB.z, 16);
  src({ x: TB.x, y: 1.1, z: TB.z, base: 7, color: '#ffae5a', flicker: 'candle', range: 7.5, prio: .8 });
  { const circle = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ map: glyphTex('#d8d2bd', 5), transparent: true, opacity: .42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); circle.rotation.x = -Math.PI / 2; circle.position.set(TB.x, .008, TB.z); zadd(circle); }
  const tableHit = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .3, 16), new THREE.MeshBasicMaterial({ visible: false })); tableHit.position.set(TB.x, .85, TB.z); zadd(tableHit);
  // fireplace on the west wall, embers glowing
  bx('wood', .5, 1.35, 1.9, 15.35, .68, -34.0, 0, 1.2); bx('wood', .62, .12, 2.3, 15.4, 1.42, -34.0, 0, 1.2); bx('felt', .08, .95, 1.1, 15.62, .55, -34.0);
  const embers = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .22), new THREE.MeshBasicMaterial({ color: '#ff5a12', toneMapped: false, fog: false })); embers.rotation.y = Math.PI / 2; embers.position.set(15.65, .2, -34.0); zadd(embers);
  src({ x: 16.0, y: .6, z: -34.0, base: 3.4, color: '#ff5a14', flicker: 'fire', range: 5, prio: 1.0 });
  obstacles.push({ box: [15.1, 16.0, -35.1, -32.9] });
  // piano against the south wall, dust sheet on the sofa
  bx('wood', 1.5, 1.25, .6, 19.8, .62, Z0 - .35, 0, 1.2); bx('wood', 1.55, .06, .68, 19.8, 1.28, Z0 - .36, 0, 1.2); bx('porcelain', 1.2, .02, .16, 19.8, .74, Z0 - .72); bx('wood', 1.5, .04, .3, 19.8, .73, Z0 - .7, 0, 1.2);
  obstacles.push({ box: [19.0, 20.6, Z0 - .8, Z0] });
  sheetAt([[0, 0, 1.7, .8, .6], [0, -.3, 1.7, .22, .95]], 16.6, -35.5, 0); obstacles.push({ box: [15.7, 17.5, -36.0, -35.0] });

  // ------------------------------------------------------------------ NURSERY: rocking chair, a crib, a doll that turns when you don't look
  const crib = new THREE.Group(); crib.position.set(25.9, 0, -33.4); zadd(crib);
  { const cb = new GeoBatch();
    for (const [dx, dz] of [[-.5, -.3], [.5, -.3], [-.5, .3], [.5, .3]]) cb.add('wood', new THREE.BoxGeometry(.05, 1.0, .05), xf(dx, .5, dz), 1.2);
    cb.add('cloth', new THREE.BoxGeometry(1.0, .12, .6), xf(0, .4, 0), 1);
    for (let i = 0; i < 9; i++) for (const dz of [-.3, .3]) cb.add('wood', new THREE.CylinderGeometry(.012, .012, .5), xf(-.46 + i * .115, .78, dz));
    cb.add('wood', new THREE.BoxGeometry(1.06, .05, .05), xf(0, 1.02, -.3), 1.2); cb.add('wood', new THREE.BoxGeometry(1.06, .05, .05), xf(0, 1.02, .3), 1.2);
    cb.build({ wood: M.wood, cloth: M.cloth }, crib); }
  obstacles.push({ box: [25.2, 26.7, -33.8, -33.0] });
  const mobile = new THREE.Group(); mobile.position.set(25.9, 2.2, -33.4); zadd(mobile);
  { const mb2 = new GeoBatch(); mb2.add('brass', new THREE.CylinderGeometry(.006, .006, 1.0), xf(0, .5, 0)); for (let i = 0; i < 4; i++) { const a = i * 1.571; mb2.add('brass', new THREE.CylinderGeometry(.004, .004, .3), xf(Math.cos(a) * .24, -.15, Math.sin(a) * .24)); mb2.add('porcelain', new THREE.SphereGeometry(.05, 10, 8), xf(Math.cos(a) * .24, -.34, Math.sin(a) * .24)); }
    mb2.add('brass', new THREE.TorusGeometry(.24, .006, 5, 24), xf(0, 0, 0, 0, Math.PI / 2)); mb2.build({ brass: M.brass, porcelain: M.porcelain }, mobile); }
  const rocker = new THREE.Group(); rocker.position.set(22.4, 0, -35.2); rocker.rotation.y = .6; zadd(rocker);
  { const rb = new GeoBatch();
    for (const dx of [-.28, .28]) { rb.add('wood', new THREE.TorusGeometry(.5, .018, 6, 22, 1.7), xf(dx, .5, 0, Math.PI / 2, 0, -Math.PI / 2 - .85 + Math.PI, 1, 1, 1)); rb.add('wood', new THREE.BoxGeometry(.04, .45, .04), xf(dx, .26, -.18)); rb.add('wood', new THREE.BoxGeometry(.04, .45, .04), xf(dx, .26, .18)); rb.add('wood', new THREE.BoxGeometry(.04, .8, .04), xf(dx, .72, -.26, 0, -.18)); }
    rb.add('cloth', new THREE.BoxGeometry(.6, .06, .5), xf(0, .5, 0), 1); rb.add('wood', new THREE.BoxGeometry(.58, .62, .04), xf(0, .92, -.28, 0, -.18), 1.2);
    rb.build({ wood: M.wood, cloth: M.cloth }, rocker); }
  obstacles.push({ c: new THREE.Vector3(22.4, 0, -35.2), r: .55 });
  // shelf with the doll
  bx('wood', 1.2, .05, .3, 26.7, 1.25, -35.4, 0, 1.2); bx('wood', 1.2, .05, .3, 26.7, .85, -35.4, 0, 1.2);
  const doll = new THREE.Group(); doll.position.set(26.65, 1.28, -35.4); zadd(doll);
  { const body = new THREE.Mesh(new THREE.ConeGeometry(.1, .3, 12), M.cloth); body.position.y = .15; doll.add(body); const head = new THREE.Group(); head.position.y = .36; doll.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 12), M.porcelain)); const em = new THREE.MeshBasicMaterial({ color: '#030303' });
    for (const x of [-.032, .032]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), em); e.position.set(x, .012, .075); head.add(e); }
    const cheek = new THREE.MeshBasicMaterial({ color: '#7a2b2b' }); for (const x of [-.05, .05]) { const c = new THREE.Mesh(new THREE.CircleGeometry(.015, 10), cheek); c.position.set(x, -.025, .078); head.add(c); }
    doll.userData.head = head; doll.rotation.y = -Math.PI / 2 - .2; doll.userData.base = doll.rotation.y; }
  src({ x: 25.5, y: .9, z: -32.0, base: 1.6, color: '#ffd9a0', flicker: 'bulb', range: 4.5, prio: 1.2 });                           // a night-light that should have gone out
  bx('porcelain', .09, .13, .09, 25.5, .68, -32.1);
  // toy blocks, scattered
  for (let i = 0; i < 9; i++) bx('wood', .1, .1, .1, 22.4 + R() * 2.4, .05, -34.2 + R() * 1.4, R() * 3, 1);

  // ------------------------------------------------------------------ LIBRARY: shelves, a desk lamp, a ledger, a book that will fall
  const books = []; const bookCols = ['#4a1a20', '#1e3a2c', '#27304a', '#4a3a1e', '#3a2a40', '#5a4a38', '#222', '#6a2a1a'];
  const shelfBlock = (cx, cz, along, w, h, ry) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const [dx, dy] of [[-w / 2, h / 2], [w / 2, h / 2]]) bx('wood', .05, h, .34, cx + c * dx, dy, cz - s * dx, ry, 1.2);
    for (let r = 0; r <= 6; r++) bx('wood', w, .035, .34, cx, r * (h - .05) / 6 + .02, cz, ry, 1.2);
    bx('wood', w, h, .02, cx - s * -.17 * 0, h / 2, cz, ry, 1.2);
    for (let r = 0; r < 6; r++) { let u = -w / 2 + .05; const y0 = r * (h - .05) / 6 + .04;
      while (u < w / 2 - .08) { const bw = .03 + R() * .035, bh = .22 + R() * .08; u += bw / 2; books.push({ x: cx + c * u, y: y0 + bh / 2, z: cz - s * u, ry, bw, bh, col: bookCols[R() * bookCols.length | 0], lean: R() < .06 ? (R() - .5) * .5 : 0 }); u += bw / 2 + .004; if (R() < .08) u += .15; } }
  };
  shelfBlock(15.3, -42.7, 0, 3.6, 2.7, -Math.PI / 2); shelfBlock(16.6, Z1 + .2, 0, 2.2, 2.7, 0); shelfBlock(20.2, Z1 + .2, 0, 1.4, 2.7, 0);
  obstacles.push({ box: [15.1, 15.7, -44.6, -40.8] });
  // the book that falls: placed as an instance, animated in update
  const fallBook = books.find(b => b.x < 16 && b.y > 1.4) || books[0]; fallBook.fall = true;
  bx('wood', 1.7, .06, .8, 18.3, .76, -42.6, 0, 1.2); for (const [dx, dz] of [[-.78, -.32], [.78, -.32], [-.78, .32], [.78, .32]]) bx('wood', .07, .76, .07, 18.3 + dx, .38, -42.6 + dz, 0, 1.2);
  cyl('brass', .07, .09, .03, 17.7, .81, -42.5, 16); cyl('brass', .012, .012, .38, 17.7, 1.0, -42.5, 6); const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, .12, 14, 1, true), std({ color: '#2d6a4a', roughness: .4, emissive: '#3f9d6e', emissiveIntensity: .6, side: THREE.DoubleSide })); lampShade.position.set(17.7, 1.22, -42.5); zadd(lampShade);
  src({ x: 17.7, y: 1.1, z: -42.5, base: 4.2, color: '#ffe0a0', flicker: 'bulb', range: 6, prio: .8 });
  obstacles.push({ box: [17.4, 19.2, -43.1, -42.1] });
  const ledger = new THREE.Mesh(new THREE.BoxGeometry(.34, .06, .46), std({ color: '#3a2218', roughness: .8 })); ledger.position.set(18.7, .82, -42.6); ledger.rotation.y = .3; zadd(ledger);
  const ledgerPages = new THREE.Mesh(new THREE.BoxGeometry(.31, .045, .43), std({ color: '#cfc2a2', roughness: 1 })); ledgerPages.position.set(18.7, .835, -42.6); ledgerPages.rotation.y = .3; zadd(ledgerPages);
  chairGeo(18.3, -41.7, 3.1); obstacles.push({ c: new THREE.Vector3(18.3, 0, -41.7), r: .35 });
  lathe('brass', [[.001, 0], [.1, .02], [.04, .08], [.02, .5], [.001, .52]], 16.0, 0, -40.9, 12); B.add('porcelain', new THREE.SphereGeometry(.26, 18, 14), xf(16.0, .8, -40.9, .5, 0, .4)); obstacles.push({ c: new THREE.Vector3(16.0, 0, -40.9), r: .4 });

  // ------------------------------------------------------------------ DINING: a long table laid for guests, one sheeted chair at its head
  const DT = { x: 24.0, z: -42.7 };
  bx('wood', 3.6, .08, 1.1, DT.x, .76, DT.z, 0, 1.2); for (const [dx, dz] of [[-1.6, -.42], [1.6, -.42], [-1.6, .42], [1.6, .42]]) bx('wood', .1, .74, .1, DT.x + dx, .37, DT.z + dz, 0, 1.2);
  bx('cloth', 3.7, .02, .6, DT.x, .805, DT.z, 0, 1); obstacles.push({ box: [DT.x - 1.9, DT.x + 1.9, DT.z - .65, DT.z + .65] });
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { chairGeo(DT.x - 1.2 + i * .8, DT.z + sd * .95, sd > 0 ? 3.14 : 0); obstacles.push({ c: new THREE.Vector3(DT.x - 1.2 + i * .8, 0, DT.z + sd * .95), r: .3 }); cyl('porcelain', .11, .1, .015, DT.x - 1.2 + i * .8, .82, DT.z + sd * .36, 16); }
  for (const dx of [-1.0, 0, 1.0]) { cyl('brass', .04, .06, .03, DT.x + dx, .835, DT.z, 10); B.add('brass', new THREE.CylinderGeometry(.01, .01, .26), xf(DT.x + dx, .98, DT.z)); for (const sx of [-.1, 0, .1]) { candle(DT.x + dx + sx, 1.11, DT.z, .1); } }
  const breather = sheetAt([[0, 0, .55, .55, .5], [0, .22, .55, .1, 1.0]], 22.1, -42.7, Math.PI / 2); obstacles.push({ c: new THREE.Vector3(22.1, 0, -42.7), r: .5 });
  bx('wood', .45, 2.0, 1.2, 26.6, 1.0, -43.0, 0, 1.2); src({ x: 24.0, y: 1.6, z: DT.z, base: 7, color: '#ffa65c', flicker: 'candle', range: 8, prio: .8 });

  // ------------------------------------------------------------------ CELLAR: the furnace, the pipes, the swinging bulbs, and the machine nobody finished
  bx('iron', 1.2, 1.6, 1.8, X1 - .62, .8, -38.4, 0, 1);   const mouthTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * .62, 4, w / 2, h * .55, w * .62); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(.35, '#ff9a24'); gr.addColorStop(.8, '#a02a06'); gr.addColorStop(1, '#2a0804'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(12,6,4,.92)'; for (let i = 1; i < 6; i++) g.fillRect(i * w / 6 - 3, 0, 6, h); g.fillRect(0, h * .46, w, 5);
    g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.moveTo(8, h); g.lineTo(8, h * .35); g.quadraticCurveTo(8, 6, w / 2, 6); g.quadraticCurveTo(w - 8, 6, w - 8, h * .35); g.lineTo(w - 8, h); g.fill();
  });
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(.7, .6), new THREE.MeshBasicMaterial({ map: mouthTex, transparent: true, toneMapped: false, fog: false })); mouth.rotation.y = -Math.PI / 2; mouth.position.set(X1 - 1.225, .62, -38.4); zadd(mouth);
  obstacles.push({ box: [X1 - 1.9, X1, -39.4, -37.4] });
  for (let i = 0; i < 4; i++) B.add('iron', new THREE.CylinderGeometry(.07 + (i % 2) * .03, .07 + (i % 2) * .03, 8.2, 10), xf(31.2, CEL_H - .22 - i * .16, -31.9 - i * 3.3, 0, 0, Math.PI / 2), 1);
  for (let i = 0; i < 3; i++) B.add('iron', new THREE.CylinderGeometry(.06, .06, 14.2, 10), xf(28.2 + i * 2.8, CEL_H - .18, -38.4, 0, Math.PI / 2, 0), 1);
  const bulbs = [{ x: 30.6, z: -38.4, ph: 0 }, { x: 33.2, z: -42.2, ph: 2 }, { x: 29.0, z: -34.0, ph: 4 }].map(b => {
    const g = new THREE.Group(); g.position.set(b.x, CEL_H - .1, b.z); zadd(g);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .7), M.iron); cord.position.set(0, -.35, 0); g.add(cord);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false, fog: false })); bulb.position.set(0, -.76, 0); g.add(bulb);
    src({ x: b.x, y: CEL_H - .9, z: b.z, base: 5.0, color: '#ffc880', flicker: 'bulb', range: 8, prio: .9 }); b.g = g; return b;
  });
  // the machine: the CFR on a crate under a half-pulled sheet, a vise and a lamp
  bx('wood', 1.9, .5, .9, BIKE.x, .25, BIKE.z, 0, 1.2); obstacles.push({ box: [BIKE.x - 1.2, BIKE.x + 1.2, BIKE.z - .8, BIKE.z + .8] });
  { const m = new THREE.Mesh(drapeGeometry([[0, .5, .8, .6, .34], [0, .78, .6, .3, .5]], { rand: R, flare: .5 }), M.sheet); m.position.set(BIKE.x, .5, BIKE.z + .1); zadd(m); }   // pulled back over the rear wheel; the rest of the machine is bare
  // shelves of jars, a coal heap, chains, the tally on the south wall
  bx('wood', 3.6, .05, .34, 31.0, 1.0, Z1 + .2, 0, 1.2); bx('wood', 3.6, .05, .34, 31.0, 1.55, Z1 + .2, 0, 1.2); bx('wood', 3.6, .05, .34, 31.0, 2.1, Z1 + .2, 0, 1.2);
  for (let i = 0; i < 22; i++) B.add('glass', new THREE.CylinderGeometry(.06, .06, .2, 10), xf(29.3 + (i % 11) * .33, (i < 11 ? 1.13 : 1.68), Z1 + .2), 0);
  for (let i = 0; i < 14; i++) B.add('iron', new THREE.SphereGeometry(.22 + R() * .2, 6, 5), xf(34.2 + R() * .9, .15 + R() * .1, -44.6 + R() * .9, R() * 6), 1);
  const tally = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0), new THREE.MeshBasicMaterial({ map: scrawlTex('#cfc6b0', 13), transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); tally.position.set(31.5, 1.45, Z0 - .02); tally.rotation.y = Math.PI; tally.scale.set(.9, .55, 1); zadd(tally);
  const skeleton = makeSkeleton({ lite, bone: '#cfc8b4', eye: '#444', glow: '#000' }); skeleton.position.set(34.6, 0, -33.6); skeleton.rotation.y = -Math.PI / 2 + .25; skeleton.scale.setScalar(1.05); zadd(skeleton); obstacles.push({ c: new THREE.Vector3(34.6, 0, -33.6), r: .5 });
  for (const sgn of [0, 1]) { const g = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, CEL_H - 1.4), M.iron); g.position.set(33.8 + sgn * .7, (CEL_H + 1.4) / 2, -33.1); zadd(g); }

  // cobwebs in the ceiling corners of every room
  { const pts = []; for (const [cx, cz, sx, sz, h] of [[X0, Z0, 1, -1, FOY_H], [14.9, Z1, -1, 1, FOY_H], [15.1, -36.89, 1, -1, COR_H], [26.89, -31.3, -1, 1, COR_H], [15.1, Z1, 1, 1, COR_H], [26.89, -39.91, -1, 1, COR_H], [27.11, Z0, 1, -1, CEL_H], [X1, Z1, -1, 1, CEL_H], [20.89, -36.89, -1, 1, COR_H]]) pts.push(...cobwebPoints(new THREE.Vector3(cx, h, cz), sx, sz, { R: 1.2 }));
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#b9b6c4', transparent: true, opacity: .4 }))); }

  const infos = [];
  const info = (mesh, eyebrow, title, sub, text) => { const rec = { eyebrow, title, sub, text }; mesh.userData.info = rec; pickables.push(mesh); infos.push(rec); return rec; };
  // ------------------------------------------------------------------ REUSE: the museum's own Art World pieces (existing, registered assets)
  // Paintings and sculptures that already ship with the museum (museum/art/*.json carries their provenance: AI-generated,
  // Higgsfield). They are lit by the house's lights like anything else, so the same pieces read differently in the dark.
  const artInfo = (title, kind) => ({ eyebrow: 'FROM THE ART WORLD', title, sub: kind + ' · museum collection', text: 'This piece already hangs in the museum\'s Art World wings; the house borrowed it for Halloween. It is an AI-generated work (see museum/art for its recorded provenance), not an original made for the house, and the dark changes how it reads.' });
  const paintings = [['midnight-seawall', 'Midnight on the seawall', 16.9, 1.75, -39.94, Math.PI, 1.1, .78], ['night-boards', 'Night boards', 20.1, 1.7, -39.94, Math.PI, .9, .64], ['lava-meets-sea', 'Where the lava meets the sea', 15.14, 2.15, -34.0, Math.PI / 2, 1.2, .84]];
  const artMats = [];
  for (const [id, title, x, y, z, ry, w, h] of paintings) {
    const mat = std({ color: '#cfc7bc', roughness: .75, emissive: '#ffffff', emissiveIntensity: .05 }); artMats.push([mat, id]);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; zadd(m); frameMesh(w, h, x, y, z, ry);
    info(m, ...Object.values(artInfo(title, 'Painting')));
  }
  const sculptures = [['the-tuck', 'The Tuck', 9.0, -41.0, 1.45, true], ['basalt-airfoil', 'Basalt airfoil', 28.5, -33.4, 1.3, false]];
  let artLoading = false, artLoaded = false;
  async function loadArt() {                                        // paintings arrive as textures, sculptures as GLBs; both once
    if (artLoading || artLoaded) return; artLoading = true;
    try {
      const tl = new THREE.TextureLoader();
      for (const [mat, id] of artMats) tl.load(`assets/art/paintings/${id}.jpg`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; mat.map = mat.emissiveMap = t; mat.needsUpdate = true; });
      if (loadGLB) for (const [id, title, x, z, hgt, sheeted] of sculptures) {
        if (lite && !sheeted) continue;                                 // phones keep the sheeted one; the second sculpture is a desktop/tablet luxury
        const gltf = await loadGLB(`assets/art/sculptures/${id}.glb`), obj = gltf.scene;
        obj.traverse(o => { if (o.isMesh) { o.material = shieldMaterial(o.material.clone()); o.castShadow = false; o.userData.info = artInfo(title, 'Sculpture'); pickables.push(o); } });
        const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), k = hgt / size.y; obj.scale.setScalar(k);
        box.setFromObject(obj); const c = box.getCenter(new THREE.Vector3()); obj.position.set(-c.x, -box.min.y + .42, -c.z);
        const holder = new THREE.Group(); holder.position.set(x, 0, z); holder.rotation.y = sheeted ? .6 : -.8; holder.add(obj); zadd(holder);
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(.8, .42, .8), M.wood); plinth.position.set(x, .21, z); zadd(plinth);
        if (sheeted) { const sm = new THREE.Mesh(drapeGeometry([[0, .15, .55, .5, .9]], { rand: R, flare: .4 }), M.sheet); sm.position.set(x, .42 + hgt * .3, z); zadd(sm); }   // pulled half over it
        obstacles.push({ c: new THREE.Vector3(x, 0, z), r: .65 });
      }
      artLoaded = true;
    } finally { artLoading = false; }
  }

  // ------------------------------------------------------------------ build the static shell
  for (const z of ZONES) { batches[z].build(M, zg[z]); plugBatches[z].build({ plug: new THREE.MeshBasicMaterial({ color: '#020103', fog: false }) }, plugGroups[z]); }
  // the room's floor: an invisible plane the host raycasts for tap-to-walk
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HHROOM.x1 - HHROOM.x0, HHROOM.z0 - HHROOM.z1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((X0 + X1) / 2, .0015, (Z0 + Z1) / 2); floor.userData.floor = true; group.add(floor); pickables.push(floor);
  group.traverse(o => { if (o.name === 'hh:shadeTop' || o.name === 'hh:shadeBot' || o.name === 'hh:rain') o.renderOrder = 2; else if (o.name === 'hh:beam') o.renderOrder = 3; });

  // ------------------------------------------------------------------ flames, books, and the things that move
  const flameM = new THREE.MeshBasicMaterial({ color: '#ffc46b', toneMapped: false, fog: false });
  const flameMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(.016, .065, 8), flameM, flames.length); flameMesh.frustumCulled = false; group.add(flameMesh);
  const bookMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std({ color: '#fff', roughness: .85 }), books.length); zadd(bookMesh);
  const bm4 = new THREE.Matrix4(), bq = new THREE.Quaternion(), bcol = new THREE.Color(); books.forEach((b, i) => { bq.setFromEuler(new THREE.Euler(0, b.ry, b.lean)); bookMesh.setMatrixAt(i, bm4.compose(new THREE.Vector3(b.x, b.y, b.z), bq, new THREE.Vector3(b.bw, b.bh, .22))); bookMesh.setColorAt(i, bcol.set(b.col).multiplyScalar(.7 + R() * .6)); });
  const fallIdx = books.indexOf(fallBook);

  const lodger = (() => {
    const g = new THREE.Group(), lb = new GeoBatch();
    const limb = (r, a, b) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), geo = new THREE.CapsuleGeometry(r, d.length(), 4, 8); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); const m = A.clone().add(Bv).multiplyScalar(.5); geo.translate(m.x, m.y, m.z); lb.add('p', geo, null, 0); };
    limb(.05, [.1, .02, 0], [.12, 1.0, 0]); limb(.05, [-.1, .02, 0], [-.12, 1.0, 0]); limb(.1, [0, 1.0, 0], [0, 1.72, 0]); limb(.035, [0, 1.74, 0], [.02, 1.98, .04]);
    limb(.03, [.17, 1.68, 0], [.26, 1.0, .05]); limb(.025, [.26, 1.0, .05], [.3, .42, .1]); limb(.03, [-.17, 1.68, 0], [-.25, 1.0, .02]); limb(.025, [-.25, 1.0, .02], [-.29, .4, .06]);
    const head = new THREE.SphereGeometry(.085, 14, 12); head.scale(.82, 1.35, .9); head.translate(.03, 2.1, .06); lb.add('p', head, null, 0);
    const mat = std({ color: '#c9cbc4', roughness: .95, emissive: '#1a1c1a', emissiveIntensity: .6 }); lb.build({ p: mat }, g); g.visible = false; g.rotation.order = 'YXZ'; g.scale.setScalar(1.06); group.add(g); return g;
  })();

  // ------------------------------------------------------------------ atmosphere that moves: mist, dust, rain
  const mistT = softMist(5); mistT.repeat.set(5, 3);
  const mists = [[X0, 14.9, Z1, Z0, .14], [27.11, X1, Z1, Z0, .16], [15.1, 27.0, CORR.z0, CORR.z1, .09]].map(([x0, x1, z0, z1, o]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z0 - z1 > 0 ? z0 - z1 : z1 - z0), new THREE.MeshBasicMaterial({ map: mistT, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, color: '#8794b8' })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, .14, (z0 + z1) / 2); zadd(m); return m; });
  const dust = [motes({ n: lite ? 40 : 90, box: [8, 14.5, .4, 4.6, Z1 + .5, Z0 - .5], color: '#b9c4ff', size: .028, rise: .05, sway: .1, opacity: .55, seed: 3 }), motes({ n: lite ? 20 : 50, box: [15.5, 26.5, .5, 3.0, CORR.z0 + .2, CORR.z1 - .2], color: '#ffd9a0', size: .022, rise: .03, sway: .08, opacity: .4, seed: 5 })];
  dust.forEach(d => group.add(d.points));

  // ------------------------------------------------------------------ doors that obey the director
  const frontLeaves = [-1, 1].map(sd => { const p = new THREE.Group(); p.position.set(X0 + .05, 0, sd < 0 ? HHDOOR.z0 + .02 : HHDOOR.z1 - .02); const m = new THREE.Mesh(new THREE.BoxGeometry(.06, HHDOOR.h - .1, 1.45), M.wood); m.position.set(0, (HHDOOR.h - .1) / 2, -sd * .73); m.castShadow = false; p.add(m); const k = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), M.brass); k.position.set(.06, 1.1, -sd * 1.3); p.add(k); p.userData.sd = sd; zadd(p); return p; });
  const nurseryDoor = (() => { const p = new THREE.Group(); p.position.set(23.8, 0, -37.0); const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.25, .05), M.wood); m.position.set(-.6, 1.125, 0); p.add(m); p.rotation.y = -1.3; zadd(p); return p; })();
  const cellarLeaf = (() => { const p = new THREE.Group(); p.position.set(27.0, 0, -37.6); const m = new THREE.Mesh(new THREE.BoxGeometry(.07, 2.45, 1.6), M.wood); m.position.set(0, 1.225, -.8); p.add(m); for (const y of [.4, 1.2, 2.0]) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(.09, .07, 1.5), M.iron); s2.position.set(0, y, -.8); p.add(s2); } p.rotation.y = 1.25; zadd(p); return p; })();

  // ------------------------------------------------------------------ the lantern: the visitor's own light
  const lantern = new THREE.PointLight('#ffc27d', 0, lite ? 7 : 9, 1.6); group.add(lantern);

  // ------------------------------------------------------------------ signs and cards
  const sign = lettering(3.8, .95, g => {
    g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.05px'; g.fillText('THE HOLLOW HOUSE  ·  HALLOWEEN', 0, .28);
    g.fillStyle = '#7a1f2b'; g.font = `italic 400 .3px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('It remembers every ride.', 0, .68);
    g.fillStyle = '#5b544c'; g.font = `500 .085px ${FONT}`; g.fillText('Dark, loud, with lightning. Fiction. Reduced motion is respected.', 0, .88);
  }, 1024);
  sign.position.set(hallWallX + .02, HHDOOR.h + .75, (HHDOOR.z0 + HHDOOR.z1) / 2); sign.rotation.y = -Math.PI / 2;

  const portraitInfo = { eyebrow: 'THE PORTRAITS', title: 'They are not looking at the painter.', sub: 'Foyer · oil on canvas · original', text: 'Eight portraits hang in the front of the house. The paint is craquelured, the sitters are invented, and their eyes find you wherever you stand. The house is a fiction made for Halloween; nobody in it is a real person.' };
  for (const o of pickables) if (o.userData.portrait) o.userData.info = portraitInfo;
  infos.push(portraitInfo);
  info(tableHit, 'THE TABLE', 'Six chairs. Seven candles.', 'Parlor · the circle on the floor', 'Somebody sat down to wait for a result. The chalk is original, the candles are lit, and one chair has been turned to face the door. Nothing here is a claim about anything real.');
  info(doll.userData.head.children[0], 'THE DOLL', 'It turns when you do not look.', 'Nursery · porcelain, cloth', 'The doll only ever moves while you are looking elsewhere. That is the house rule for everything in here: nothing touches you, nothing blocks you, and nothing moves while you watch it.');
  info(ledger, 'THE LEDGER', 'Every line is a start with no finish.', 'Library · ink on foxed paper', 'Pages of tally marks and the same four words, in a hundred hands: one more lap. The names are blank on purpose. The house keeps count; it does not keep faces.');
  info(mouth, 'THE FURNACE', 'Something is still burning down here.', 'Cellar · cast iron', 'The old furnace still draws. The lights of the whole house are fed from it, which is why they falter when something stands too near the machine.');
  const bikeSpot = { kind: 'hollow', pos: new THREE.Vector3(BIKE.x, 0, BIKE.z), rotY: Math.PI / 2, bike: null };
  bikeSpot.view = new THREE.Vector3(BIKE.x - 3.4, 0, BIKE.z + .9 + (coarse && innerHeight > innerWidth ? .8 : 0));
  bikeSpot.face = new THREE.Vector3(BIKE.x, 1.0, BIKE.z);
  bikeSpot.info = { eyebrow: 'THE MACHINE', title: 'Speedmax CFR, never finished', sub: 'KONA.m Halloween livery · original', text: 'A MY2027 Speedmax CFR in a cold, pale museum-made finish, left under a sheet at the bottom of a house that remembers. The paint is ours for the night, not a Canyon colourway. The way back up is lit for you.' };

  // ------------------------------------------------------------------ the director, the atmosphere, and the per-frame update
  const dir = createDirector({ zoneOf, lodgerPath: LODGER_PATH, bikePos: [BIKE.x, BIKE.z], sconces: 6 });
  const atmo = createAtmosphere(scene);
  const pm4 = new THREE.Matrix4(), pq = new THREE.Quaternion(), pe = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  let last = 0;
  const flickerAt = (f, t, reduce) => reduce ? 1 : .86 + Math.sin(t * 8.2 + f.ph) * .08 + Math.sin(t * 15.7 + f.ph * 2) * .05;

  function update(t, reduce, P) {
    const dt = Math.min(.1, Math.max(0, t - last)); last = t;
    const fx = dir.update(t, dt, P, reduce), inside = fx.inside;
    atmo.update(dt, inside, { color: '#040307', near: 1.2, far: lite ? 17 : 23 });
    { const here = fx.zone === 'out' || fx.zone === 'door' ? null : fx.zone, show = new Set(here ? [here, ...SEES[here]] : ['foyer', 'corridor', 'cellar']);
      if (here === 'corridor') for (const [room, dx] of [['parlor', 17.2], ['nursery', 24.4], ['library', 18.6], ['dining', 23.2]]) if (Math.abs(P.x - dx) < 3.4) show.add(room);   // only the rooms whose door you are near
      for (const z of ZONES) { zg[z].visible = show.has(z); plugGroups[z].visible = !show.has(z); } }
    const fl = fx.flash, lv = fx.level.all;
    const base = inside ? 1 : 1.7;                                      // seen from the hall the house glimmers; inside it is as dark as it is meant to be
    interior.ambient.value.setRGB(.085 * base * lv + .3 * fl, .08 * base * lv + .33 * fl, .12 * base * lv + .46 * fl);
    // exterior night follows the lightning
    M.night.color.setScalar(1 + fl * 1.8); M.beam.opacity = .5 + fl * .5;
    if (!reduce) { if (M.rain.map) { M.rain.map.offset.y -= dt * 1.1; M.rain.map.offset.x += dt * .02; } mistT.offset.set(t * .01, t * .006); }
    if (inside) for (const d of dust) d.step(t);

    // flames and the lights that follow them
    for (const s of flameSrc) { const g = s.grp; s.level = (g === 'sconce' ? fx.level.sconce[s.gi] : g === 'furnace' ? fx.level.furnace : 1) * lv * (s.moon ? 1 + fl * 4 : 1); }
    pool.update(P.x, P.z, dt, inside ? 1 : .8, t, reduce);
    lantern.position.set(P.x - Math.sin(P.yaw) * .25, 1.5, P.z - Math.cos(P.yaw) * .25);
    lantern.intensity = inside ? (reduce ? 13 : 14 * (.95 + Math.sin(t * 6.1) * .02 + Math.sin(t * 13.3) * .02)) * (fx.blackout ? .35 : 1) : 0;
    flameM.color.setRGB(1, .77 * (reduce ? 1 : .88 + Math.sin(t * 9) * .08), .42);
    flames.forEach((f, i) => { const k = flickerAt(f, t, reduce); const lvl = (f.y > 1.9 && f.x > 15 && f.x < 27 && (f.z > -37.3 || f.z < -39.5) ? fx.level.sconce[Math.max(0, Math.min(5, Math.round((f.x - 16.4) / 2.1)))] : 1) * lv; pv.set(f.x + (reduce ? 0 : Math.sin(t * 3 + f.ph) * .003), f.y, f.z); pm4.compose(pv, pq.identity(), sv.set(f.s * (.9 + (k - .86)), f.s * k * 1.2 * Math.min(1, lvl * 1.4), f.s)); flameMesh.setMatrixAt(i, pm4); });
    flameMesh.instanceMatrix.needsUpdate = true;
    chand.userData.flames.forEach((p, i) => chFlames.setMatrixAt(i, pm4.makeTranslation(p[0], p[1], p[2]).scale(sv.setScalar(.9 + Math.sin(t * 8 + i * 1.3) * .06 * (reduce ? 0 : 1)).setY(lv < .5 ? .01 : 1))));
    chFlames.instanceMatrix.needsUpdate = true;
    embers.material.color.setRGB(1, .3 + (reduce ? 0 : Math.sin(t * 1.3) * .08), .07); mouth.material.color.setScalar(Math.max(.12, fx.level.furnace) * (reduce ? 1 : .92 + Math.sin(t * 2.2) * .08));

    // things that sway, rock and turn
    if (!reduce) {
      chand.rotation.z = Math.sin(t * .55) * .018 + fl * .02; chand.rotation.x = Math.sin(t * .43 + 1) * .012;
      mobile.rotation.y = t * .25; rocker.rotation.z = Math.sin(t * 1.35) * .14 * fx.rock;
      for (const b of bulbs) { b.g.rotation.z = Math.sin(t * .8 + b.ph) * .06; b.g.rotation.x = Math.cos(t * .6 + b.ph) * .045; }
      nurseryDoor.rotation.y = -1.3 + Math.sin(t * .4) * .04;
      breather.scale.set(1 + Math.sin(t * .8) * .006, 1 + Math.sin(t * .8 - .4) * .018, 1 + Math.sin(t * .8) * .006);   // the sheet at the head of the table is breathing
    }
    // front doors: they shut behind you, and swing open again before you reach them
    const target = fx.doorClosed ? 1 : 0;
    for (const p of frontLeaves) { const cur = p.userData.k ?? 0, nk = cur + (target - cur) * (1 - Math.exp(-dt * (target ? 9 : 1.6))); p.userData.k = nk; p.rotation.y = p.userData.sd * (1 - nk) * 1.75 * -1; }
    // doll head follows you only while you are not looking at it
    { const dx = P.x - doll.position.x, dz = P.z - doll.position.z, d = Math.hypot(dx, dz), head = doll.userData.head;
      const facing = -Math.sin(P.yaw) * (doll.position.x - P.x) + -Math.cos(P.yaw) * (doll.position.z - P.z) > .75 * d;
      if (!reduce && inside && d < 7 && !facing) { const want = Math.atan2(dx, dz) - doll.userData.base, turn = Math.atan2(Math.sin(want - head.rotation.y), Math.cos(want - head.rotation.y)); head.rotation.y += turn * (1 - Math.exp(-dt * 1.4)); } }
    if (reduce) doll.userData.head.rotation.y = .5;
    // portraits: the pupils find you
    if (inside) portraits.forEach((p, i) => {
      const c = Math.cos(p.ry), s = Math.sin(p.ry), nx = Math.sin(p.ry), nz = Math.cos(p.ry), dx = P.x - p.x, dz = P.z - p.z, d = Math.max(.6, Math.hypot(dx, dz));
      const offR = THREE.MathUtils.clamp(((dx * c - dz * s) / d) * .016, -.012, .012), offU = THREE.MathUtils.clamp(((1.55 - p.y) / d) * .016, -.008, .008);
      [0, 1].forEach(k => { const lx = (S.PORTRAIT[k ? 'eyeR' : 'eyeL'][0] - .5) * PW + offR, ly = (.5 - S.PORTRAIT[k ? 'eyeR' : 'eyeL'][1]) * PH + offU;
        pv.set(p.x + c * lx + nx * .005, p.y + ly, p.z - s * lx + nz * .005); pq.setFromEuler(pe.set(0, p.ry, 0)); pupils.setMatrixAt(i * 2 + k, pm4.compose(pv, pq, one)); });
    });
    pupils.instanceMatrix.needsUpdate = true;
    // the book that leaves its shelf
    if (fx.bookFall >= 0) { const a = Math.min(fx.bookFall, 1.1), y = Math.max(.14, fallBook.y - 4.9 * a * a * .5), spin = Math.min(1, a / .9) * 1.4; pv.set(fallBook.x + .12 * Math.min(1, a), y, fallBook.z + .2 * Math.min(1, a)); pq.setFromEuler(pe.set(spin * .6, fallBook.ry, spin)); bookMesh.setMatrixAt(fallIdx, pm4.compose(pv, pq, sv.set(fallBook.bw, fallBook.bh, .22))); bookMesh.instanceMatrix.needsUpdate = true; }
    // the Lodger
    if (fx.lodger) { lodger.visible = true; lodger.position.set(fx.lodger.x, 0, fx.lodger.z); lodger.rotation.y = fx.lodger.face; lodger.rotation.x = .04; } else lodger.visible = false;
    for (const c of fx.cues) onCue?.(c.name, c.delay);
  }

  // paint the surfaces in the background, one per slice
  let painted = 0, resolveReady; const ready = new Promise(r => { resolveReady = r; }); const total = jobs.length;
  const paint = () => { const j = jobs.shift(); if (!j) { resolveReady(); return; } j(); painted++; setTimeout(paint, 24); };
  setTimeout(paint, 400);
  return {
    ready, painted: () => [painted, total],
    group, floor, sign, bikeSpot, infos, zoneOf, update, director: dir,
    // the host culls the room when the visitor is far from it; whatever the room borrowed from the hall (its fog) goes back at once
    loadArt,
    hide() { atmo.update(10, false); lantern.intensity = 0; },
    // what the room asks of the renderer: one draw per visible mesh / instanced mesh / points, triangles with instances counted
    budget({ withBike = false } = {}) { let draws = 0, tris = 0; const bike = bikeSpot.bike; const shown = o => { for (let p = o; p && p !== group.parent; p = p.parent) if (!p.visible) return false; return true; }; group.traverse(o => { if (!(o.isMesh || o.isPoints || o.isLine) || !o.geometry || !shown(o)) return; if (!withBike && bike) { for (let p = o; p; p = p.parent) if (p === bike) return; } draws++; if (o.isMesh) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); } }); return { draws, tris: Math.round(tris), realLights: 1 + (lite ? 2 : 4) }; },
    setBike(bike, dress) {
      bike.traverse(o => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material) ? o.material.map(m => shieldMaterial(m.clone())) : shieldMaterial(o.material.clone());
        o.userData.info = bikeSpot.info; o.castShadow = false; delete o.userData.piece; pickables.push(o);
      });
      applySkin(slotsOf(bike), { id: 'hollow-house', name: 'The Hollow House', frame: '#8f968f', finish: { roughness: .55, metalness: .2, clearcoat: .25 }, decals: { color: '#b9f3d6', glow: '#4dffa8', intensity: .7 } });
      dress?.(bike);
      const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
      bike.position.set(-c.x, -box.min.y, -c.z);
      const holder = new THREE.Group(); holder.add(bike); holder.rotation.y = bikeSpot.rotY; holder.position.set(BIKE.x, .5, BIKE.z); zadd(holder); bikeSpot.bike = holder;
    },
  };
}
