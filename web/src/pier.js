// The Kona Pier: "Kona by Year". A teak boardwalk runs out of the apse over the Pacific —
// Kailua Pier is where every Kona Ironman starts — with one painted canvas per October,
// the best-placed Canyon Speedmax of that year's race, and the current Speedmax CFR turning
// under a finish arch at the far end.
//
// Mobile first: static geometry is merged per material (a handful of draw calls for the
// whole pier), festoon bulbs are one instanced mesh with no real lights, paintings are
// baked offline (tools/paint_canvases.py) and only fetched when the visitor walks
// toward the end of the hall.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PIER = { x0: 1.4, x1: 9.4, z0: -49.5, z1: -91, cx: 5.4 };
export const PDOOR = { x0: 4.3, x1: 6.5 };                          // gap in the apse glass
export const FIN = { x: 5.4, z: -97.6, r: 7 };
const STEP = 3.2, FIRST_Z = -54.2;

export const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

export function pierWalkable(x, z) {
  const inDoor = x > PDOOR.x0 + .45 && x < PDOOR.x1 - .45 && z < -45.6 && z > -49.8;
  const inTerrace = x > PIER.x0 + .45 && x < PIER.x1 - .45 && z <= -46.9 && z > -49.8;
  const inDeck = x > PIER.x0 + .45 && x < PIER.x1 - .45 && z <= -49.4 && z > PIER.z1 - .5;
  const inDisc = Math.hypot(x - FIN.x, z - FIN.z) < FIN.r - .6;
  return inDoor || inTerrace || inDeck || inDisc;
}

