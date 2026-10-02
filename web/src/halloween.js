// Lava Night: the museum's Halloween room, through a doorway beside the entrance.
// A basalt chamber lit by what it contains: lava glowing through cracks in the floor,
// jack-o'-lanterns, candles, a full moon over the Kona coast in the west window, and the
// Speedmax CFR in a museum-made "Lava Night" livery (black paint, glowing orange lettering).
//
// Mobile first: no real lights are added (every point light would cost every material in the
// museum); the glow is emissive colour and additive light pools. Lanterns, candles and flames
// are instanced (one draw call each), the skeleton and webs are merged, and the room is hidden
// whenever the visitor can't see into it.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { slotsOf, applySkin } from './engine/skins.js';

export const HROOM = { x0: -18.3, x1: -7.3, z0: 4.8, z1: -8.4, h: 4.4 };
export const HDOOR = { z0: 1.0, z1: 4.0, h: 3.4 };
const ORANGE = '#ff7a1a', EMBER = '#ff4d00', MOON = '#f6f1dc';

export function hweenWalkable(x, z, WALK) {
  const inDoor = x < WALK.x0 + .1 && x > HROOM.x1 - .6 && z < HDOOR.z1 - .45 && z > HDOOR.z0 + .45;
  const inRoom = x > HROOM.x0 + .6 && x < HROOM.x1 - .4 && z < HROOM.z0 - .6 && z > HROOM.z1 + .6;
  return inDoor || inRoom;
}

