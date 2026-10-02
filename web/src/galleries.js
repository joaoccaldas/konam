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
    const surf = {
      bio: { floor: rootTex(r.floor, r.vein, seed, [rw / 2.4, rd / 2.4]), wall: rootTex('#0f2417', '#2f8a45', seed + 1, [2, 1], .55), rough: .5, metal: 0 },
      horror: { floor: crackTex('#1b1114', '#050203', seed, [rw / 2.2, rd / 2.2], 4), wall: plasterTex('#2a1a1c', '#0b0304', seed + 1, [2, 1]), rough: .16, metal: .35 },
      alien: { floor: hexTex('#07141c', '#3dffe0', [rw / 1.6, rd / 1.6]), wall: panelTex('#0a1a22', '#3dffe0', seed + 1, [2, 1]), rough: .28, metal: .45 },
      zombie: { floor: crackTex('#3a3a26', '#15160c', seed, [rw / 2.6, rd / 2.6], 3, '#5a6a2a'), wall: crackTex('#34342a', '#1c1c14', seed + 1, [2, 1], 2), rough: .92, metal: 0 },
    }[r.id];
    const floorMat = new THREE.MeshStandardMaterial({ map: surf.floor, roughness: surf.rough, metalness: surf.metal, emissive: r.vein, emissiveIntensity: .06 });
    if (r.id === 'bio' || r.id === 'alien') floorMat.emissiveMap = surf.floor;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(rw, .1, rd), floorMat);
    slab.userData.floor = true;
    put(slab, cx, Y - .04, cz); floors.push(slab); pickables.push(slab);
    const ceilMat = r.id === 'zombie' ? new THREE.MeshBasicMaterial({ map: skyTex('#1d1a22', seed), fog: false }) : new THREE.MeshStandardMaterial({ color: r.floor, roughness: 1 });
    box(rw, .1, rd, cx, Y + 4.05, cz, ceilMat);
    const wallMat = new THREE.MeshStandardMaterial({ map: surf.wall, color: '#ffffff', roughness: .9, emissive: r.vein, emissiveIntensity: .03 });
    box(rw, 4.0, .16, cx, Y + 2.0, r.z0, wallMat);
    box(rw, 4.0, .16, cx, Y + 2.0, r.z1, wallMat);
    box(.16, 4.0, rd, NAVE.x1 + rw, Y + 2.0, cz, wallMat);
    // a lit threshold where the nave floor becomes the room's
    const sill = new THREE.Mesh(new THREE.BoxGeometry(.06, .012, rd - .3), new THREE.MeshBasicMaterial({ color: r.vein, transparent: true, opacity: .55 }));
    put(sill, NAVE.x1 - .1, Y + .012, cz);
    const ink = r.id === 'bio' || r.id === 'alien' ? '#e9ffe8' : r.id === 'zombie' ? '#f3f0c8' : '#ffd0d4';
    const mark = lettering(2.6, .62, g => {
      g.fillStyle = ink; g.font = `700 .18px ${FONT}`; g.fillText(r.name.toUpperCase(), 0, .26);
      g.font = `italic 400 .18px ${SERIF}`; g.fillText(r.sub, 0, .52);
    }, 512);
    at(mark, NAVE.x1 + .12, Y + 2.5, cz); mark.rotation.y = Math.PI / 2;
    const standX = r.id === 'horror' ? cx : cx - 2.55;
    const standZ = r.id === 'horror' ? cz + 1.7 : cz;
    const specimen = r.id === 'horror' ? new THREE.Vector3(cx, Y, cz - 1.05) : new THREE.Vector3(cx + .55, Y, cz);
    const spot = { ...r, index: i, kind: 'gallery', floorMat, group: rg, pos: new THREE.Vector3(cx, Y, cz), specimen, specimenYaw: r.id === 'horror' ? 0 : Math.PI / 2, face: new THREE.Vector3(specimen.x, Y + 1.05, specimen.z), view: new THREE.Vector3(standX, Y, standZ), bounds: { x0: NAVE.x1, x1: NAVE.x1 + rw, z0: r.z1, z1: r.z0 } };
    const lamp = new THREE.PointLight(r.id === 'horror' ? '#ffd0b0' : '#fff4e4', lite ? 7 : (r.id === 'horror' ? 2.5 : 11), 12, 1.5);
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
      if (L.id === 'bio') {
        L.pose(t);
        L.floorMat.emissiveIntensity = .12 + Math.sin(t * 1.1) * .06;
        L.podMat.emissiveIntensity = .22 + Math.sin(t * 1.9) * .1;
        L.tipMat.color.setScalar(.75 + Math.sin(t * 2.6) * .25).multiply(new THREE.Color('#c8ff7a'));
        L.glow.intensity = (lite ? 2 : 4) * (.75 + Math.sin(t * .8) * .25);
      } else if (L.id === 'horror') {
        L.pivot.rotation.z = Math.sin(t * 1.05) * .32; L.pivot.rotation.x = Math.sin(t * .7) * .08;
        const flick = (Math.sin(t * 17) > .93 || Math.sin(t * 5.3 + 1) > .985) ? .12 : 1;
        L.bulbMat.color.setScalar(flick);
        L.bulbLight.intensity = (lite ? 5 : 9) * flick;
        L.pool.material.opacity = .22 * flick;
        L.pool.position.x = L.spot.pos.x + Math.sin(L.pivot.rotation.z) * 1.55;
        L.floorMat.emissiveIntensity = .03 + flick * .05;
        for (const e of L.pairs) {                                      // blink, and now and then look a little further out
          const c = (t * e.rate + e.ph) % 7;
          e.g.scale.y = c < .12 ? .08 : 1;
          e.g.visible = c < 5.2 || flick < 1;
          e.g.position.x = e.home.x + Math.sin(t * .3 + e.ph) * .05;
        }
        for (const c of L.chains) c.g.rotation.z = Math.sin(t * .9 + c.ph) * .03;
      } else if (L.id === 'alien') {
        L.rings.forEach((ring, i) => { ring.rotation.z = t * (.3 + i * .1) * (i % 2 ? -1 : 1); ring.rotation.x = Math.PI / 2 + Math.sin(t * .4 + i) * .12; });
        L.beam.scale.y = .94 + Math.sin(t * 2.4) * .06;
        const u = (Math.sin(t * .9) + 1) / 2;                           // scan sweeps 0.15 m → 1.6 m and back
        L.scan.position.y = UPPER + .15 + u * 1.45;
        L.scanMat.opacity = .1 + Math.abs(Math.cos(t * .9)) * .12;
        L.glyphs.material.opacity = .4 + (Math.sin(t * 13) > .97 ? .35 : 0) + Math.sin(t * .6) * .1;
        L.floorMat.emissiveIntensity = .14 + Math.sin(t * 2.2) * .05;
      } else if (L.id === 'zombie') {
        L.pose(t);
        L.mist.forEach((m, i) => { m.material.map.offset.set(t * (.012 + i * .006), t * (i % 2 ? -.008 : .006)); });
        const buzz = Math.sin(t * 23) > .96 ? .35 : 1;
        L.sodium.intensity = (lite ? 4 : 8) * buzz; L.sodiumMat.color.setScalar(buzz).multiply(new THREE.Color('#ffb35a'));
      }
    }
    return inside;
  }

  return { group, floors, bays, rooms, sign, update, roomAt };
}
