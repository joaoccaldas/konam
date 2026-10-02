// Upper floor, east of the glass: a stair tower, then one gallery with four themed floors
// and three themed rooms. The ground museum stays Kona-warm. Colour up here belongs to the bay you are standing in.
import * as THREE from 'three';
import { buildInstallation } from './engine/room-installations.js';
import { rootTex, crackTex, plasterTex, hexTex, panelTex, skyTex } from './roomkit.js';

export const UPPER = 6.6;
export const EDOOR = { z0: 1.55, z1: 4.55, h: 3.4 };
const TOWER = { x0: 7.35, x1: 12.3, z0: 6.55, z1: 0.75 };
const STAIR = { x0: 8.55, x1: 11.15, z0: 1.25, z1: 5.45 };
const NAVE = { x0: 7.5, x1: 16.5, z0: 27.2, z1: 5.55 };
// All room identity, theme values and decoration references come from the world registry.
const areas=window.__ROOMS?.areas || [];
const ROOMS=areas.filter(a=>a.presentation?.kind==='room').map(a=>({...a.presentation,id:a.id.replace('room-',''),name:a.name,sub:a.sub,text:a.text}));
const BAYS=areas.filter(a=>a.presentation?.kind==='bay').map(a=>({...a.presentation,id:a.id.replace('bay-',''),title:a.name,sub:a.sub,text:a.text}));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const inTower = (x, z) => x > TOWER.x0 + .35 && x < TOWER.x1 - .35 && z > TOWER.z1 + .25 && z < TOWER.z0 - .3;
const inNave = (x, z) => x > NAVE.x0 + .4 && x < NAVE.x1 - .4 && z > NAVE.z1 + .3 && z < NAVE.z0 - .4;
const inRoom = (x, z) => ROOMS.some(r => x > NAVE.x1 - .7 && x < NAVE.x1 + 8.0 && z > r.z1 + .35 && z < r.z0 - .35);

export function galleryFloorY(x, z) {
  if (x > STAIR.x0 && x < STAIR.x1 && z >= STAIR.z0 && z <= STAIR.z1) return UPPER * clamp((z - STAIR.z0) / (STAIR.z1 - STAIR.z0), 0, 1);
  if ((inNave(x, z) || inRoom(x, z) || (inTower(x, z) && z >= STAIR.z1 - .2))) return UPPER;
  return 0;
}

export function galleryWalkable(x, z) {
  const door = x > 6.15 && x < TOWER.x0 + .5 && z > EDOOR.z0 + .25 && z < EDOOR.z1 - .25;
  return door || inTower(x, z) || inNave(x, z) || inRoom(x, z);
}

function tex(base, vein) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = vein; g.globalAlpha = .55; g.lineWidth = 3;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(0, i * 40); g.lineTo(256, i * 40 + 18); g.stroke(); }
  g.globalAlpha = .35; g.strokeRect(8, 8, 240, 240);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function resolveRoomTexture(spec, room, seed, rw, rd) {
  if (!spec?.kind) throw new Error(`Room ${room.id} is missing a surface texture kind`);
  const value = v => v === '$floor' ? room.floor : v === '$vein' ? room.vein : v;
  const base=value(spec.base), vein=value(spec.vein);
  const repeat=spec.repeat || [
    rw / (spec.repeat_divisor?.[0] || 2.4),
    rd / (spec.repeat_divisor?.[1] || 2.4)
  ];
  if(spec.kind==='root') return rootTex(base,vein,seed,repeat,spec.detail);
  if(spec.kind==='crack') return crackTex(base,vein,seed,repeat,spec.detail,spec.accent);
  if(spec.kind==='plaster') return plasterTex(base,vein,seed,repeat);
  if(spec.kind==='hex') return hexTex(base,vein,repeat);
  if(spec.kind==='panel') return panelTex(base,vein,seed,repeat);
  throw new Error(`Unknown room surface texture: ${spec.kind}`);
}

function roomSurface(room, seed, rw, rd) {
  const s=room.surface;
  if(!s?.floor || !s?.wall) throw new Error(`Room ${room.id} has no declarative surface contract`);
  return {
    floor:resolveRoomTexture(s.floor,room,seed,rw,rd),
    wall:resolveRoomTexture(s.wall,room,seed+1,rw,rd),
    rough:s.roughness,
    metal:s.metalness,
    floorEmissiveMap:!!s.floor_emissive_map,
    ceiling:s.ceiling || {kind:'solid'},
    ink:s.ink || '#f3ede4'
  };
}