export function buildHalloween(ctx) {
  const { scene, canvasTex, lettering, lightPool, basaltTex, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'hweenRoom'; scene.add(group);
  const RW = HROOM.x1 - HROOM.x0, RD = HROOM.z0 - HROOM.z1, CX = (HROOM.x0 + HROOM.x1) / 2, CZ = (HROOM.z0 + HROOM.z1) / 2;
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const rnd = (() => { let s = 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  // ---- floor: cracked basalt with lava showing through (the cracks are the emissive map)
  const cracks = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const crack = (x, y, a, len, width, depth) => {
      g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < len; i++) { a += (rnd() - .5) * .7; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); if (depth < 2 && rnd() < .07) crack(x, y, a + (rnd() > .5 ? 1 : -1) * (.6 + rnd()), len * .5, width * .6, depth + 1); }
      g.lineWidth = width * 3.2; g.strokeStyle = 'rgba(120,28,0,.55)'; g.stroke();
      g.lineWidth = width * 1.4; g.strokeStyle = '#c23a00'; g.stroke();
      g.lineWidth = width * .5; g.strokeStyle = '#ffc24d'; g.stroke();
    };
    for (let i = 0; i < 7; i++) crack(rnd() * w, rnd() * h, rnd() * 6.28, 22 + rnd() * 26, 4 + rnd() * 4, 0);
  }, [RW / 5.5, RD / 5.5]);
  const floorTex = basaltTex.clone(); floorTex.repeat.set(RW / 2, RD / 2); floorTex.needsUpdate = true;
  const lavaFloor = new THREE.MeshStandardMaterial({ map: floorTex, color: '#1c181a', roughness: .5, metalness: .1, emissive: new THREE.Color('#ffffff'), emissiveMap: cracks, emissiveIntensity: 1, envMapIntensity: .15 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .2, RD), lavaFloor);
  floor.position.set(CX, -.1, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor);

  // ---- walls and ceiling: dark basalt; they cast shadow so the sun never gets in
  const wallM = new THREE.MeshStandardMaterial({ map: basaltTex, color: '#3a3238', roughness: .9, envMapIntensity: .1 });
  const walls = [];
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); walls.push(g); };
  box(RW + .6, .3, RD + .6, CX, HROOM.h + .15, CZ);                                     // ceiling
  box(RW + .3, HROOM.h, .3, CX, HROOM.h / 2, HROOM.z0 + .15);                           // south
  box(RW + .3, HROOM.h, .3, CX, HROOM.h / 2, HROOM.z1 - .15);                           // north
  const win = { z0: -3.6, z1: 1.2, y0: 1.3, y1: 3.7 };                                  // the moon window, west wall
  box(.3, HROOM.h, HROOM.z0 - win.z1, HROOM.x0 - .15, HROOM.h / 2, (HROOM.z0 + win.z1) / 2);
  box(.3, HROOM.h, win.z0 - HROOM.z1, HROOM.x0 - .15, HROOM.h / 2, (win.z0 + HROOM.z1) / 2);
  box(.3, win.y0, win.z1 - win.z0, HROOM.x0 - .15, win.y0 / 2, (win.z0 + win.z1) / 2);
  box(.3, HROOM.h - win.y1, win.z1 - win.z0, HROOM.x0 - .15, (win.y1 + HROOM.h) / 2, (win.z0 + win.z1) / 2);
  const wallMesh = new THREE.Mesh(mergeGeometries(walls), wallM); wallMesh.castShadow = wallMesh.receiveShadow = true; group.add(wallMesh);
  // the hall side of the east wall is the museum's plaster wall; inside it needs a dark face
  { const faces = [];                                                // three pieces, leaving the doorway open
    const face = (z0, z1, y0, y1) => { const g = new THREE.PlaneGeometry(z0 - z1, y1 - y0); g.rotateY(-Math.PI / 2); g.translate(hallWallX - .31, (y0 + y1) / 2, (z0 + z1) / 2); faces.push(g); };
    face(HROOM.z0, HDOOR.z1, 0, HROOM.h); face(HDOOR.z0, HROOM.z1, 0, HROOM.h); face(HDOOR.z1, HDOOR.z0, HDOOR.h, HROOM.h);
    group.add(new THREE.Mesh(mergeGeometries(faces), wallM)); }

  // ---- night outside the window: stars, the moon, the sea catching it
  {
    const sky = canvasTex(1024, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05060d'); gr.addColorStop(.62, '#13162b'); gr.addColorStop(.63, '#070a14'); gr.addColorStop(1, '#0b1020');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(255,255,255,${.25 + rnd() * .75})`; g.fillRect(rnd() * w, rnd() * h * .6, rnd() < .1 ? 2 : 1, rnd() < .1 ? 2 : 1); }
      const cx = w * .56, cy = h * .3, r = 58;
      const halo = g.createRadialGradient(cx, cy, r, cx, cy, r * 4); halo.addColorStop(0, 'rgba(246,241,220,.35)'); halo.addColorStop(1, 'rgba(246,241,220,0)');
      g.fillStyle = halo; g.fillRect(0, 0, w, h * .62);
      g.fillStyle = MOON; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(160,150,120,${.18 + rnd() * .2})`; g.beginPath(); g.arc(cx + (rnd() - .5) * r * 1.3, cy + (rnd() - .5) * r * 1.3, 4 + rnd() * 12, 0, 7); g.fill(); }
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(246,241,220,${.08 + rnd() * .3})`; g.fillRect(cx - 80 + rnd() * 160 * (1 + i / 60), h * .64 + i * 1.9, 20 + rnd() * 60, 1.5); }   // moon path on the sea
      g.fillStyle = '#020204'; g.beginPath(); g.moveTo(0, h * .63); for (let x = 0; x <= w * .3; x += 20) g.lineTo(x, h * (.63 - .05 * Math.sin(x / 90) - .02)); g.lineTo(w * .3, h * .63); g.fill();   // headland
    });
    const night = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: sky, fog: false }));
    night.rotation.y = Math.PI / 2; night.position.set(HROOM.x0 - 3.2, 2.6, (win.z0 + win.z1) / 2); group.add(night);
    const mull = []; for (let i = 0; i <= 3; i++) { const g = new THREE.BoxGeometry(.08, win.y1 - win.y0, .08); g.translate(HROOM.x0, (win.y0 + win.y1) / 2, win.z0 + (win.z1 - win.z0) * i / 3); mull.push(g); }
    const bar = new THREE.BoxGeometry(.08, .08, win.z1 - win.z0); bar.translate(HROOM.x0, win.y0 + (win.y1 - win.y0) * .55, (win.z0 + win.z1) / 2); mull.push(bar);
    group.add(new THREE.Mesh(mergeGeometries(mull), new THREE.MeshStandardMaterial({ color: '#0d0d10', roughness: .6 })));
    group.add(at(lightPool(3.2, 5, '#9fb4ff', .2), HROOM.x0 + 1.8, .006, (win.z0 + win.z1) / 2));   // moonlight on the floor
  }

  // ---- jack-o'-lanterns: one instanced mesh; the carved face is the only emissive part
  const faceTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const glow = (path) => { g.save(); g.shadowColor = '#ffcc55'; g.shadowBlur = 14; g.fillStyle = '#ffd27a'; path(); g.fill(); g.restore(); };
    const cx = w * .25;                                                  // the face sits on the front quarter of the wrap
    glow(() => { g.beginPath(); g.moveTo(cx - 44, 108); g.lineTo(cx - 20, 70); g.lineTo(cx - 6, 108); g.closePath(); });
    glow(() => { g.beginPath(); g.moveTo(cx + 44, 108); g.lineTo(cx + 20, 70); g.lineTo(cx + 6, 108); g.closePath(); });
    glow(() => { g.beginPath(); g.moveTo(cx - 6, 124); g.lineTo(cx + 6, 124); g.lineTo(cx, 112); g.closePath(); });
    glow(() => { g.beginPath(); g.moveTo(cx - 54, 140); for (let i = 0; i <= 8; i++) g.lineTo(cx - 54 + i * 13.5, 140 + (i % 2 ? 10 : 0) + Math.sin(i / 8 * Math.PI) * 26); for (let i = 8; i >= 0; i--) g.lineTo(cx - 54 + i * 13.5, 150 + Math.sin(i / 8 * Math.PI) * 36 - (i % 2 ? 0 : 8)); g.closePath(); });
  });
  const pumpkinGeo = (() => {
    const g = new THREE.SphereGeometry(.3, 40, 20), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), rib = 1 - .075 * Math.pow(Math.abs(Math.sin(a * 4)), .6); v.x *= rib; v.z *= rib; v.y *= .78; if (v.y > .19) v.y -= (v.y - .19) * .6; p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  })();
  const pumpkinM = new THREE.MeshStandardMaterial({ color: '#e8641a', roughness: .55, emissive: new THREE.Color('#ffae42'), emissiveMap: faceTex, emissiveIntensity: 2.2 });
  const lanterns = [
    [HROOM.x1 - .9, HROOM.z0 - .8, 1, -2.2], [HROOM.x1 - 1.6, HROOM.z0 - .7, .75, -2.6], [HROOM.x0 + .8, HROOM.z0 - .8, 1.1, -.8],
    [HROOM.x0 + .8, HROOM.z1 + .8, 1, .9], [HROOM.x0 + 1.5, HROOM.z1 + .7, .7, 1.2], [HROOM.x1 - .9, HROOM.z1 + .8, .95, 2.3],
    [CX - 1.6, CZ - 2.6, .8, -1.2], [CX + 1.7, CZ + 2.8, .85, -1.9], [HROOM.x0 + .7, win.z1 + .7, .6, -.3], [HROOM.x0 + .7, win.z0 - .7, .65, .3],
  ];
  const pk = new THREE.InstancedMesh(pumpkinGeo, pumpkinM, lanterns.length);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.025, .04, .12, 8), new THREE.MeshStandardMaterial({ color: '#4d5a26', roughness: .8 }), lanterns.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  lanterns.forEach(([x, z, s, ry], i) => {
    q.setFromAxisAngle(up, Math.atan2(CX - x, CZ - z) + ry * .12);       // the carved face (+z of the sphere's wrap) looks into the room
    pk.setMatrixAt(i, m4.compose(new THREE.Vector3(x, .234 * s, z), q, new THREE.Vector3(s, s, s)));
    stems.setMatrixAt(i, m4.compose(new THREE.Vector3(x, .46 * s, z), q, new THREE.Vector3(s, s, s)));
    group.add(at(lightPool(1.6 * s, 1.6 * s, ORANGE, .5), x, .006, z));
    obstacles.push({ c: new THREE.Vector3(x, 0, z), r: .45 * s });
  });
  pk.castShadow = !lite; group.add(pk, stems);

  // ---- candles on the window sill and the plinth corners (instanced), flames flicker in update()
  const candles = [];
  for (let i = 0; i < 7; i++) candles.push([HROOM.x0 + .12, win.y0 + .02, win.z0 + .3 + i * (win.z1 - win.z0 - .6) / 6, .12 + (i % 3) * .06]);
  const wax = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .03, 1, 12), new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: .6, emissive: '#ff9a3c', emissiveIntensity: .12 }), candles.length);
  const flameM = new THREE.MeshBasicMaterial({ color: '#ffc46b', toneMapped: false });
  const flames = new THREE.InstancedMesh(new THREE.ConeGeometry(.018, .06, 8), flameM, candles.length);
  candles.forEach(([x, y, z, hgt], i) => { wax.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y + hgt / 2, z), q.identity(), new THREE.Vector3(1, hgt, 1))); flames.setMatrixAt(i, m4.makeTranslation(x, y + hgt + .04, z)); });
  group.add(wax, flames);

  // ---- cobwebs in the ceiling corners (one line mesh)
  {
    const pts = [];
    for (const [cx, cz, sx, sz] of [[HROOM.x0, HROOM.z0, 1, -1], [HROOM.x1, HROOM.z1, -1, 1], [HROOM.x0, HROOM.z1, 1, 1]]) {
      const O = new THREE.Vector3(cx, HROOM.h, cz), spokes = 7, R = 1.3;
      const spokeEnd = k => { const a = k / (spokes - 1); return O.clone().add(new THREE.Vector3(sx * R * (1 - a), -R * .8 * Math.sin(a * Math.PI / 2) - .05, sz * R * a)); };
      for (let k = 0; k < spokes; k++) pts.push(O, spokeEnd(k));
      for (let r = 1; r <= 5; r++) for (let k = 0; k < spokes - 1; k++) { const t = r / 5.4; pts.push(O.clone().lerp(spokeEnd(k), t).add(new THREE.Vector3(0, -.03 * r, 0)), O.clone().lerp(spokeEnd(k + 1), t).add(new THREE.Vector3(0, -.03 * r, 0))); }
    }
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#cfc9d6', transparent: true, opacity: .45 })));
  }

  // ---- bats circling under the ceiling
  const bats = [];
  {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(.12, .08, .26, .05); shape.lineTo(.22, -.02); shape.quadraticCurveTo(.18, .02, .15, -.03); shape.quadraticCurveTo(.1, .01, .07, -.04); shape.quadraticCurveTo(.04, -.01, 0, -.03); shape.closePath();
    const wing = new THREE.ShapeGeometry(shape); wing.rotateX(-Math.PI / 2);
    const bm = new THREE.MeshBasicMaterial({ color: '#0b0a0d', side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const o = new THREE.Group(), l = new THREE.Mesh(wing, bm), r = new THREE.Mesh(wing, bm); r.scale.x = -1; o.add(l, r);
      const body = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), bm); body.scale.set(1, .8, 1.6); o.add(body);
      o.scale.setScalar(1.2 + (i % 3) * .25); group.add(o);
      bats.push({ o, l, r, c: new THREE.Vector3(CX + (i % 2 ? 1.4 : -1.6), 3.4 + (i % 3) * .25, CZ + (i % 3 - 1) * 2), rad: 1.1 + (i % 3) * .6, speed: .7 + (i % 4) * .18, phase: i * 1.3, flap: 16 + (i % 3) * 4 });
    }
  }

  // ---- the skeleton: a finisher with an arm raised, merged bones (one mesh)
  const skeleton = (() => {
    const bones = [], cap = (r, len, a, b) => { const g = new THREE.CapsuleGeometry(r, len, 4, 8); const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const mid = A.clone().add(B).multiplyScalar(.5), d = B.clone().sub(A); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(mid.x, mid.y, mid.z); bones.push(g); };
    const skull = new THREE.SphereGeometry(.11, 20, 14); skull.scale(1, 1.08, 1.12); skull.translate(0, 1.6, 0); bones.push(skull);
    const jaw = new THREE.BoxGeometry(.13, .05, .1); jaw.translate(0, 1.49, .035); bones.push(jaw);
    cap(.022, .12, [0, 1.46, 0], [0, 1.36, 0]);                                    // neck
    cap(.03, .5, [0, 1.34, 0], [0, .93, 0]);                                       // spine
    for (let i = 0; i < 6; i++) { const y = 1.28 - i * .055, w = .14 - Math.abs(i - 2) * .012; const r = new THREE.TorusGeometry(w, .011, 5, 20, Math.PI * 1.5); r.rotateX(Math.PI / 2); r.rotateY(Math.PI * .25 + Math.PI); r.scale(1, 1, .75); r.translate(0, y, .01); bones.push(r); }
    cap(.018, .3, [-.17, 1.3, 0], [.17, 1.3, 0]);                                  // collarbones
    const pelvis = new THREE.TorusGeometry(.12, .03, 6, 16); pelvis.rotateX(Math.PI / 2 - .3); pelvis.translate(0, .9, 0); bones.push(pelvis);
    cap(.022, .26, [.18, 1.3, 0], [.28, 1.58, .02]); cap(.018, .24, [.28, 1.58, .02], [.34, 1.86, .06]);   // right arm, raised
    cap(.022, .26, [-.18, 1.3, 0], [-.24, 1.02, .04]); cap(.018, .24, [-.24, 1.02, .04], [-.22, .78, .12]); // left arm
    cap(.028, .38, [.08, .88, 0], [.1, .47, .02]); cap(.024, .36, [.1, .47, .02], [.1, .06, -.01]);        // legs
    cap(.028, .38, [-.08, .88, 0], [-.1, .47, .02]); cap(.024, .36, [-.1, .47, .02], [-.1, .06, -.01]);
    for (const x of [.1, -.1]) { const f = new THREE.BoxGeometry(.07, .035, .17); f.translate(x, .02, .05); bones.push(f); }
    for (const [x, y, z] of [[.34, 1.9, .07], [-.22, .74, .13]]) { const h = new THREE.SphereGeometry(.035, 8, 6); h.translate(x, y, z); bones.push(h); }
    const norm = bones.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal'].includes(a)) n.deleteAttribute(a); return n; });
    const m = new THREE.Mesh(mergeGeometries(norm), new THREE.MeshStandardMaterial({ color: '#e9e1cd', roughness: .7, emissive: '#ff7a1a', emissiveIntensity: .05 }));
    m.castShadow = !lite;
    const g = new THREE.Group(); g.add(m);
    const eyes = new THREE.MeshBasicMaterial({ color: '#ff8a2a', toneMapped: false });
    for (const x of [.04, -.04]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), eyes); e.position.set(x, 1.62, .095); g.add(e); }
    return g;
  })();
  skeleton.position.set(CX - .2, 0, CZ - 2.35); skeleton.rotation.y = Math.PI / 2 + .35; group.add(skeleton);
  obstacles.push({ c: skeleton.position.clone(), r: .45 });

  // ---- plinth for the bike, with a molten edge
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.4, .42, 1.1), new THREE.MeshStandardMaterial({ map: basaltTex, color: '#2c2629', roughness: .4, metalness: .1 }));
  const bikePos = new THREE.Vector3(CX - .4, 0, CZ + .2);
  plinth.position.set(bikePos.x, .21, bikePos.z); plinth.castShadow = plinth.receiveShadow = true; group.add(plinth);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(2.44, .02, 1.14), new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false })); edge.position.set(bikePos.x, .43, bikePos.z); group.add(edge);
  group.add(at(lightPool(4.2, 2.8, EMBER, .55), bikePos.x, .007, bikePos.z));
  obstacles.push({ box: [bikePos.x - 1.5, bikePos.x + 1.5, bikePos.z - .85, bikePos.z + .85] });

  // ---- lettering: over the doorway in the hall, and the wall text inside
  const sign = lettering(3.4, .95, g => {
    g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.05px'; g.fillText('LAVA NIGHT  ·  HALLOWEEN', 0, .28);
    g.fillStyle = ORANGE; g.font = `italic 400 .36px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Enter if you dare.', 0, .76);
  }, 1024);
  sign.position.set(hallWallX + .02, HDOOR.h + .8, (HDOOR.z0 + HDOOR.z1) / 2 - .1); sign.rotation.y = Math.PI / 2;
  const inside = lettering(4.4, 1.3, g => {
    g.fillStyle = ORANGE; g.font = `italic 400 .5px ${SERIF}`; g.fillText('Lava Night', 0, .5);
    g.fillStyle = '#d9cfc4'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.02px';
    g.fillText('Midnight on the Queen K: the lava field glows, the lanterns', 0, .78); g.fillText('are lit, and one Speedmax wears black and ember.', 0, .92);
  }, 1024);
  inside.position.set(CX, 3.2, HROOM.z1 + .02); group.add(inside);

  // ---- mist over the floor: one additive plane drifting
  const mistTex = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 60; i++) { const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(200,190,220,.16)'); gr.addColorStop(1, 'rgba(200,190,220,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }, [2, 2]);
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  mist.rotation.x = -Math.PI / 2; mist.position.set(CX, .12, CZ); group.add(mist);

  const piece = { kind: 'hween', pos: bikePos, bike: null, rotY: Math.PI / 2 };
  piece.view = new THREE.Vector3(HROOM.x1 - 1.3, 0, bikePos.z + .5 + (coarse && innerHeight > innerWidth ? .5 : 0));
  piece.face = new THREE.Vector3(bikePos.x, .95, bikePos.z);
  plinth.userData.hween = piece; pickables.push(plinth);

  return {
    group, floor, piece, sign,
    setBike(bike, dress) {                                            // the CFR model, repainted for the night
      bike.traverse(o => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
        o.userData.hween = piece; o.castShadow = !lite; delete o.userData.piece; pickables.push(o);
      });
      applySkin(slotsOf(bike), (window.__SKINS?.skins || []).find(s => s.id === 'lava-night')
        || { id: 'lava-night', name: 'Lava Night', frame: '#141116', finish: { roughness: .32, metalness: .25, clearcoat: 1 }, decals: { color: ORANGE, glow: EMBER, intensity: 1.6 } });
      dress?.(bike);
      const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
      bike.position.set(-c.x, -box.min.y, -c.z);
      const holder = new THREE.Group(); holder.add(bike); holder.rotation.y = piece.rotY; holder.position.set(bikePos.x, .42, bikePos.z); group.add(holder); piece.bike = holder;
    },
    update(t, reduce) {
      const f = reduce ? 1 : .86 + Math.sin(t * 7.3) * .06 + Math.sin(t * 13.1 + 1.3) * .05 + Math.sin(t * 2.1) * .03;
      pumpkinM.emissiveIntensity = 2.2 * f; flameM.color.setRGB(1, .77 * f, .42 * f);
      lavaFloor.emissiveIntensity = .9 + (reduce ? 0 : Math.sin(t * .8) * .2);
      if (!reduce) {
        mistTex.offset.set(t * .012, t * .007);
        for (const b of bats) { const a = t * b.speed + b.phase; b.o.position.set(b.c.x + Math.cos(a) * b.rad, b.c.y + Math.sin(a * 2.3) * .15, b.c.z + Math.sin(a) * b.rad); b.o.rotation.y = -a; const fl = Math.sin(t * b.flap + b.phase) * .8; b.l.rotation.z = fl; b.r.rotation.z = -fl; }
      }
    },
  };
}
