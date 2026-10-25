// TRANSITION // THE PIER — an independent KONA.m room for room-010 Transition, on the review footprint (BROOM).
// Race morning on the Kailua Pier: the swim comes in from the bay at the east end, a blue carpet runs west between two
// banks of racked bikes to the mount line by the door, gear bags hang along both walls, and one rack slot stays empty.
// Truth / rights: place facts come from pitch/transition/transition-facts-v1.json (sourced); race-craft notes are general,
// not any race's rules. The bikes are anonymous KONA.m atlas studies (world/konam/rooms/transition-pier.decor.json),
// not anyone's equipment. No photographs, no likeness, no event marks.
// Reuse: loadDecor + atlas bikes, shared props (kona-palm, race-marker), mergeStatic, localEnvCapture.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import facts from '../../pitch/transition/transition-facts-v1.json' with { type: 'json' };
import decor from '../../world/konam/rooms/transition-pier.decor.json' with { type: 'json' };
import { BROOM, BDOOR } from './beast-cave.js';
import { loadDecor, mergeStatic } from './engine/decor.js';
import { localEnvCapture } from './engine/env-capture.js';
import { decorateRoom } from './engine/decoration-props.js';

export const TRANSITION_MOOD = Object.freeze({ exposure: 1.0, hemi: .2, sun: .08, fog: { near: 20, far: 75 }, fogColor: new THREE.Color('#c9d6df') });
const FACT = Object.fromEntries(facts.facts.map(f => [f.id, f])), CRAFT = Object.fromEntries(facts.race_craft.map(f => [f.id, f]));
const PAL = { deck: '#b9b4ab', carpet: '#1f5aa6', carpetEdge: '#f2efe8', steel: '#c9ced4', bikeBag: '#1f5aa6', runBag: '#c7362a', ink: '#141a20', paper: '#f5f3ee' };

const rng = (seed = 0x7101) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true, repeat) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };
const fit = (g, text, x, y, maxW) => { const m = g.measureText(text).width; if (m <= maxW) { g.fillText(text, x, y); return; } g.save(); g.translate(x, y); g.scale(maxW / m, 1); g.fillText(text, 0, 0); g.restore(); };
const wrap = (g, text, x, y, maxW, lh) => { let line = ''; for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t; } if (line) g.fillText(line, x, y); return y; };

