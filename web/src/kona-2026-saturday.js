// SATURDAY // ALIʻI · KONA 2026 — an independent KONA.m event room on the review footprint (BROOM).
// Aliʻi Drive at night, two days after the IRONMAN World Championship of 10 October 2026: a finish carpet under a truss
// gantry, the two winners' times on a clock, the last mile stencilled on the carpet, spectator chairs and street lamps
// along the kerbs, the bay and the pier lights at the end of the road.
// Truth / rights: every result comes from pitch/kona-2026/kona-2026-results-v1.json (sourced, marked unofficial until the
// official results are published). No photographs, no likeness, no event or athlete marks; taglines are KONA.m copy.
// No bike is shown: the room is about the result, and KONA.m does not claim what the winners rode.
// Reuse: shared props (kona-palm, promenade-chair, promenade-lamp), mergeStatic, localEnvCapture, roomkit motes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import facts from '../../pitch/kona-2026/kona-2026-results-v1.json' with { type: 'json' };
import { BROOM, BDOOR } from './beast-cave.js';
import { motes } from './roomkit.js';
import { mergeStatic } from './engine/decor.js';
import { localEnvCapture } from './engine/env-capture.js';
import { decorateRoom, instancedProps } from './engine/decoration-props.js';

export const SATURDAY_MOOD = Object.freeze({ exposure: .92, hemi: .05, sun: .02, fog: { near: 16, far: 62 }, fogColor: new THREE.Color('#0b1420') });
const W = facts.results.women, M = facts.results.men;
const MOMENT = Object.fromEntries(facts.moments.map(m => [m.id, m]));
const PAL = { asphalt: '#1b1d20', carpet: '#8e1f10', carpetEdge: '#f2efe8', ember: '#ff6a00', night: '#0e1a2b', ink: '#f5f3ee', muted: '#9aa3ad', lamp: '#ffe3b0' };
const UNOFFICIAL = 'UNOFFICIAL · NBC SPORTS';

const rng = (seed = 0x2026) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true, repeat) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };
const fit = (g, text, x, y, maxW) => { const m = g.measureText(text).width; if (m <= maxW) { g.fillText(text, x, y); return; } g.save(); g.translate(x, y); g.scale(maxW / m, 1); g.fillText(text, 0, 0); g.restore(); };
const wrap = (g, text, x, y, maxW, lh) => { let line = ''; for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t; } if (line) g.fillText(line, x, y); return y; };