export function buildGalleries(ctx) {
  const { scene, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'galleries'; scene.add(group);
  const stone = new THREE.MeshStandardMaterial({ color: '#e4d9c8', roughness: .9 });
  const naveMap = tex('#e4d9c8', '#b7a894');
  naveMap.repeat.set((NAVE.x1 - NAVE.x0) / 1.2, (NAVE.z0 - NAVE.z1) / 1.2);
  const naveFloor = new THREE.MeshStandardMaterial({ map: naveMap, color: '#ffffff', roughness: .86 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#d5e4ea', roughness: .06, transmission: .55, transparent: true, opacity: .28, depthWrite: false });
  const Y = UPPER;
  const at = (mesh, x, y, z) => { mesh.position.set(x, y, z); group.add(mesh); return mesh; };

  // tower: glass lantern around a ramp
  const rise = STAIR.z1 - STAIR.z0;
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(STAIR.x1 - STAIR.x0, .08, Math.hypot(rise, Y)), stone);
  ramp.rotation.x = -Math.atan2(Y, rise);
  at(ramp, (STAIR.x0 + STAIR.x1) / 2, Y / 2 - .02, (STAIR.z0 + STAIR.z1) / 2);
  const treads = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, .04, .08), new THREE.MeshStandardMaterial({ color: '#cabbab' }), 14);
  for (let i = 0; i < 14; i++) {
    const u = (i + .5) / 14;
    treads.setMatrixAt(i, new THREE.Matrix4().makeRotationX(-Math.atan2(Y, rise)).setPosition((STAIR.x0 + STAIR.x1) / 2, u * Y + .06, STAIR.z0 + u * rise));
  }
  group.add(treads);
  const th = Y + 4.6;
  const wall = (w, h, d, x, y, z, mat = stone) => at(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
  wall(.16, th, TOWER.z0 - TOWER.z1, TOWER.x0, th / 2, (TOWER.z0 + TOWER.z1) / 2, glass);
  wall(.16, th, TOWER.z0 - TOWER.z1, TOWER.x1, th / 2, (TOWER.z0 + TOWER.z1) / 2, glass);
  wall(TOWER.x1 - TOWER.x0, th, .16, (TOWER.x0 + TOWER.x1) / 2, th / 2, TOWER.z1, glass);
  // landing at the top of the stair, opening north into the nave
  const deck = new THREE.Mesh(new THREE.BoxGeometry(NAVE.x1 - NAVE.x0, .16, NAVE.z0 - NAVE.z1), naveFloor);
  deck.userData.floor = true;
  at(deck, (NAVE.x0 + NAVE.x1) / 2, Y - .08, (NAVE.z0 + NAVE.z1) / 2);
  // north wall, with the doorway into Against the Clock (x 11.8–15.4, see atlas.js)
  wall(11.8 - NAVE.x0, 4.4, .18, (NAVE.x0 + 11.8) / 2, Y + 2.2, NAVE.z0);
  wall(NAVE.x1 - 15.4, 4.4, .18, (15.4 + NAVE.x1) / 2, Y + 2.2, NAVE.z0);
  wall(15.4 - 11.8, 1.0, .18, 13.6, Y + 3.9, NAVE.z0);
  wall(.18, 4.4, NAVE.z0 - NAVE.z1, NAVE.x0, Y + 2.2, (NAVE.z0 + NAVE.z1) / 2, glass);

  const floors = [deck];
  const bays = BAYS.map((b, i) => {
    const bayMap = tex(b.floor, b.vein); bayMap.repeat.set(6.4 / 1.15, 3.6 / 1.15);
    const mat = new THREE.MeshStandardMaterial({ map: bayMap, roughness: .55, color: '#ffffff' });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(6.4, .04, 3.6), mat);
    pad.userData.floor = true; pad.userData.gallery = b;
    at(pad, 11.6, Y + .02, b.z); floors.push(pad); pickables.push(pad);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshStandardMaterial({ color: b.floor, roughness: .8, emissive: b.vein, emissiveIntensity: .12 }));
    at(panel, NAVE.x0 + .24, Y + 1.8, b.z);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#1c1916', roughness: .55 });
    const canvasMat = new THREE.MeshStandardMaterial({ color: b.floor, roughness: .62, emissive: b.vein, emissiveIntensity: .42 });
    at(new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.95, .1), frameMat), 9.2, Y + 1.55, b.z);
    const canvas = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, .04), canvasMat);
    at(canvas, 9.28, Y + 1.55, b.z);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.45, .05), new THREE.MeshBasicMaterial({ color: b.vein }));
    at(stripe, 9.32, Y + 1.55, b.z + (i % 2 ? .35 : -.35));
    const bayPlinth = new THREE.Mesh(new THREE.CylinderGeometry(.55, .62, .22, 12), new THREE.MeshStandardMaterial({ color: b.floor, roughness: .7, emissive: b.vein, emissiveIntensity: .18 }));
    at(bayPlinth, 11.15, Y + .14, b.z);
    const cap = lettering(2.4, .36, g => {
      g.fillStyle = '#1c1916'; g.font = `600 .08px ${FONT}`; g.fillText(b.title.toUpperCase(), 0, .12);
      g.fillStyle = '#6d6458'; g.font = `italic 400 .12px ${SERIF}`; g.fillText(b.sub, 0, .3);
    }, 512);
    cap.rotation.x = -Math.PI / 2; at(cap, 11.6, Y + .05, b.z + 1.55);
    const back = 2.4 + (coarse && innerHeight > innerWidth ? .8 : 0);
    return { ...b, index: i, kind: 'gallery', pos: new THREE.Vector3(9.4, Y, b.z), face: new THREE.Vector3(9.4, Y + 1.3, b.z), view: new THREE.Vector3(13.4, Y, b.z + (i % 2 ? .2 : -.2)), viewBack: back };
  });
  // keep the visitor off the wall panels
  for (const b of bays) obstacles.push({ box: [NAVE.x0 + .05, NAVE.x0 + 1.1, b.z - 1.5, b.z + 1.5] });

  // ---------------------------------------------------------------- theme rooms
  // Each room is its own group so it can be hidden when you are not looking into it,
  // and its animation only runs while it can be seen (see update()).
  const live = [];
  const rooms = ROOMS.map((r, i) => {
    const rw = 8.6, rd = r.z0 - r.z1, cx = NAVE.x1 + rw / 2, cz = (r.z0 + r.z1) / 2;
    const rg = new THREE.Group(); rg.name = `room-${r.id}`; group.add(rg);
    const put = (mesh, x, y, z) => { mesh.position.set(x, y, z); rg.add(mesh); return mesh; };
    const box = (w, h, d, x, y, z, mat) => put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
    const seed = 101 + i * 37;
    const surf = roomSurface(r,seed,rw,rd);
    const floorMat = new THREE.MeshStandardMaterial({ map: surf.floor, roughness: surf.rough, metalness: surf.metal, emissive: r.vein, emissiveIntensity: .06 });
    if (surf.floorEmissiveMap) floorMat.emissiveMap = surf.floor;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(rw, .1, rd), floorMat);
    slab.userData.floor = true;
    put(slab, cx, Y - .04, cz); floors.push(slab); pickables.push(slab);
    const ceilMat = surf.ceiling.kind === 'sky'
      ? new THREE.MeshBasicMaterial({ map: skyTex(surf.ceiling.color || r.floor, seed), fog: false })
      : new THREE.MeshStandardMaterial({ color: surf.ceiling.color || r.floor, roughness: 1 });
    box(rw, .1, rd, cx, Y + 4.05, cz, ceilMat);
    const wallMat = new THREE.MeshStandardMaterial({ map: surf.wall, color: '#ffffff', roughness: .9, emissive: r.vein, emissiveIntensity: .03 });
    box(rw, 4.0, .16, cx, Y + 2.0, r.z0, wallMat);
    box(rw, 4.0, .16, cx, Y + 2.0, r.z1, wallMat);
    box(.16, 4.0, rd, NAVE.x1 + rw, Y + 2.0, cz, wallMat);
    // a lit threshold where the nave floor becomes the room's
    const sill = new THREE.Mesh(new THREE.BoxGeometry(.06, .012, rd - .3), new THREE.MeshBasicMaterial({ color: r.vein, transparent: true, opacity: .55 }));
    put(sill, NAVE.x1 - .1, Y + .012, cz);
    const ink = surf.ink;
    const mark = lettering(2.6, .62, g => {
      g.fillStyle = ink; g.font = `700 .18px ${FONT}`; g.fillText(r.name.toUpperCase(), 0, .26);
      g.font = `italic 400 .18px ${SERIF}`; g.fillText(r.sub, 0, .52);
    }, 512);
    at(mark, NAVE.x1 + .12, Y + 2.5, cz); mark.rotation.y = Math.PI / 2;
    const staging=r.staging || {};
    const standX = cx + (staging.stand_dx ?? -2.55);
    const standZ = cz + (staging.stand_dz ?? 0);
    const specimen = new THREE.Vector3(cx + (staging.specimen_dx ?? .55), Y, cz + (staging.specimen_dz ?? 0));
    const spot = { ...r, index: i, kind: 'gallery', floorMat, group: rg, pos: new THREE.Vector3(cx, Y, cz), specimen, specimenYaw: staging.specimen_yaw ?? Math.PI / 2, face: new THREE.Vector3(specimen.x, Y + 1.05, specimen.z), view: new THREE.Vector3(standX, Y, standZ), bounds: { x0: NAVE.x1, x1: NAVE.x1 + rw, z0: r.z1, z1: r.z0 } };
    const lampSpec=r.lamp || {};
    const lamp = new THREE.PointLight(lampSpec.color || '#fff4e4', lite ? (lampSpec.lite_intensity ?? 7) : (lampSpec.intensity ?? 11), 12, 1.5);
    lamp.position.set(specimen.x, Y + 2.8, specimen.z); rg.add(lamp);
    slab.userData.gallery = spot;
    const L = buildInstallation(r.decoration,{group:rg,bounds:spot.bounds,elevation:Y,specimen,lite,obstacles,floorMat,seed});
    L.spot=spot;

    live.push(L);
    return spot;
  });

  const title = lettering(4.2, .7, g => {
    g.fillStyle = '#1c1916'; g.font = `700 .16px ${FONT}`; g.letterSpacing = '.08px'; g.fillText('THE GALLERIES', 0, .26);
    g.fillStyle = '#6d6458'; g.font = `italic 400 .22px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Bio. Horror. Alien. Zombie.', 0, .58);
  }, 1024);
  at(title, (NAVE.x0 + NAVE.x1) / 2, Y + 3.6, NAVE.z1 + .3);

  const sign = lettering(2.2, .7, g => {
    g.fillStyle = '#12181d'; g.font = `700 .16px ${FONT}`; g.fillText('GALLERIES', 0, .24);
    g.fillStyle = '#6d6458'; g.font = `italic 400 .2px ${SERIF}`; g.fillText('Upper floor', 0, .55);
  }, 512);
  sign.position.set(hallWallX - .05, EDOOR.h + .55, (EDOOR.z0 + EDOOR.z1) / 2);

  addEventListener('museum-art-ready', () => {
    const list = window.__museumArt?.installations || [];
    for (const inst of list) {
      const bay = bays.find(b => b.id === inst.def?.id);
      if (!bay || bay.art) continue;
      const clone = inst.g.clone(true);
      clone.position.set(11.15, Y + .28, bay.z);
      clone.rotation.y = Math.PI / 2;
      group.add(clone);
      bay.art = clone;
    }
  });

  const baseFog = new THREE.Color('#e6eef0');
  const fogOf = Object.fromEntries(rooms.map(r => [r.id, new THREE.Color(r.fog)]));
  const roomAt = (x, z) => rooms.find(r => x > NAVE.x1 - .3 && x < NAVE.x1 + 8.4 && z > r.z1 + .2 && z < r.z0 - .2) || null;
  // upstairs: which rooms can be seen. Inside a room, only that room (its walls hide the rest);
  // in the nave, the rooms whose openings are near; downstairs, none.
  function visibleRooms(visitor, region) {
    if (region !== 'gallery' && region !== 'stair') return [];
    const inside = roomAt(visitor.x, visitor.z);
    if (inside) return [inside];
    return rooms.filter(r => Math.abs((r.z0 + r.z1) / 2 - visitor.z) < 11 || visitor.x > NAVE.x1 - 3);
  }
  function update(t, visitor, reduce, scene, renderer, region = 'gallery') {
    const inside = roomAt(visitor.x, visitor.z);
    if (scene?.fog) scene.fog.color.copy(inside ? fogOf[inside.id] : baseFog);
    if (renderer) {
      const want = inside ? inside.exposure : .96;
      renderer.toneMappingExposure += (want - renderer.toneMappingExposure) * (reduce ? 1 : .08);
    }
    const seen = visibleRooms(visitor, region);
    for (const L of live) {
      const on = seen.includes(L.spot);                              // walls and floors always draw; only the bike and the motion are culled
      L.group.visible = on; // architecture stays visible; hidden rooms spend no decor/light draw calls
      if (L.spot.bike) L.spot.bike.visible = on;
      for (const m of L.motes) m.points.visible = on;
      if (!on || reduce) continue;
      for (const m of L.motes) m.step(t);
      L.update?.(t);
    }
    return inside;
  }

  return { group, floors, bays, rooms, sign, update, roomAt };
}