export function buildPier(ctx) {
  const { scene, data, lettering, canvasTex, M, WYLD, FONT, SERIF, lite, coarse, pickables, obstacles } = ctx;
  const group = new THREE.Group(); group.name = 'pier'; scene.add(group);
  const byId = Object.fromEntries(data.canvases.map(c => [c.id, c]));
  const merge = { teak: [], steel: [], gold: [], basalt: [], glass: [], pale: [] };
  const put = (key, geo, x, y, z, ry = 0) => { geo.rotateY(ry); geo.translate(x, y, z); merge[key].push(geo); return geo; };

  // ---- materials
  const teakTex = canvasTex(512, 512, (g, w, h) => {
    const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 8; i++) {                                     // eight boards across the tile
      const base = 128 + rnd() * 30;
      g.fillStyle = `rgb(${base + 40},${base + 8},${base - 30})`; g.fillRect(i * 64, 0, 64, h);
      for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(${70 + rnd() * 40},${45 + rnd() * 25},${25 + rnd() * 15},${.05 + rnd() * .1})`; g.fillRect(i * 64 + rnd() * 64, 0, 1 + rnd() * 2, h); }
      g.fillStyle = 'rgba(35,24,16,.55)'; g.fillRect(i * 64, 0, 2, h);  // seam
      const cut = rnd() * h; g.fillRect(i * 64, cut, 64, 2);           // butt joint
    }
  }, [(PIER.x1 - PIER.x0) / 1.1, (PIER.z0 - PIER.z1) / 1.1]);
  const teak = new THREE.MeshStandardMaterial({ map: teakTex, color: '#d9c2a6', roughness: .72, envMapIntensity: .6 });
  const steel = new THREE.MeshStandardMaterial({ color: '#1d2024', roughness: .38, metalness: .7 });
  const gold = new THREE.MeshStandardMaterial({ color: '#c49a55', roughness: .3, metalness: .9 });
  const pale = new THREE.MeshStandardMaterial({ color: '#f4efe7', roughness: .6 });

  // ---- deck, terrace, pilings, rails
  const L = PIER.z0 - PIER.z1;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(PIER.x1 - PIER.x0, .3, L), teak);
  deck.position.set(PIER.cx, -.15, (PIER.z0 + PIER.z1) / 2); deck.receiveShadow = true; deck.userData.floor = true; group.add(deck);
  const discTex = teakTex.clone(); discTex.repeat.set(FIN.r * 2 / 1.1, FIN.r * 2 / 1.1); discTex.needsUpdate = true;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(FIN.r, FIN.r, .3, 64), new THREE.MeshStandardMaterial({ map: discTex, color: '#d9c2a6', roughness: .72, envMapIntensity: .6 }));
  disc.position.set(FIN.x, -.15, FIN.z); disc.userData.floor = true; group.add(disc);
  const floors = [deck, disc];
  const pil = new THREE.CylinderGeometry(.15, .17, 3.4, 10);
  const pts = [];
  for (let z = PIER.z0 - 1; z > PIER.z1; z -= 3.2) pts.push([PIER.x0 + .15, z], [PIER.x1 - .15, z]);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; pts.push([FIN.x + Math.cos(a) * (FIN.r - .2), FIN.z + Math.sin(a) * (FIN.r - .2)]); }
  const piles = new THREE.InstancedMesh(pil, new THREE.MeshStandardMaterial({ color: '#4a3e33', roughness: .9 }), pts.length);
  pts.forEach(([x, z], i) => piles.setMatrixAt(i, new THREE.Matrix4().setPosition(x, -1.85, z))); group.add(piles);
  for (const x of [PIER.x0 + .06, PIER.x1 - .06]) {                   // glass balustrade with a teak handrail
    const run = PIER.z0 - PIER.z1;
    put('glass', new THREE.PlaneGeometry(run, 1.02), x, .51, (PIER.z0 + PIER.z1) / 2, Math.PI / 2);
    put('teak', new THREE.BoxGeometry(.09, .06, run), x, 1.05, (PIER.z0 + PIER.z1) / 2);
  }
  { // round balustrade on the finish platform, open toward the pier
    const open = .62, seg = new THREE.CylinderGeometry(FIN.r - .06, FIN.r - .06, 1.02, 48, 1, true, Math.PI / 2 + open, Math.PI * 2 - 2 * open);
    put('glass', seg, FIN.x, .51, FIN.z);
    const rail = new THREE.TorusGeometry(FIN.r - .06, .035, 6, 72, Math.PI * 2 - 2 * open); rail.rotateZ(Math.PI - open); rail.rotateX(Math.PI / 2);
    rail.translate(FIN.x, 1.05, FIN.z); merge.teak.push(rail);
  }
  // the Queen K's centre line runs on down the pier
  { const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(.1, 1.3), M.line, 20); let n = 0;
    for (let z = PIER.z0 - 1.2; z > PIER.z1 + 1; z -= 3.1) dash.setMatrixAt(n++, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(PIER.cx, .006, z));
    dash.count = n; group.add(dash); }

  // ---- doorway header and sign (hall side)
  put('steel', new THREE.BoxGeometry(PDOOR.x1 - PDOOR.x0 + .2, .22, .18), (PDOOR.x0 + PDOOR.x1) / 2, 3.3, -46.5);
  for (const x of [PDOOR.x0, PDOOR.x1]) put('steel', new THREE.BoxGeometry(.1, 3.3, .18), x, 1.65, -46.5);
  const sign = lettering(3.2, .82, g => {
    g.fillStyle = '#12181d'; g.font = `700 .13px ${FONT}`; g.letterSpacing = '.05px'; g.fillText('THE PIER  ·  KONA BY YEAR', 0, .24);
    g.fillStyle = WYLD.pink; g.font = `italic 400 .34px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Twelve Octobers.', 0, .66);
  }, 1024);
  sign.position.set((PDOOR.x0 + PDOOR.x1) / 2 - .2, 4.15, -46.38); group.add(sign);

  // ---- painted canvases
  const tl = new THREE.TextureLoader();
  const pending = [];                                                 // textures fetched on first approach
  function canvasPiece(id, h, maxW) {
    const c = byId[id]; const g = new THREE.Group();
    const ar = c.aspect || .75; let hh = h, ww = hh * ar; if (ww > maxW) { ww = maxW; hh = ww / ar; }
    const mat = new THREE.MeshStandardMaterial({ color: '#cfc6b8', roughness: .5, metalness: 0, normalScale: new THREE.Vector2(1.1, 1.1), envMapIntensity: .9 });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), mat); pic.position.z = .045; g.add(pic);
    pending.push(() => {
      tl.load(`assets/kona-years/${id}.jpg`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; mat.map = t; mat.color.set('#ffffff'); mat.emissiveMap = t; mat.emissive.set('#ffffff'); mat.emissiveIntensity = .1; mat.needsUpdate = true; });
      tl.load(`assets/kona-years/${id}_n.jpg`, t => { mat.normalMap = t; mat.needsUpdate = true; });
    });
    g.userData.size = [ww, hh]; g.userData.pic = pic; return g;
  }
  const frameAt = (g, ww, hh, key = 'gold') => {                     // mitred gold frame, merged into the pier's gold mesh
    g.updateMatrixWorld(true);
    const bars = [[ww + .16, .08, 0, hh / 2 + .04], [ww + .16, .08, 0, -hh / 2 - .04], [.08, hh, -ww / 2 - .04, 0], [.08, hh, ww / 2 + .04, 0]];
    for (const [bw, bh, x, y] of bars) { const geo = new THREE.BoxGeometry(bw, bh, .1); geo.translate(x, y, .03); geo.applyMatrix4(g.matrixWorld); merge[key].push(geo); }
    const back = new THREE.BoxGeometry(ww + .02, hh + .02, .06); back.translate(0, 0, .01); back.applyMatrix4(g.matrixWorld); merge.steel.push(back);
  };

  // era canvases at the head of the pier: the two machines that did the winning
  data.eras.forEach((e, i) => {
    const left = i === 0, x = left ? PIER.x0 + .55 : PIER.x1 - .55, z = -50.6, ry = left ? Math.PI / 2 - .7 : -Math.PI / 2 + .7;
    const g = canvasPiece(e.canvas, 1.6, 2.3); g.position.set(x, 1.72, z); g.rotation.y = ry; group.add(g);
    const [ww, hh] = g.userData.size; frameAt(g, ww, hh);
    for (const dx of [-ww / 2 + .15, ww / 2 - .15]) { const leg = new THREE.BoxGeometry(.05, 1.0, .05); leg.translate(dx, -hh / 2 - .45, -.02); g.updateMatrixWorld(true); leg.applyMatrix4(g.matrixWorld); merge.steel.push(leg); }
    const plate = lettering(Math.max(1.6, ww), .24, gg => {
      gg.fillStyle = '#12181d'; gg.font = `700 .06px ${FONT}`; gg.fillText(e.name.toUpperCase(), 0, .08);
      const c = byId[e.canvas].source; gg.fillStyle = '#6d7479'; gg.font = `500 .036px ${FONT}`; gg.fillText(`Painted from © ${c.author} · ${c.license}`.slice(0, 70), 0, .16);
    }, 1024);
    plate.position.set(-ww / 2 + Math.max(1.6, ww) / 2, -hh / 2 - .2, .06); g.add(plate);
    const info = { kind: 'era', era: e, canvas: byId[e.canvas], pos: new THREE.Vector3(x, 0, z) };
    g.userData.pic.userData.era = info; pickables.push(g.userData.pic);
    obstacles.push({ c: new THREE.Vector3(x, 0, z), r: .75 });
  });

  // the years
  const stations = [];
  const medal = { 1: '#d9b35a', 2: '#c9ced3', 3: '#b9774a' };
  data.years.forEach((y, i) => {
    const left = i % 2 === 0, tilt = .52;
    const a = left ? Math.PI / 2 - tilt : -Math.PI / 2 + tilt;
    const normal = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const pos = new THREE.Vector3(left ? PIER.x0 + 1.05 : PIER.x1 - 1.05, 0, FIRST_Z - i * STEP);
    const st = new THREE.Group(); st.position.copy(pos); st.rotation.y = a; group.add(st); st.updateMatrixWorld(true);
    const raced = y.status === 'raced';
    let ww = 1.2, hh = 1.6, pic = null;
    if (y.canvas) {
      const cg = canvasPiece(y.canvas, 1.75, 1.9); cg.position.y = 1.9; st.add(cg);
      [ww, hh] = cg.userData.size; frameAt(cg, ww, hh); pic = cg.userData.pic;
    } else {                                                          // an empty frame: the sea is the picture
      const cg = new THREE.Group(); cg.position.y = 1.9; st.add(cg); frameAt(cg, ww, hh, 'steel');
      cg.updateMatrixWorld(true);
      // remove the backing so the ocean shows through: the last pushed steel geo is the back
      merge.steel.pop();
      pic = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); pic.position.z = .05; cg.add(pic);
    }
    st.updateMatrixWorld(true);
    // easel: two steel posts behind the canvas, a label plate below
    for (const dx of [-ww / 2 + .12, ww / 2 - .12]) { const post = new THREE.BoxGeometry(.05, 1.9 + hh / 2, .05); post.translate(dx, (1.9 + hh / 2) / 2, -.04); post.applyMatrix4(st.matrixWorld); merge.steel.push(post); }
    const shelf = new THREE.BoxGeometry(ww + .1, .05, .16); shelf.translate(0, 1.9 - hh / 2 - .08, .02); shelf.applyMatrix4(st.matrixWorld); merge.steel.push(shelf);
    const plate = lettering(1.1, .62, g => {
      g.fillStyle = 'rgba(251,249,245,.96)'; g.fillRect(0, 0, 1.1, .62);
      g.fillStyle = '#12181d'; g.font = `400 .2px ${SERIF}`; g.fillText(String(y.year), .06, .2);
      if (raced) {
        g.fillStyle = '#138a8f'; g.font = `700 .04px ${FONT}`; g.letterSpacing = '.004px'; g.fillText(`${ordinal(y.place).toUpperCase()} · ${y.race.toUpperCase()}'S RACE`, .45, .09);
        g.fillStyle = '#12181d'; g.font = `600 .05px ${FONT}`; g.letterSpacing = '0px'; g.fillText(y.athlete, .45, .16);
        g.fillStyle = '#12181d'; g.font = `600 .085px ${FONT}`; g.fillText(y.time || y.gap || '', .06, .36);
        g.fillStyle = '#5f6a72'; g.font = `700 .032px ${FONT}`; g.letterSpacing = '.003px'; g.fillText(y.bike.toUpperCase(), .06, .43);
      } else { g.fillStyle = '#5f6a72'; g.font = `700 .036px ${FONT}`; g.letterSpacing = '.003px'; g.fillText('NO RACE IN KONA', .45, .12); }
      g.fillStyle = '#12181d'; g.font = `italic 400 .06px ${SERIF}`; g.letterSpacing = '0px'; g.fillText(y.headline, .06, .54);
      g.fillStyle = WYLD.pink; g.fillRect(.06, .575, .12, .008);
    }, 512);
    plate.material.transparent = false; plate.position.set(0, .82, .05); plate.rotation.x = -.18; st.add(plate);
    if (raced && medal[y.place]) {                                  // a medal in the frame corner
      const m = new THREE.CylinderGeometry(.12, .12, .03, 32); m.rotateX(Math.PI / 2); m.translate(ww / 2 - .02, 1.9 + hh / 2 - .02, .1); m.applyMatrix4(st.matrixWorld);
      (merge['m' + y.place] ||= []).push(m);
      const num = lettering(.2, .2, g => { g.fillStyle = '#12181d'; g.font = `800 .13px ${FONT}`; g.textAlign = 'center'; g.fillText(String(y.place), .1, .145); }, 128);
      num.position.set(ww / 2 - .02, 1.9 + hh / 2 - .02, .118); st.add(num);
    }
    // the year in brass on the boards, read as you walk out
    const fy = lettering(1.6, .5, g => { g.fillStyle = raced ? 'rgba(196,154,85,.75)' : 'rgba(18,24,29,.18)'; g.font = `italic 400 .44px ${SERIF}`; g.textAlign = 'center'; g.fillText(String(y.year), .8, .4); }, 512);
    fy.rotation.x = -Math.PI / 2; fy.position.set(left ? PIER.cx - 1.2 : PIER.cx + 1.2, .008, pos.z + .6); group.add(fy);
    const s = { ...y, kind: 'year', index: i, pos, normal, canvasInfo: y.canvas ? byId[y.canvas] : null };
    s.view = pos.clone().addScaledVector(normal, 2.35 + (coarse && innerHeight > innerWidth ? .6 : 0));
    s.view.x = Math.min(PIER.x1 - .7, Math.max(PIER.x0 + .7, s.view.x));
    s.face = new THREE.Vector3(pos.x, coarse && innerHeight > innerWidth ? 2.3 : 1.75, pos.z);
    pic.userData.year = s; plate.userData.year = s; pickables.push(pic, plate);
    obstacles.push({ c: pos.clone().addScaledVector(normal, .15), r: .8 });
    stations.push(s);
  });

  // ---- finish arch and the turning Speedmax
  const archZ = PIER.z1 + .4;
  for (const x of [PIER.x0 + .35, PIER.x1 - .35]) put('pale', new THREE.BoxGeometry(.5, 4.3, .5), x, 2.15, archZ);
  put('pale', new THREE.BoxGeometry(PIER.x1 - PIER.x0 - .2, .9, .4), PIER.cx, 4.5, archZ);
  const banner = lettering(7.4, .82, g => {
    const gr = g.createLinearGradient(0, 0, 7.4, 0); gr.addColorStop(0, WYLD.pink); gr.addColorStop(.5, '#b98be0'); gr.addColorStop(1, WYLD.aqua);
    g.fillStyle = gr; g.fillRect(0, 0, 7.4, .82);
    g.fillStyle = '#ffffff'; g.font = `800 .5px ${FONT}`; g.textAlign = 'center'; g.letterSpacing = '.18px'; g.fillText('FINISH', 3.7, .62);
  }, 1024);
  banner.material.transparent = false; banner.position.set(PIER.cx, 4.5, archZ + .205); group.add(banner);
  const rec = lettering(5.2, .5, g => { g.fillStyle = '#12181d'; g.font = `600 .13px ${FONT}`; g.textAlign = 'center'; g.letterSpacing = '.05px'; g.fillText('KAILUA-KONA  ·  COURSE RECORD 7:35:53  ·  2024', 2.6, .3); }, 1024);
  rec.position.set(PIER.cx, 3.82, archZ + .205); group.add(rec);
  // turntable
  const turn = new THREE.Group(); turn.position.set(FIN.x, 0, FIN.z); group.add(turn);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, .3, 64), M.basaltPolished); table.position.y = .15; table.receiveShadow = true; turn.add(table);
  const ringM = new THREE.MeshBasicMaterial({ color: WYLD.aqua, toneMapped: false }); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, .018, 8, 96), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = .3; turn.add(ring);
  obstacles.push({ c: new THREE.Vector3(FIN.x, 0, FIN.z), r: 2.2 });
  const spin = new THREE.Group(); spin.position.y = .3; turn.add(spin);
  const finale = { kind: 'finale', pos: new THREE.Vector3(FIN.x, 0, FIN.z), spin, bike: null };
  finale.view = new THREE.Vector3(FIN.x, 0, FIN.z + 4.4); finale.face = new THREE.Vector3(FIN.x, .95, FIN.z);
  table.userData.finale = finale; pickables.push(table);

  // ---- festoon lights: one instanced mesh, no lights
  {
    const poles = [], bulbs = [];
    for (const x of [PIER.x0 + .12, PIER.x1 - .12]) for (let z = PIER.z0 - .4; z > PIER.z1 + 1; z -= 6.6) poles.push([x, z]);
    poles.forEach(([x, z]) => put('steel', new THREE.CylinderGeometry(.035, .045, 3.4, 8), x, 1.7, z));
    for (const x of [PIER.x0 + .12, PIER.x1 - .12]) {
      const zs = poles.filter(p => p[0] === x).map(p => p[1]);
      for (let k = 0; k < zs.length - 1; k++) for (let j = 0; j < 9; j++) { const u = (j + .5) / 9; bulbs.push([x, 3.35 - Math.sin(u * Math.PI) * .42, zs[k] + (zs[k + 1] - zs[k]) * u]); }
    }
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), bulbs.length);
    const cols = [new THREE.Color('#fff1cf'), new THREE.Color(WYLD.pink), new THREE.Color('#fff1cf'), new THREE.Color(WYLD.aqua)];
    bulbs.forEach(([x, y, z], i) => { inst.setMatrixAt(i, new THREE.Matrix4().setPosition(x, y, z)); inst.setColorAt(i, cols[i % 4].clone().multiplyScalar(1.6)); });
    group.add(inst);
    // catenary wire: a line strip per side
    for (const x of [PIER.x0 + .12, PIER.x1 - .12]) {
      const p = []; bulbs.filter(b => b[0] === x).forEach(b => p.push(new THREE.Vector3(b[0], b[1] + .05, b[2])));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: '#2b2e33' })));
    }
  }

  // ---- merge static geometry per material
  const MAT = { teak, steel, gold, basalt: M.basalt, glass: M.glass, pale,
    m1: new THREE.MeshStandardMaterial({ color: medal[1], metalness: 1, roughness: .25 }),
    m2: new THREE.MeshStandardMaterial({ color: medal[2], metalness: 1, roughness: .25 }),
    m3: new THREE.MeshStandardMaterial({ color: medal[3], metalness: 1, roughness: .3 }) };
  for (const [k, geos] of Object.entries(merge)) {
    if (!geos.length) continue;
    const norm = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; });
    const m = new THREE.Mesh(mergeGeometries(norm), MAT[k]); m.castShadow = !lite && k !== 'glass'; m.receiveShadow = k !== 'glass';
    if (k === 'glass') m.renderOrder = 2;
    group.add(m);
  }

  // ---- runtime
  let fetched = false;
  const api = {
    group, stations, finale, floors,
    load() { if (fetched) return; fetched = true; pending.forEach(f => f()); },
    setBike(bike) {                                                  // the CFR from the hall, cloned by the caller
      const box = new THREE.Box3().setFromObject(bike), c = box.getCenter(new THREE.Vector3());
      bike.position.set(-c.x, -box.min.y, -c.z); spin.add(bike); finale.bike = bike;
      bike.traverse(o => { if (o.isMesh) { o.userData.finale = finale; delete o.userData.piece; pickables.push(o); } });
    },
    update(dt, reduce) { if (!reduce) spin.rotation.y += dt * .22; },
  };
  return api;
}