export function buildKona2026Saturday(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);       // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2;
  const GX = 29.4;                                                      // the finish line
  const rand = rng();
  const infos = [], info = (mesh, rec) => { for (const m of [].concat(mesh)) { m.userData.info = rec; pickables.push(m); } infos.push(rec); return rec; };
  const envMats = [], E = m => { envMats.push(m); return m; };
  const add = (mat, geo, x, y, z, ry = 0, cast = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = cast && !lite; m.receiveShadow = true; group.add(m); return m; };
  const box = (mat, w, h, d, x, y, z, ry = 0, cast = false) => add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, ry, cast);
  // self-lit display panels (basic material: the room is dark, the panels are lightboxes)
  const panel = (c, w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(c) })); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m; };

  // ------------------------------------------------------------ materials: Aliʻi Drive after dark
  const asphaltC = canvas(lite ? 256 : 512, lite ? 256 : 512, (g, w, h) => { g.fillStyle = PAL.asphalt; g.fillRect(0, 0, w, h); const r = rng(9);
    for (let i = 0; i < (lite ? 2500 : 9000); i++) { const v = 22 + r() * 34; g.fillStyle = `rgba(${v},${v + 2},${v + 5},.55)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } });
  const floorMat = E(new THREE.MeshStandardMaterial({ map: tex(asphaltC, true, [RW / 4, RD / 4]), roughness: .82, metalness: .05, envMapIntensity: .5 }));
  const carpetC = canvas(256, 256, (g, w, h) => { g.fillStyle = PAL.carpet; g.fillRect(0, 0, w, h); const r = rng(3);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${.05 + r() * .06})`; g.fillRect(0, y, w, 1); } for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(255,190,150,${r() * .08})`; g.fillRect(r() * w, r() * h, 1, 2); } });
  const carpetMat = new THREE.MeshStandardMaterial({ map: tex(carpetC, true, [12, 1.2]), roughness: .95 });
  const nightWall = new THREE.MeshStandardMaterial({ color: PAL.night, roughness: .92 });
  const kerb = new THREE.MeshStandardMaterial({ color: '#8d8a84', roughness: .9 });
  const truss = E(new THREE.MeshStandardMaterial({ color: '#d9dde2', roughness: .35, metalness: .85 }));
  const blackOut = new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: .6 });
  const white = new THREE.MeshStandardMaterial({ color: PAL.carpetEdge, roughness: .7 });

  // ------------------------------------------------------------ floor, road, kerbs, carpet
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .16, RD), floorMat); floor.position.set(CX, -.074, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);
  for (const s of [-1, 1]) { box(kerb, RW - 1.4, .14, .3, CX + .7, .07, CZ + s * 4.9); box(white, RW - 1.4, .005, .1, CX + .7, .006, CZ + s * 4.45); }   // kerbs and edge lines of Aliʻi Drive
  const carpetLen = GX + 3.2 - 9.2, carpet = box(carpetMat, carpetLen, .02, 2.6, 9.2 + carpetLen / 2, .01, CZ);
  for (const s of [-1, 1]) box(white, carpetLen, .022, .08, 9.2 + carpetLen / 2, .012, CZ + s * 1.34);
  box(white, .14, .024, 2.6, GX, .014, CZ);                                     // the line itself
  info(carpet, { model: act => mileCard(act), eyebrow: 'THE LAST MILE', title: 'Aliʻi Drive, the final steps.', sub: 'Stencils mark the race that was decided here' });

  // the last mile, stencilled on the carpet (decals: one transparent, depth-less material each, merged)
  const stencil = (text, sub, x) => { const c = canvas(512, 256, (g, w, h) => { g.fillStyle = '#f5f3ee'; g.textAlign = 'center'; g.font = `900 120px ${FONT}`; fit(g, text, w / 2, 118, w - 40); g.font = `700 30px ${FONT}`; g.letterSpacing = '6px'; fit(g, sub, w / 2, 190, w - 40); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, opacity: .95, fog: false })); m.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); m.position.set(x, .03, CZ); m.renderOrder = 1; group.add(m); return m; };
  stencil('1 MI', 'PALANI ROAD', 11.4); stencil('0.7 MI', 'WHERE THE LEAD CHANGED', 17.2); stencil('FINISH', 'ALIʻI DRIVE · KAILUA-KONA', GX - 2.4);

  // ------------------------------------------------------------ walls: night, string lights overhead
  box(nightWall, RW, R.h, .3, CX, R.h / 2, R.z0 + .15); box(nightWall, RW, R.h, .3, CX, R.h / 2, R.z1 - .15);
  box(new THREE.MeshStandardMaterial({ color: '#070b12', roughness: 1 }), RW, .2, RD, CX, R.h + .1, CZ);
  const bulbs = [], spans = lite ? 5 : 8;
  for (let k = 0; k < spans; k++) { const x = 10 + k * (GX - 13.5) / (spans - 1);   // the festoon stops short of the gantry: nothing hangs in front of the clock
    for (let i = 0; i <= 14; i++) { const u = i / 14, z = R.z0 - .4 - u * (RD - .8); bulbs.push([x + Math.sin(u * 9 + k) * .08, R.h - .5 - Math.sin(u * Math.PI) * .9, z]); } }
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }), bulbs.length);
  { const M4 = new THREE.Matrix4(); bulbs.forEach(([x, y, z], k) => { M4.makeTranslation(x, y, z); bulbMesh.setMatrixAt(k, M4); }); group.add(bulbMesh); }

  // ------------------------------------------------------------ the end of the road: Kailua Bay at night, the pier lights, Hualālai
  const bayMat = new THREE.ShaderMaterial({ fog: false, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vU;uniform float t;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){ vec2 u=vU; float hz=.36; vec3 c;
        vec3 sky=mix(vec3(.05,.09,.16),vec3(.01,.02,.05),smoothstep(hz,1.,u.y));
        float st=step(.996,h(floor(u*vec2(520.,300.))))*smoothstep(hz+.08,.9,u.y)*(.6+.4*sin(t*2.+h(floor(u*vec2(520.,300.)))*40.)); sky+=vec3(.9,.92,1.)*st;
        vec2 mo=vec2(.72,.74); float dm=distance(u*vec2(1.8,1.),mo*vec2(1.8,1.)); sky+=vec3(1.,.96,.86)*smoothstep(.035,.03,dm)+vec3(.5,.55,.7)*smoothstep(.25,.0,dm)*.25;
        float hill=hz+.16*smoothstep(1.,.15,u.x)*smoothstep(-.1,.5,u.x)*(.9+.1*n(vec2(u.x*12.,1.)));
        if(u.y>hz){ c=sky; if(u.y<hill) c=mix(vec3(.03,.04,.06),vec3(.05,.06,.09),(u.y-hz)/.16);
          float town=step(.975,h(floor(vec2(u.x*300.,u.y*400.))))*step(u.y,hz+.035)*step(.05,u.x); c+=vec3(1.,.78,.45)*town*.9; }
        else { float dy=hz-u.y; vec3 sea=mix(vec3(.03,.07,.12),vec3(.01,.02,.04),smoothstep(.0,.36,dy));
          float w=n(vec2(u.x*80.,dy*240.-t*.5))*n(vec2(u.x*30.+t*.15,dy*110.));
          float pier=step(.18,u.x)*step(u.x,.42); float lights=smoothstep(.55,.95,w)*(smoothstep(.06,.0,abs(u.x-.72))*.8+pier*.35);
          c=sea+vec3(1.,.82,.5)*lights*(1.-smoothstep(.0,.36,dy)*.5);
          if(dy<.02&&u.x>.18&&u.x<.42) c=mix(c,vec3(.10,.09,.08),.85);
          float pl=step(.9,fract(u.x*60.))*step(abs(dy-.022),.003)*step(.18,u.x)*step(u.x,.42); c+=vec3(1.,.85,.55)*pl*1.6; }
        gl_FragColor=vec4(c,1.); }` });
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(RD + 2, R.h + .6), bayMat); bay.rotation.y = -Math.PI / 2; bay.position.set(R.x1 - .03, (R.h + .6) / 2 - .3, CZ); group.add(bay);
  box(new THREE.MeshStandardMaterial({ color: '#2b2621', roughness: .95 }), .6, 1.05, RD, R.x1 - .5, .52, CZ);   // the sea wall at the end of the road
  obstacles.push({ box: [R.x1 - 1.1, R.x1 + .5, R.z1 - .5, R.z0 + .5] });

  // ------------------------------------------------------------ the finish gantry: a truss arch and the race clock
  const TW = 2.15, TH = 4.3, legs = [];
  for (const s of [-1, 1]) for (const dx of [-.22, .22]) for (const dz of [-.22, .22]) legs.push([GX + dx, CZ + s * TW + dz]);
  const rungs = [];
  for (const s of [-1, 1]) for (let y = .4; y < TH; y += .5) { rungs.push([GX, y, CZ + s * TW - .22, .44, .03, .03]); rungs.push([GX, y, CZ + s * TW + .22, .44, .03, .03]); rungs.push([GX - .22, y, CZ + s * TW, .03, .03, .44]); rungs.push([GX + .22, y, CZ + s * TW, .03, .03, .44]); }
  for (let z = CZ - TW; z <= CZ + TW + .01; z += .45) { rungs.push([GX, TH - .22, z, .44, .03, .03]); rungs.push([GX, TH + .22, z, .44, .03, .03]); }
  const trussParts = [...legs.map(([x, z]) => new THREE.BoxGeometry(.06, TH + .44, .06).translate(x, (TH + .44) / 2, z)),
    ...[-.22, .22].flatMap(dx => [-.22, .22].map(dy => new THREE.BoxGeometry(.06, .06, 2 * TW + .5).translate(GX + dx, TH + dy, CZ))),
    ...rungs.map(([x, y, z, w, h2, d]) => new THREE.BoxGeometry(w, h2, d).translate(x, y, z))];
  const gantry = new THREE.Mesh(mergeGeometries(trussParts), truss); trussParts.forEach(g => g.dispose()); gantry.castShadow = !lite; group.add(gantry);
  for (const s of [-1, 1]) obstacles.push({ c: new THREE.Vector3(GX, 0, CZ + s * TW), r: .45 });
  const clockC = document.createElement('canvas'); clockC.width = 1600; clockC.height = 440;
  const clockTex = tex(clockC); let clockShow = -1;
  const drawClock = k => { const g = clockC.getContext('2d'), r = k ? M[0] : W[0], w = clockC.width, h = clockC.height;
    g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h); g.fillStyle = PAL.ember; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    g.textAlign = 'left'; g.fillStyle = PAL.muted; g.font = `700 40px ${FONT}`; g.letterSpacing = '10px'; g.fillText(k ? 'MEN · WINNER' : 'WOMEN · WINNER', 60, 92);
    g.textAlign = 'right'; g.fillText(UNOFFICIAL, w - 60, 92);
    g.textAlign = 'center'; g.letterSpacing = '6px'; g.fillStyle = '#ffd27a'; g.font = `700 210px ${FONT}`; g.shadowColor = 'rgba(255,170,60,.65)'; g.shadowBlur = 26; fit(g, r.time, w / 2, 300, w - 160); g.shadowBlur = 0;
    g.fillStyle = PAL.ink; g.font = `700 52px ${FONT}`; g.letterSpacing = '4px'; fit(g, `${r.name.toUpperCase()} · ${r.nation}`, w / 2, 388, w - 160);
    clockTex.needsUpdate = true; clockShow = k; };
  drawClock(0);
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .935), new THREE.MeshBasicMaterial({ map: clockTex, toneMapped: false }));
  clock.rotation.y = -Math.PI / 2; clock.position.set(GX - .3, TH, CZ); group.add(clock);
  const clockBack = box(blackOut, .1, 1.05, 3.55, GX - .24, TH, CZ);
  const clockInfo = info([clock, clockBack], { model: act => clockCard(act), eyebrow: 'THE CLOCK', title: `${W[0].time} · ${M[0].time}`, sub: 'The two winning times, unofficial' });
  // the tape, broken and fallen on the carpet just past the line
  const tapeMat = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: .6, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector3(GX + .5 + u * .9 + Math.sin(u * 7 + s) * .12, .018, CZ + s * (1.3 - u * 1.05))); }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .012, 4).scale(1, .15, 1), tapeMat)); }

  // ------------------------------------------------------------ the winners: one wall each, a podium board beside
  const winnerC = (r, moment, label) => canvas(1800, 1200, (g, w, h) => {
    g.fillStyle = '#0b121c'; g.fillRect(0, 0, w, h); g.fillStyle = PAL.ember; g.fillRect(90, 110, 8, 150);
    g.fillStyle = PAL.muted; g.font = `700 38px ${FONT}`; g.letterSpacing = '10px'; g.fillText(`${label} · KONA · 10 OCTOBER 2026`, 130, 150);
    g.fillStyle = PAL.ink; g.font = `400 120px ${SERIF}`; g.letterSpacing = '0px'; fit(g, r.name, 130, 270, w - 260);
    g.fillStyle = '#ffd27a'; g.font = `700 250px ${FONT}`; g.letterSpacing = '4px'; fit(g, r.time, 120, 560, w - 240);
    g.fillStyle = PAL.muted; g.font = `700 36px ${FONT}`; g.letterSpacing = '8px'; g.fillText(`WORLD CHAMPION · ${r.nation} · ${UNOFFICIAL}`, 130, 640);
    g.fillStyle = 'rgba(245,243,238,.9)'; g.font = `italic 400 56px ${SERIF}`; g.letterSpacing = '0px'; wrap(g, moment.line, 130, 780, w - 260, 74);
    g.fillStyle = 'rgba(154,163,173,.8)'; g.font = `600 26px ${FONT}`; g.fillText('KONA.M · AN INDEPENDENT ROOM · NOT AFFILIATED WITH IRONMAN OR THE ATHLETES', 130, h - 80); });
  const podiumC = (list, label) => canvas(900, 1200, (g, w, h) => {
    g.fillStyle = '#101a26'; g.fillRect(0, 0, w, h); g.fillStyle = PAL.muted; g.font = `700 34px ${FONT}`; g.letterSpacing = '8px'; g.fillText(`${label} · TOP 5`, 70, 120); g.fillText('UNOFFICIAL', 70, 170);
    list.forEach((r, i) => { const y = 300 + i * 175; g.fillStyle = i ? PAL.ink : '#ffd27a'; g.font = `700 64px ${FONT}`; g.letterSpacing = '0px'; g.fillText(String(r.place), 70, y);
      g.font = `600 48px ${FONT}`; fit(g, r.name, 160, y - 8, w - 230); g.fillStyle = PAL.muted; g.font = `600 36px ${FONT}`; g.fillText(`${r.nation} · ${r.time}`, 160, y + 46); }); });
  // north wall (z0, inside is z < z0): the women's race; south wall (z1, inside is z > z1): the men's
  const wN = panel(winnerC(W[0], MOMENT['women-final-mile'], 'WOMEN'), 4.5, 3.0, 17.0, 2.35, R.z0 - .02, Math.PI);
  const pN = panel(podiumC(W, 'WOMEN'), 1.8, 2.4, 21.4, 2.2, R.z0 - .02, Math.PI);
  const wS = panel(winnerC(M[0], MOMENT['men-comeback'], 'MEN'), 4.5, 3.0, 17.0, 2.35, R.z1 + .02, 0);
  const pS = panel(podiumC(M, 'MEN'), 1.8, 2.4, 21.4, 2.2, R.z1 + .02, 0);
  info(wN, { model: act => winnerCard(act, 'women'), eyebrow: 'WOMEN · KONA 2026', title: `${W[0].name}, ${W[0].time}`, sub: 'Unofficial' });
  info(wS, { model: act => winnerCard(act, 'men'), eyebrow: 'MEN · KONA 2026', title: `${M[0].name}, ${M[0].time}`, sub: 'Unofficial' });
  info(pN, { model: act => podiumCard(act, 'women'), eyebrow: 'WOMEN · TOP 5', title: 'The podium and the next two', sub: 'Unofficial' });
  info(pS, { model: act => podiumCard(act, 'men'), eyebrow: 'MEN · TOP 5', title: 'The podium and the next two', sub: 'Unofficial' });

  // ------------------------------------------------------------ the kerbs: spectator chairs and street lamps (shared props), palms
  const seats = [];
  for (const [s, rot] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) for (let i = 0; i < (lite ? 7 : 10); i++) { const x = 11 + i * 1.25 + (rand() - .5) * .2; if (Math.abs(x - 17) < .9 || Math.abs(x - 21.4) < .6) continue;
    seats.push({ x, z: CZ + s * (5.7 + rand() * .25), rotation: rot + (rand() - .5) * .35 }); }
  const chairSet = instancedProps('promenade-chair', seats, { lite, contactShadow: ctx.contactShadow });
  const chairs = chairSet.meshes.chair; group.add(chairSet.group);
  info(chairs, { model: act => simple('THE KERB', 'Every seat on Aliʻi faces the road.', 'Spectators line Aliʻi Drive deep into the night to see the last finishers home. These chairs are KONA.m set dressing.')(act), eyebrow: 'THE KERB', title: 'Seats facing the road', sub: 'Aliʻi Drive' });
  const lampAt = [];
  for (const [s, rot] of [[1, -Math.PI / 2], [-1, Math.PI / 2]]) for (const x of [12.2, 18.8, 25.4]) lampAt.push({ x, z: CZ + s * 4.75, rotation: rot });
  const lampSet = instancedProps('promenade-lamp', lampAt, { lite, obstacles, material: (name, m) => name === 'post' ? E(m) : m });
  const { post: lamps, globe: globes, halo: halos } = lampSet.meshes; group.add(lampSet.group);
  const sway = [];
  for (const g of decorateRoom([{ prop: 'kona-palm', x: 32.4, z: -5.0, height: 2.9, seed: 3 }, { prop: 'kona-palm', x: 32.6, z: -16.6, height: 2.7, seed: 8 },
    { prop: 'kona-palm', x: 9.0, z: -4.9, height: 2.3, seed: 13 }, { prop: 'kona-palm', x: 9.2, z: -16.8, height: 2.4, seed: 21 }], { group, lite, obstacles, sway, basaltTex: ctx.basaltTex })) g.userData.prop = 'kona-palm';

  // ------------------------------------------------------------ sign at the door
  const sign = lettering(4.6, .9, g => { g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('SATURDAY // ALIʻI · KONA 2026', 0, .28);
    g.fillStyle = '#b8321c'; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('Decided in the last mile.', 0, .69); }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ light: lamps and the finish, nothing else
  const fill = new THREE.HemisphereLight('#3a5a86', '#1a1410', lite ? .55 : .38); group.add(fill);
  const finishSpot = new THREE.SpotLight('#fff1dc', lite ? 40 : 55, 12, .62, .55, 1.4); finishSpot.position.set(GX - 2.6, R.h - .2, CZ); finishSpot.target.position.set(GX - .4, 0, CZ); group.add(finishSpot, finishSpot.target);
  if (!lite) { finishSpot.castShadow = true; finishSpot.shadow.mapSize.set(2048, 2048); finishSpot.shadow.bias = -.0002; finishSpot.shadow.normalBias = .02; finishSpot.shadow.camera.near = 1.5; finishSpot.shadow.camera.far = 11; }
  const roadGlow = new THREE.PointLight('#ffcf8a', lite ? 6 : 9, 18, 1.6); roadGlow.position.set(18, R.h - .6, CZ); group.add(roadGlow);
  const clockGlow = new THREE.PointLight('#ffb35a', lite ? 2.5 : 4, 6, 1.8); clockGlow.position.set(GX - 1.2, TH, CZ); group.add(clockGlow);

  // ------------------------------------------------------------ bike spot: the host walks visitors to the finish line (no bike here)
  const bikeSpot = { kind: 'beast', pos: new THREE.Vector3(GX, 0, CZ), rotY: 0, bike: null };
  const portrait = coarse && innerHeight > innerWidth;
  bikeSpot.view = portrait ? new THREE.Vector3(GX - 6.8, 0, CZ + .3) : new THREE.Vector3(GX - 8.5, 0, CZ + .25);
  bikeSpot.face = new THREE.Vector3(GX, 2.2, CZ);
  bikeSpot.info = clockInfo;

  // ------------------------------------------------------------ cards
  const disclaimer = { cls: 'G', text: 'An independent KONA.m room. Not affiliated with, endorsed by or sponsored by IRONMAN®, the athletes or any brand. Times are unofficial until the official results are published; taglines are KONA.m copy.' };
  const host = u => new URL(u).hostname.replace(/^www\./, '');
  const src = (line, ids) => `${line} (${[].concat(ids).map(id => host(facts.sources[id])).join(', ')})`;
  const back = act => ({ label: 'Back to Aliʻi', primary: true, onClick: () => act.close() });
  const go = (act, f) => () => ctx.renderCard?.(f(act));
  const more = act => [{ label: 'Women', onClick: go(act, a => winnerCard(a, 'women')) }, { label: 'Men', onClick: go(act, a => winnerCard(a, 'men')) }, { label: 'The last mile', onClick: go(act, mileCard) }];
  const simple = (eyebrow, title, lede, extra = []) => act => ({ kind: 'beast', eyebrow, title, lede, facts: [...extra, disclaimer], actions: [back(act)] });
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'AN INDEPENDENT ROOM · KONA 2026', title: 'Saturday, Aliʻi Drive.', kicker: 'Decided in the last mile.',
      lede: `The IRONMAN World Championship came back to Kailua-Kona on 10 October 2026. ${W[0].name} and ${M[0].name} won it, both late: one in the final mile, one from five and a half minutes down off the bike. This is the finish, after dark.`,
      facts: [{ cls: 'P', text: src(`Women: ${W[0].name} (${W[0].nation}) ${W[0].time}. Men: ${M[0].name} (${M[0].nation}) ${M[0].time}. Unofficial.`, 'nbc_results') }, disclaimer,
        { cls: 'G', text: 'No bike is shown: the room is about the result, and KONA.m does not claim what the winners rode. No photographs, no likeness.' }],
      actions: [{ label: 'Walk to the line →', primary: true, onClick: () => act.close() }, ...more(act)] };
  }
  function winnerCard(act, side) {
    const list = side === 'women' ? W : M, r = list[0], m = MOMENT[side === 'women' ? 'women-final-mile' : 'men-comeback'];
    const extra = side === 'men' ? [{ cls: 'P', text: src(MOMENT['men-penalty'].line, MOMENT['men-penalty'].sources) }] : [];
    return { kind: 'beast', eyebrow: `${side.toUpperCase()} · KONA · 10 OCTOBER 2026`, title: `${r.time}.`, kicker: `${r.name} · ${r.nation} · World Champion (unofficial time)`,
      lede: side === 'women' ? 'Five miles from home the lead changed hands; a mile from home it changed again. The race was decided on the last stretch of road you are standing on.' : 'Off the bike he was five and a half minutes down. He ran the deficit back, took the lead with under five miles left and held it to the line.',
      facts: [{ cls: 'P', text: src(m.line, m.sources) }, ...extra, { cls: 'P', text: src(`2nd ${list[1].name} (${list[1].nation}) ${list[1].time} · 3rd ${list[2].name} (${list[2].nation}) ${list[2].time}.`, 'nbc_results') }, disclaimer],
      actions: [back(act), { label: 'Top 5', onClick: go(act, a => podiumCard(a, side)) }, ...more(act).filter(b => b.label.toLowerCase() !== side)] };
  }
  function podiumCard(act, side) {
    const list = side === 'women' ? W : M;
    return { kind: 'beast', eyebrow: `${side.toUpperCase()} · TOP 5 · UNOFFICIAL`, title: list.map(r => r.place + '. ' + r.name).slice(0, 3).join(' · '), lede: list.map(r => `${r.place}. ${r.name} (${r.nation}) ${r.time}`).join(' · '),
      facts: [{ cls: 'P', text: src('Finishing order and times as published, marked unofficial.', 'nbc_results') }, disclaimer], actions: [back(act), ...more(act)] };
  }
  function mileCard(act) {
    return { kind: 'beast', eyebrow: 'THE LAST MILE', title: 'Palani Road to the line.', kicker: '0.7 miles from home, the lead changed for the last time.',
      lede: 'The stencils on the carpet mark where it happened: Palani Road a mile out, the point where the leader stopped, and the line under the clock.',
      facts: [{ cls: 'P', text: src(MOMENT['women-final-mile'].line, MOMENT['women-final-mile'].sources) }, disclaimer], actions: [back(act), ...more(act)] };
  }
  function clockCard(act) {
    return { kind: 'beast', eyebrow: 'THE CLOCK', title: `${W[0].time} · ${M[0].time}`, kicker: 'The winning times, alternating',
      lede: 'The clock over the line shows the two winning times in turn. They are unofficial: KONA.m will replace them with the official results when IRONMAN publishes them.',
      facts: [{ cls: 'P', text: src(facts.status_note, 'nbc_results') }, disclaimer], actions: [back(act), ...more(act)] };
  }

  // ------------------------------------------------------------ static merge (one draw per material), reflections
  const keepers = new Set([floor, sign, carpet, clock, clockBack, wN, wS, pN, pS, bay, chairs, lamps, globes, halos, bulbMesh, ...sway.map(w => w.o)]);
  group.userData.merged = mergeStatic(group, { keep: o => keepers.has(o) || !!o.userData?.info || o.isLight || o.isPoints || o.isInstancedMesh, decals: true });
  let envDirty = 2;
  const dust = lite ? null : motes({ n: 120, box: [GX - 6, GX + 1, .3, R.h - .6, CZ - 2.5, CZ + 2.5], color: '#ffd9a0', size: .025, rise: .04, sway: .15, opacity: .5 });
  if (dust) group.add(dust.points);
  const env = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(GX - 3, 1.6, CZ), lite, mats: envMats });

  // ------------------------------------------------------------ host interface (same shape as the Beast Cave)
  return {
    group, floor, sign, bikeSpot, infos, mood: SATURDAY_MOOD, ownBikes: true, introCard,
    async useAssets() {},                                                // everything here is procedural or a shared prop
    setBike() { /* no bike in this room: it is about the result, not the equipment */ },
    update(t, reduce) {
      if (envDirty) { envDirty--; if (!envDirty) env.capture(); }
      bayMat.uniforms.t.value = reduce ? 0 : t;
      const k = reduce ? 0 : Math.floor(t / 6) % 2; if (k !== clockShow) drawClock(k);
      if (dust && !reduce) dust.step(t);
      if (!reduce) for (const w of sway) { const a = Math.sin(t * .7 + w.phase) * w.amp; w.o.rotation.z = a; w.o.rotation.x = a * .5; }
      return { power: 0, heat: 0, riding: false };
    },
  };
}