export function buildTransitionPier(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);       // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2;
  const rand = rng();
  const infos = [], info = (mesh, rec) => { for (const m of [].concat(mesh)) { m.userData.info = rec; pickables.push(m); } infos.push(rec); return rec; };
  const envMats = [], E = m => { envMats.push(m); return m; };
  const add = (mat, geo, x, y, z, ry = 0, cast = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = cast && !lite; m.receiveShadow = true; group.add(m); return m; };
  const box = (mat, w, h, d, x, y, z, ry = 0, cast = false) => add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, ry, cast);
  // self-lit signs (basic material)
  const sign2d = (c, w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(c) })); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m; };

  // ------------------------------------------------------------ materials: the pier at first light
  const deckC = canvas(lite ? 256 : 512, lite ? 256 : 512, (g, w, h) => { g.fillStyle = PAL.deck; g.fillRect(0, 0, w, h); const r = rng(5);
    for (let i = 0; i < (lite ? 2500 : 9000); i++) { const v = 150 + r() * 60; g.fillStyle = `rgba(${v},${v - 4},${v - 10},.35)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(80,76,70,.35)'; g.lineWidth = 2; for (let x = 0; x <= w; x += w / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });   // slab joints
  const floorMat = E(new THREE.MeshStandardMaterial({ map: tex(deckC, true, [RW / 4, RD / 4]), roughness: .9, envMapIntensity: .4 }));
  const carpetC = canvas(256, 256, (g, w, h) => { g.fillStyle = PAL.carpet; g.fillRect(0, 0, w, h); const r = rng(11);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${.04 + r() * .05})`; g.fillRect(0, y, w, 1); } });
  const carpetMat = new THREE.MeshStandardMaterial({ map: tex(carpetC, true, [12, 1.2]), roughness: .95 });
  const steel = E(new THREE.MeshStandardMaterial({ color: PAL.steel, roughness: .35, metalness: .85 }));
  const white = new THREE.MeshStandardMaterial({ color: PAL.carpetEdge, roughness: .7 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e8e4dc', roughness: .92 });
  const darkWood = new THREE.MeshStandardMaterial({ color: '#4b3b2c', roughness: .85 });

  // ------------------------------------------------------------ deck, walls, ceiling (an open pier roof of beams)
  const DECK = 33.1, floor = new THREE.Mesh(new THREE.BoxGeometry(DECK - R.x0, .16, RD), floorMat); floor.position.set((R.x0 + DECK) / 2, -.074, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);
  for (const z of [R.z0 + .15, R.z1 - .05]) box(wallMat, RW, R.h, .3, CX, R.h / 2, z);   // south wall 10 cm in: the Breitling room's wall sits just behind it (z -18…-17.7) and fought it for depth
  for (let x = R.x0 + 1.5; x < R.x1 - .5; x += 2.2) box(darkWood, .22, .3, RD, x, R.h - .15, CZ);
  box(new THREE.MeshStandardMaterial({ color: '#f1ede6', roughness: .95 }), RW, .1, RD, CX, R.h + .05, CZ);

  // ------------------------------------------------------------ the carpet: swim in at the east end, bike out at the door
  const C0 = 10.0, C1 = 32.9, carpet = box(carpetMat, C1 - C0, .02, 2.4, (C0 + C1) / 2, .01, CZ);
  for (const s of [-1, 1]) box(white, C1 - C0, .022, .07, (C0 + C1) / 2, .012, CZ + s * 1.24);
  const mountLine = box(new THREE.MeshStandardMaterial({ color: '#f2c32e', roughness: .6 }), .16, .024, 2.4, 11.4, .014, CZ);   // the mount line
  info(carpet, { model: act => craftCard(act, 't1-t2'), eyebrow: 'THE CARPET', title: 'Swim in, bike out.', sub: 'T1 runs the length of the room' });
  const stencil = (text, sub, x, flip = false) => { const c = canvas(512, 256, (g, w, h) => { g.fillStyle = '#f5f3ee'; g.textAlign = 'center'; g.font = `900 112px ${FONT}`; fit(g, text, w / 2, 122, w - 40); g.font = `700 28px ${FONT}`; g.letterSpacing = '6px'; fit(g, sub, w / 2, 192, w - 40); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.05), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, opacity: .95 })); m.rotation.set(-Math.PI / 2, 0, flip ? Math.PI / 2 : -Math.PI / 2); m.position.set(x, .03, CZ); m.renderOrder = 1; group.add(m); return m; };
  stencil('SWIM IN', 'KAILUA BAY', 30.6, true); stencil('T1', 'SWIM TO BIKE', 21.3); stencil('BIKE OUT', 'MOUNT AFTER THE LINE', 13.2);

  // ------------------------------------------------------------ the racks: two banks, bikes come from the decor manifest
  const RACKS = [CZ + 3.25, CZ - 3.25], RX0 = 12.0, RX1 = 26.4, BAR = .98;
  const rackParts = [];
  for (const z of RACKS) {
    rackParts.push(new THREE.BoxGeometry(RX1 - RX0, .05, .05).translate((RX0 + RX1) / 2, BAR, z));
    for (let x = RX0; x <= RX1 + .01; x += 3.6) { rackParts.push(new THREE.BoxGeometry(.06, BAR, .06).translate(x, BAR / 2, z)); rackParts.push(new THREE.BoxGeometry(.06, .04, .9).translate(x, .02, z)); }
    obstacles.push({ box: [RX0 - .3, RX1 + .3, z - .95, z + .95] });
  }
  const racks = new THREE.Mesh(mergeGeometries(rackParts), steel); rackParts.forEach(g => g.dispose()); racks.castShadow = !lite; group.add(racks);
  info(racks, { model: act => craftCard(act, 'practice'), eyebrow: 'THE RACKS', title: 'Racked by number.', sub: 'Anonymous KONA.m bike studies' });
  // rack-end number boards
  const rackSign = (a, b, z, ry) => sign2d(canvas(512, 256, (g, w, h) => { g.fillStyle = PAL.ink; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c32e'; g.fillRect(0, 0, w, 12);
    g.fillStyle = PAL.paper; g.textAlign = 'center'; g.font = `800 110px ${FONT}`; fit(g, `${a}–${b}`, w / 2, 170, w - 60); }), .6, .3, RX0 - .4, 1.25, z, ry);
  rackSign(1, 10, RACKS[0], -Math.PI / 2); rackSign(11, 20, RACKS[1], -Math.PI / 2);
  // the empty slot
  const [sx, , sz] = decor.your_slot;
  const slotC = canvas(512, 320, (g, w, h) => { g.fillStyle = PAL.paper; g.fillRect(0, 0, w, h); g.strokeStyle = PAL.carpet; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = PAL.carpet; g.textAlign = 'center'; g.font = `800 64px ${FONT}`; g.fillText('YOUR SLOT', w / 2, 130); g.fillStyle = PAL.ink; g.font = `500 30px ${FONT}`; wrap(g, 'Empty until race morning.', w / 2 - 190, 200, 380, 38); });
  const slot = sign2d(slotC, .5, .31, sx, BAR + .22, sz, 0);
  const slotBack = sign2d(slotC, .5, .31, sx, BAR + .22, sz - .002, Math.PI);
  info([slot, slotBack], { model: act => slotCard(act), eyebrow: 'YOUR SLOT', title: 'An empty place on the rack.', sub: 'The only space here without a bike' });

  // ------------------------------------------------------------ gear bags along both walls: one draw for every bag and hook rail
  const bagGeo = new THREE.BoxGeometry(.34, .5, .2); bagGeo.translate(0, -.25, 0);
  const bagAt = []; for (const [z, side] of [[R.z0 - .45, 1], [R.z1 + .45, -1]]) for (let i = 0; i < (lite ? 14 : 22); i++) { const x = 11.0 + i * (lite ? 1.0 : .64); bagAt.push([x, 1.62 + (i % 2) * .02, z, side, i]); }
  const bags = new THREE.InstancedMesh(bagGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .8 }), bagAt.length);
  { const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    bagAt.forEach(([x, y, z, side, i], k) => { M4.compose(V.set(x, y, z), Q.setFromEuler(new THREE.Euler(0, (rand() - .5) * .25, side * (rand() - .5) * .08)), S.set(1, .9 + rand() * .2, 1)); bags.setMatrixAt(k, M4);
      bags.setColorAt(k, c.set(side > 0 ? PAL.bikeBag : PAL.runBag).multiplyScalar(.85 + rand() * .2)); });
    bags.instanceColor.needsUpdate = true; bags.castShadow = !lite; group.add(bags); }
  for (const z of [R.z0 - .38, R.z1 + .38]) box(steel, 22 * .64 + .6, .04, .04, 11.0 + 22 * .64 / 2 - .3, 1.66, z);
  info(bags, { model: act => craftCard(act, 'bags'), eyebrow: 'GEAR BAGS', title: 'Blue for the bike, red for the run.', sub: 'KONA.m colours, not a race rule' });
  const wallSign = (title, sub, z, ry) => sign2d(canvas(1024, 256, (g, w, h) => { g.fillStyle = PAL.ink; g.fillRect(0, 0, w, h); g.fillStyle = PAL.paper; g.font = `800 92px ${FONT}`; g.fillText(title, 50, 130); g.fillStyle = '#9aa3ad'; g.font = `600 34px ${FONT}`; g.letterSpacing = '6px'; g.fillText(sub, 54, 200); }), 2.4, .6, 26.2, 2.55, z, ry);
  wallSign('BIKE BAGS', 'SWIM TO BIKE · T1', R.z0 - .02, Math.PI); wallSign('RUN BAGS', 'BIKE TO RUN · T2', R.z1 + .02, 0);

  // ------------------------------------------------------------ the east end: steps up out of Kailua Bay at first light
  const bayMat = new THREE.ShaderMaterial({ fog: false, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vU;uniform float t;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){ vec2 u=vU; float hz=.38; vec3 c;
        vec3 sky=mix(vec3(.98,.80,.62),vec3(.55,.70,.88),smoothstep(hz,.95,u.y));
        float cl=n(vec2(u.x*5.+t*.01,u.y*14.))*n(vec2(u.x*12.,u.y*8.)); sky=mix(sky,vec3(1.,.88,.80),smoothstep(.5,.8,cl)*smoothstep(hz+.05,.9,u.y)*.55);
        if(u.y>hz) c=sky;
        else { float dy=hz-u.y; vec3 sea=mix(vec3(.16,.50,.62),vec3(.05,.28,.42),smoothstep(.0,.38,dy));
          float w=n(vec2(u.x*80.,dy*220.-t*.6))*n(vec2(u.x*34.+t*.2,dy*110.)); c=sea+vec3(1.,.9,.75)*smoothstep(.62,.95,w)*.45*(1.-dy*1.5);
          for(int k=0;k<6;k++){ float fk=float(k); vec2 b=vec2(fract(.12+fk*.17+t*.003*(1.+fk*.2)),.03+fk*.012);   // swimmers' caps
            if(length((u-vec2(b.x,hz-b.y))*vec2(260.,420.))<1.) c=mix(c,vec3(.95,.45,.2),.9); } }
        gl_FragColor=vec4(c,1.); }` });
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(RD + 2, R.h + .6), bayMat); bay.rotation.y = -Math.PI / 2; bay.position.set(R.x1 - .03, (R.h + .6) / 2 - .3, CZ); group.add(bay);
  const stepMat = new THREE.MeshStandardMaterial({ color: '#8f8a82', roughness: .95 });
  for (let i = 0; i < 4; i++) box(stepMat, .5, .2, 3.0, DECK + .25 + i * .5, -.1 - i * .2, CZ);   // steps down to the water
  for (const s of [-1, 1]) box(stepMat, R.x1 - DECK, .16, (RD - 3.0) / 2, (DECK + R.x1) / 2, -.074, CZ + s * (RD + 3.0) / 4);   // the pier edge either side of the steps
  const water = new THREE.Mesh(new THREE.PlaneGeometry(R.x1 - DECK, 3.0), new THREE.MeshStandardMaterial({ color: '#1d5f73', roughness: .15, metalness: .1, emissive: '#0b2a33', emissiveIntensity: .6 }));
  water.rotation.x = -Math.PI / 2; water.position.set((DECK + R.x1) / 2, -.75, CZ); group.add(water);
  for (const s of [-1, 1]) { box(steel, 2.2, .045, .045, 34.0, .95, CZ + s * 1.55); for (const x of [33.0, 35.0]) box(steel, .045, .95, .045, x, .47, CZ + s * 1.55); }
  obstacles.push({ box: [33.1, R.x1 + .5, R.z1 - .5, CZ - 1.7] }); obstacles.push({ box: [33.1, R.x1 + .5, CZ + 1.7, R.z0 + .5] });
  const swimSign = sign2d(canvas(1400, 420, (g, w, h) => { g.fillStyle = PAL.ink; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c32e'; g.fillRect(0, 0, w, 12);
    g.fillStyle = '#9aa3ad'; g.font = `700 34px ${FONT}`; g.letterSpacing = '8px'; g.fillText('SWIM START · KAILUA BAY · 2026', 60, 92);
    g.fillStyle = PAL.paper; g.font = `800 120px ${FONT}`; g.letterSpacing = '2px'; g.fillText('6:20 · 6:30', 56, 240);
    g.fillStyle = '#c9d2da'; g.font = `600 40px ${FONT}`; g.letterSpacing = '0px'; g.fillText('Pro men, then pro women (am). Then everyone else.', 60, 320); }), 2.8, .84, 32.6, 3.2, CZ, -Math.PI / 2);
  info(swimSign, { model: act => factCard(act, 'swim-start'), eyebrow: 'SWIM START', title: '6:20 and 6:30 am', sub: 'Kailua Bay, 2026' });
  const palms = []; for (const g of decorateRoom([{ prop: 'kona-palm', x: 32.2, z: -4.9, height: 2.8, seed: 4 }, { prop: 'kona-palm', x: 32.4, z: -16.7, height: 2.6, seed: 9 },
    { prop: 'race-marker', x: 9.0, z: -16.2, height: 1.2 }, { prop: 'race-marker', x: 9.0, z: -5.4, height: 1.2, seed: 2 }], { group, lite, obstacles, sway: palms, basaltTex: ctx.basaltTex })) g.userData.prop = g.userData.decoration;

  // ------------------------------------------------------------ sign at the door
  const sign = lettering(4.6, .9, g => { g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('TRANSITION // THE PIER', 0, .28);
    g.fillStyle = PAL.carpet; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('The fourth discipline.', 0, .69); }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ light: open morning sky from the bay, one sun for shadows
  const sky = new THREE.HemisphereLight('#e7f0ff', '#b9a991', lite ? 1.25 : 1.0); group.add(sky);
  const sun = new THREE.DirectionalLight('#ffe2c0', lite ? 1.6 : 2.1); sun.position.set(R.x1 + 3, 15, CZ - 2);   // high enough that shadows stay on the deck, not up the walls sun.target.position.set(CX, 0, CZ); group.add(sun, sun.target);
  if (!lite) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 8, bottom: -8, near: 1, far: 40 }); sun.shadow.bias = -.0003; sun.shadow.normalBias = .03; }

  // ------------------------------------------------------------ bike spot: the host walks visitors to the empty slot
  const bikeSpot = { kind: 'beast', pos: new THREE.Vector3(sx, 0, sz), rotY: 0, bike: null };
  const portrait = coarse && innerHeight > innerWidth;
  bikeSpot.view = portrait ? new THREE.Vector3(sx - 2.6, 0, CZ + .4) : new THREE.Vector3(sx - 3.6, 0, CZ + .3);
  bikeSpot.face = new THREE.Vector3(sx, 1.0, sz);
  bikeSpot.info = infos.find(r => r.eyebrow === 'YOUR SLOT');

  // ------------------------------------------------------------ cards
  const disclaimer = { cls: 'G', text: 'An independent KONA.m room. Not affiliated with, endorsed by or sponsored by IRONMAN® or any brand. Race-craft notes are general, not the rules of any race; check your own race’s athlete guide.' };
  const src = (line, ids) => `${line} (${[].concat(ids).map(id => new URL(facts.sources[id]).hostname.replace(/^www\./, '')).join(', ')})`;
  const back = act => ({ label: 'Back to the pier', primary: true, onClick: () => act.close() });
  const go = (act, f) => () => ctx.renderCard?.(f(act));
  const more = act => [{ label: 'T1 and T2', onClick: go(act, a => craftCard(a, 't1-t2')) }, { label: 'Mount line', onClick: go(act, a => craftCard(a, 'mount-line')) }, { label: 'Your slot', onClick: go(act, slotCard) }];
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'AN INDEPENDENT ROOM · TRANSITION', title: 'The pier, before the bikes leave.', kicker: 'The fourth discipline.',
      lede: 'Swimmers come up the steps out of Kailua Bay at the far end, run the blue carpet between the racks, grab a bag and leave on the bike past the line by the door. The clock never stops in here.',
      facts: [{ cls: 'P', text: src(FACT['pier-transition'].line, FACT['pier-transition'].sources) }, disclaimer, { cls: 'G', text: 'The bikes on the racks are anonymous KONA.m studies, not anyone’s equipment.' }],
      actions: [{ label: 'Walk the carpet →', primary: true, onClick: () => act.close() }, ...more(act)] };
  }
  function factCard(act, id) { const f = FACT[id];
    return { kind: 'beast', eyebrow: 'KAILUA-KONA', title: id === 'swim-start' ? '6:20 and 6:30 am.' : 'The pier.', lede: f.line, facts: [{ cls: 'P', text: src(f.line, f.sources) }, disclaimer], actions: [back(act), ...more(act)] }; }
  function craftCard(act, id) { const f = CRAFT[id];
    const titles = { 't1-t2': 'T1, then T2.', 'mount-line': 'On foot until the line.', bags: 'One bag for each change.', practice: 'Rehearsed, not improvised.' };
    return { kind: 'beast', eyebrow: 'RACE CRAFT · GENERAL', title: titles[id], lede: f.line, facts: [{ cls: 'P', text: src(FACT['pier-transition'].line, FACT['pier-transition'].sources) }, disclaimer], actions: [back(act), ...more(act).filter(b => !b.label.toLowerCase().startsWith(titles[id].slice(0, 4).toLowerCase()))] }; }
  function slotCard(act) {
    return { kind: 'beast', eyebrow: 'YOUR SLOT', title: 'An empty place on the rack.', kicker: 'Twenty slots, nineteen bikes.',
      lede: 'Every other slot on these racks holds a bike. This one waits for race morning. The bike you set up in the Garage is yours to imagine here; this room does not load it.',
      facts: [disclaimer], actions: [back(act), ...more(act).filter(b => b.label !== 'Your slot')] };
  }
  info(mountLine, { model: act => craftCard(act, 'mount-line'), eyebrow: 'MOUNT LINE', title: 'On foot until the line.', sub: 'General race craft' });

  // ------------------------------------------------------------ static merge (one draw per material), reflections
  const keepers = new Set([floor, sign, carpet, racks, slot, slotBack, bags, bay, swimSign, ...palms.map(w => w.o)]);
  group.userData.merged = mergeStatic(group, { keep: o => keepers.has(o) || !!o.userData?.info || o.isLight || o.isPoints || o.isInstancedMesh, decals: true });
  let envDirty = 2;
  const env = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(CX, 1.6, CZ), lite, mats: envMats });
  const bikeMat = new Map();
  const decorHooks = {                                                    // atlas bikes: their own finishes, environment-lit, picked as "the racks"
    materialFor: (item, m) => { if (!bikeMat.has(m)) { const c = m.clone(); envMats.push(c); bikeMat.set(m, c); } return bikeMat.get(m); },
    placed: (item, { meshes }) => { for (const mesh of meshes) { mesh.userData.info = racks.userData.info; pickables.push(mesh); } envDirty = 2; },
  };

  // ------------------------------------------------------------ host interface (same shape as the Beast Cave)
  return {
    group, floor, sign, bikeSpot, infos, mood: TRANSITION_MOOD, ownBikes: true, introCard,
    async useAssets(loader) { if (this._assets) return; this._assets = true; await loadDecor(decor, { group, loader, lite, hooks: decorHooks }); },
    setBike() { /* the racks are dressed from the decor manifest */ },
    update(t, reduce) {
      if (envDirty) { envDirty--; if (!envDirty) env.capture(); }
      bayMat.uniforms.t.value = reduce ? 0 : t;
      if (!reduce) for (const w of palms) { const a = Math.sin(t * .8 + w.phase) * w.amp; w.o.rotation.z = a; w.o.rotation.x = a * .5; }
      return { power: 0, heat: 0, riding: false };
    },
  };
}

