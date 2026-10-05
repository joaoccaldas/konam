// laidlow-nice.js — LAIDLOW // NICE · BAIE DES ANGES, a review room in the host world (same renderer, cards, mood and
// navigation as every other room; built on the review footprint, gated by ?reviewRoom=laidlow-nice).
//
// The Promenade des Anglais at golden hour, brought indoors: pale limestone underfoot, the blue chairs of Nice facing
// a live Baie des Anges, galets on the beach, and in the middle of it all the Canyon Speedmax CFR on a limestone drum.
// The north wall carries 8:06:22 like a monument; the south wall carries Kona 2022 and Roth 2026. A coach's corner
// for the father who coaches him; a framed front page with the room's one joke.
//
// Truth / rights: every result comes from pitch/sam-laidlow/laidlow-facts-v1.json (sourced). Taglines are KONA.m
// copy, not the athlete's words. No likeness, no athlete marks. The bike is the museum's canonical Canyon Speedmax
// CFR in its documented finish (the line he races, not his race bike). The bay is drawn in a shader: no photograph.
// The newspaper is fictional ("Le Promeneur").
//
// Efficiency: static architecture merged per material (engine/decor.js mergeStatic); chairs, pebbles and balustrade
// posts are InstancedMeshes (one draw each); the bay is one shader plane; one shadow key over the hero (desktop);
// reflections from one local cube capture (engine/env-capture.js). The host loads the bike (phones: the derived
// 77k-triangle hero) through setBike().
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import facts from '../../pitch/sam-laidlow/laidlow-facts-v1.json' with { type: 'json' };
import { BROOM, BDOOR } from './beast-cave.js';
import { lightShaft, motes } from './roomkit.js';
import { mergeStatic } from './engine/decor.js';
import { localEnvCapture } from './engine/env-capture.js';
import { decorateRoom } from './engine/decoration-props.js';
import { framedPainting } from './engine/wing.js';
import { paintingCard, sculptureCard } from './engine/card.js';
import PAINTINGS from '../../museum/art/paintings.json' with { type: 'json' };
import SCULPTURES from '../../museum/art/sculptures.json' with { type: 'json' };

export const LAIDLOW_MOOD = Object.freeze({ exposure: 1.05, hemi: .32, sun: .12, fog: { near: 18, far: 70 }, fogColor: new THREE.Color('#d9c7ae') });
const NICE = facts.results.find(r => r.id === 'nice-2023'), KONA = facts.results.find(r => r.id === 'kona-2022'), ROTH = facts.results.find(r => r.id === 'roth-2026');
const PAL = { limestone: '#e9dfcf', ochre: '#d39b5f', terracotta: '#b65f3c', navy: '#0e2a4a', bleu: '#1f5fa0', chair: '#2f74c0', sea: '#0f5f96', gold: '#f2c879', ink: '#f5f3ee' };

const rng = (seed = 0x5A1D) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb = true, repeat) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };
const fit = (g, text, x, y, maxW) => { const m = g.measureText(text).width; if (m <= maxW) { g.fillText(text, x, y); return; } g.save(); g.translate(x, y); g.scale(maxW / m, 1); g.fillText(text, 0, 0); g.restore(); };
let rectLib = false;

export function buildLaidlowNice(ctx) {
  const { scene, renderer, lettering, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);       // shares the review footprint's culling slot
  const R = BROOM, RW = R.x1 - R.x0, RD = R.z0 - R.z1, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2;
  const GX = 33.7, RAIL = 30.4, HX = 19.6, HZ = CZ;                       // glass line, promenade railing, the hero drum
  const rand = rng();
  const infos = [], info = (mesh, rec) => { for (const m of [].concat(mesh)) { m.userData.info = rec; pickables.push(m); } infos.push(rec); return rec; };
  const envMats = [], E = m => { envMats.push(m); return m; };
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), EU = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const add = (mat, geo, x, y, z, ry = 0, cast = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = cast && !lite; m.receiveShadow = true; group.add(m); return m; };
  const box = (mat, w, h, d, x, y, z, ry = 0, cast = false) => add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, ry, cast);

  // ------------------------------------------------------------ materials: Nice in daylight
  const stoneC = canvas(1024, 1024, (g, w, h) => { g.fillStyle = '#e6dccb'; g.fillRect(0, 0, w, h); const r = rng(3);
    for (let i = 0; i < 9000; i++) { const v = 200 + r() * 40; g.fillStyle = `rgba(${v},${v - 8},${v - 22},.35)`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2); }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(150,130,100,${.04 + r() * .05})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 6.3); g.fill(); }   // fossil pits of the limestone
    g.strokeStyle = 'rgba(120,104,84,.55)'; g.lineWidth = 3; for (const p of [0, w / 2, w]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); } });
  const floorMat = E(new THREE.MeshPhysicalMaterial({ map: tex(stoneC, true, [RW / 3.2, RD / 3.2]), color: '#ffffff', roughness: .55, clearcoat: .25, clearcoatRoughness: .4, envMapIntensity: .5 }));
  const plaster = new THREE.MeshStandardMaterial({ color: '#efe4d2', roughness: .92 });
  const ochre = new THREE.MeshStandardMaterial({ color: PAL.ochre, roughness: .9 });
  const navyWall = new THREE.MeshStandardMaterial({ color: PAL.navy, roughness: .85 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#f4ede2', roughness: .95 });
  const steel = E(new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: .3, metalness: .85 }));
  const darkSteel = E(new THREE.MeshStandardMaterial({ color: '#20262c', roughness: .35, metalness: .8 }));
  const ledWarm = new THREE.MeshBasicMaterial({ color: '#ffe2b8', toneMapped: false });
  const limestone = E(new THREE.MeshPhysicalMaterial({ map: tex(stoneC, true, [1, .3]), color: '#fffaf2', roughness: .4, clearcoat: .5, clearcoatRoughness: .25 }));
  const chairMat = E(new THREE.MeshPhysicalMaterial({ color: PAL.chair, roughness: .32, metalness: .55, clearcoat: .8, clearcoatRoughness: .15 }));

  // ------------------------------------------------------------ floor and shell
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .16, RD), floorMat); floor.position.set(CX, -.074, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);
  box(plaster, RW, R.h, .3, CX, R.h / 2, R.z0 + .15); box(plaster, RW, R.h, .3, CX, R.h / 2, R.z1 - .15);   // north / south
  box(ceilMat, RW, .2, RD, CX, R.h + .1, CZ);
  for (const z of [R.z0, R.z1]) box(ochre, RW, .9, .32, CX, .45, z + (z > CZ ? .16 : -.16));                // an ochre dado: Vieux Nice
  for (let x = 9.6; x < GX - 1; x += 2.6) box(ledWarm, .9, .02, RD - 2.2, x, R.h - .01, CZ);               // long ceiling light slots

  // ------------------------------------------------------------ the bay: glass, the beach, the Baie des Anges
  const BAYS = [R.z0 - .05, -8.6, -13.1, R.z1 + .05];
  for (const z of BAYS) box(steel, .14, R.h, .14, GX, R.h / 2, z);
  box(steel, .18, .12, RD, GX, .06, CZ); box(plaster, .3, .8, RD, GX, R.h - .4, CZ);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(RD, R.h - .8), E(new THREE.MeshPhysicalMaterial({ color: '#dfeef7', roughness: .03, transparent: true, opacity: .08, depthWrite: false, envMapIntensity: 1.3 })));
  glass.rotation.y = -Math.PI / 2; glass.position.set(GX - .02, (R.h - .8) / 2, CZ); group.add(glass);
  obstacles.push({ box: [RAIL - .2, R.x1 + .5, R.z1 - .5, R.z0 + .5] });
  // the sea, the sky, the Colline du Château on the left, the curve of the Promenade's lights on the right
  const bayMat = new THREE.ShaderMaterial({ fog: false, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vU;uniform float t;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){ vec2 u=vU; float hz=.42; vec3 c;
        vec2 sun=vec2(.56,.55); float d=distance(u*vec2(2.2,1.),sun*vec2(2.2,1.));
        vec3 sky=mix(vec3(1.,.78,.52),vec3(.42,.62,.86),smoothstep(hz,1.,u.y)); sky=mix(sky,vec3(1.,.62,.36),smoothstep(.55,.0,abs(u.y-hz-.04))*.55);
        sky+=vec3(1.,.85,.6)*smoothstep(.09,.0,d)*1.2+vec3(1.,.7,.45)*smoothstep(.45,.0,d)*.35;
        float cl=n(vec2(u.x*6.+t*.01,u.y*18.))*n(vec2(u.x*14.,u.y*9.)); sky=mix(sky,vec3(1.,.86,.72),smoothstep(.55,.85,cl)*smoothstep(hz+.05,.9,u.y)*.5);
        // Colline du Château and Mont Boron to the left, the Promenade curving away to the right
        float hill=hz+.11*smoothstep(.32,.0,u.x)*(.8+.2*sin(u.x*40.))+.05*smoothstep(.0,.06,u.x)*smoothstep(.22,.1,u.x);
        float coast=hz+.018*smoothstep(.62,1.,u.x)*(1.+.3*sin(u.x*90.));
        if(u.y>hz){ c=sky; if(u.y<hill) c=mix(vec3(.30,.27,.30),vec3(.46,.38,.36),(u.y-hz)/.11); if(u.y<coast&&u.x>.6) c=vec3(.38,.33,.34);
          float lights=step(.985,h(floor(vec2(u.x*400.,u.y*600.))))*step(.6,u.x)*step(u.y,coast+.004); c+=vec3(1.,.8,.5)*lights*.8; }
        else { float dy=hz-u.y; vec3 sea=mix(vec3(.10,.42,.62),vec3(.03,.22,.40),smoothstep(.0,.42,dy));
          float w=n(vec2(u.x*90.,dy*260.-t*.6))*n(vec2(u.x*40.+t*.2,dy*120.)); float glint=smoothstep(.6,.95,w)*smoothstep(.16,.0,abs(u.x-sun.x))*(1.-smoothstep(.0,.42,dy)*.6);
          c=sea+vec3(1.,.82,.55)*glint*1.4+vec3(.9,.95,1.)*smoothstep(.006,.0,abs(dy-.004))*.25; }
        gl_FragColor=vec4(c,1.); }` });
  const bayW = RD + 2, bayH = R.h + .6, bay = new THREE.Mesh(new THREE.PlaneGeometry(bayW, bayH), bayMat);
  bay.rotation.y = -Math.PI / 2; bay.position.set(R.x1 - .03, bayH / 2 - .3, CZ); group.add(bay);
  // the beach between the railing and the glass: galets, one InstancedMesh, colour per stone
  const PN = lite ? 140 : 340, peb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.1, lite ? 1 : 2), E(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6 })), PN);
  for (let i = 0; i < PN; i++) { const s = .45 + rand() * .9; M4.compose(V.set(RAIL + .5 + rand() * (GX - RAIL - .7), .02 + rand() * .02, R.z1 + .3 + rand() * (RD - .6)), Q.setFromEuler(EU.set(0, rand() * 6.3, 0)), S.set(s * 1.25, s * .42, s));
    peb.setMatrixAt(i, M4); const v = .62 + rand() * .3; peb.setColorAt(i, new THREE.Color(v, v * .97, v * .93)); }
  peb.instanceColor.needsUpdate = true; peb.receiveShadow = true; group.add(peb);
  box(new THREE.MeshStandardMaterial({ color: '#b9ab98', roughness: .95 }), GX - RAIL, .04, RD, (GX + RAIL) / 2, -.01, CZ);
  // the Promenade balustrade: white posts (instanced) and a rail
  const postAt = []; for (let z = R.z1 + .5; z < R.z0 - .3; z += .42) postAt.push(z);
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.035, .05, .92, 10), steel, postAt.length);
  postAt.forEach((z, k) => { M4.makeTranslation(RAIL, .46, z); posts.setMatrixAt(k, M4); }); posts.castShadow = !lite; group.add(posts);
  box(steel, .09, .06, RD - .8, RAIL, .95, CZ); box(steel, .06, .04, RD - .8, RAIL, .35, CZ);
  // potted palms along the Promenade: the museum's canonical kona-palm prop (museum/world/decorations.json)
  const sway = [];
  for (const g of decorateRoom([{ prop: 'kona-palm', x: 27.6, z: -4.9, height: 2.6, seed: 2 }, { prop: 'kona-palm', x: 27.6, z: -16.8, height: 2.4, seed: 5 },
    { prop: 'kona-palm', x: 8.3, z: -4.8, height: 2.2, seed: 7 }, { prop: 'kona-palm', x: 31.6, z: -10.9, height: 2.9, seed: 11 }], { group, lite, obstacles, sway, basaltTex: ctx.basaltTex })) g.userData.prop = 'kona-palm';   // the factory adds to the group

  // ------------------------------------------------------------ the blue chairs of the Promenade, facing the sea (one InstancedMesh)
  const chairGeo = (() => { const p = [], b = (w, h, d, x, y, z, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.applyMatrix4(M4.compose(V.set(x, y, z), Q.setFromEuler(EU.set(rx, 0, 0)), S.set(1, 1, 1))); p.push(g); };
    for (let i = 0; i < 6; i++) b(.06, .02, .5, -.17 + i * .068, .42 - i * .006, 0, 0);                      // seat slats, sloping back
    for (let i = 0; i < 6; i++) b(.06, .52, .02, -.17 + i * .068, .72, -.27, -.32);                         // reclined back slats
    for (const sx of [-.24, .24]) { b(.03, .42, .03, sx, .21, .2); b(.03, .9, .03, sx, .45, -.2, -.18); b(.04, .03, .5, sx, .62, 0); }   // legs and armrests
    const g = mergeGeometries(p.map(x => x.toNonIndexed())); g.rotateY(-Math.PI / 2); return g; })();      // faces +x: the sea
  const chairAt = []; for (let i = 0; i < 11; i++) chairAt.push([28.5 + (i % 2) * .5 + rand() * .3, R.z1 + 1.2 + i * (RD - 2.4) / 10, (rand() - .5) * .5]);
  const chairs = new THREE.InstancedMesh(chairGeo, chairMat, chairAt.length);
  chairAt.forEach(([x, z, yaw], k) => { M4.compose(V.set(x, 0, z), Q.setFromEuler(EU.set(0, yaw, 0)), S.set(1, 1, 1)); chairs.setMatrixAt(k, M4); }); chairs.castShadow = !lite; chairs.receiveShadow = true; group.add(chairs);
  info(chairs, { model: act => chairsCard(act), eyebrow: 'LES CHAISES BLEUES', title: 'A seat facing the sea.', sub: 'The Promenade des Anglais' });

  // ------------------------------------------------------------ the header over the bay
  const header = lettering(5.4, .8, g => { g.textAlign = 'center'; g.fillStyle = '#1b2733'; g.font = `800 .34px ${FONT}`; g.letterSpacing = '.02px'; g.fillText('KONA.m', 2.7, .38);
    g.fillStyle = 'rgba(27,39,51,.82)'; g.font = `600 .16px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('LAIDLOW // NICE · BAIE DES ANGES', 2.7, .68); }, 1536);
  header.rotation.y = -Math.PI / 2; header.position.set(GX - .2, R.h - .42, CZ); group.add(header);

  // ------------------------------------------------------------ north wall: 8:06:22, cut like a monument (real-pixel canvas)
  const panel = (w, h, px, draw) => { const c = canvas(px, Math.round(px * h / w), draw), t = tex(c);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: .35, roughness: .75 }); };
  box(navyWall, 12.4, 4.6, .06, 21.0, 2.75, R.z0 + .33);
  const monMat = panel(12, 4.4, 2400, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#12355c'); gr.addColorStop(1, '#0b2440'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.fillStyle = 'rgba(245,243,238,.78)'; g.font = `700 36px ${FONT}`; g.letterSpacing = '12px'; g.fillText('IRONMAN WORLD CHAMPIONSHIP · NICE · 10 SEPTEMBER 2023', w / 2, 120);
    g.fillStyle = PAL.gold; g.font = `400 470px ${SERIF}`; g.letterSpacing = '-6px'; g.fillText(NICE.time, w / 2, 560);
    g.fillStyle = 'rgba(245,243,238,.9)'; g.font = `600 44px ${FONT}`; g.letterSpacing = '10px';
    const sp = [['SWIM', NICE.splits.swim], ['BIKE', NICE.splits.bike], ['RUN', NICE.splits.run]];
    sp.forEach(([k, v], i) => { const x = w * (.25 + i * .25); g.fillStyle = 'rgba(245,243,238,.55)'; g.font = `600 30px ${FONT}`; g.fillText(k, x, 660); g.fillStyle = '#f5f3ee'; g.font = `400 78px ${SERIF}`; g.letterSpacing = '0px'; g.fillText(v, x, 745); g.letterSpacing = '10px'; });
    g.fillStyle = 'rgba(245,243,238,.18)'; g.fillRect(w * .12, 790, w * .76, 2);
    for (let i = 0; i < 3; i++) { g.fillStyle = ['#2f5fae', '#f5f3ee', '#c8323f'][i]; g.fillRect(w / 2 - 90 + i * 60, 820, 60, 8); }
    g.fillStyle = 'rgba(245,243,238,.82)'; g.font = `italic 400 52px ${SERIF}`; g.letterSpacing = '0px'; fit(g, 'First from France. Youngest man ever. On home soil.', w / 2, 905, w * .8); });
  const mon = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.4), monMat); mon.rotation.y = Math.PI; mon.position.set(21.0, 2.75, R.z0 + .3); group.add(mon);
  info(mon, { model: act => niceCard(act), eyebrow: 'NICE · 2023', title: NICE.time, sub: 'IRONMAN World Champion' });
  for (const x of [15.5, 21, 26.5]) { const s = new THREE.SpotLight('#ffe6c4', lite ? 10 : 16, 7, .55, .6, 1.4); s.position.set(x, R.h - .2, R.z0 + 2.2); s.target.position.set(x, 2.6, R.z0 + .3); group.add(s, s.target); }

  // ------------------------------------------------------------ south wall: Kona 2022, the front page, Roth 2026
  const recordPanel = (x, w, h, top, big, bigCol, line1, line2, grad) => {
    const m = panel(w, h, 1400, (g, cw, ch) => { const gr = g.createLinearGradient(0, 0, cw, ch); gr.addColorStop(0, grad[0]); gr.addColorStop(1, grad[1]); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
      g.fillStyle = 'rgba(245,243,238,.7)'; g.font = `700 34px ${FONT}`; g.letterSpacing = '9px'; g.fillText(top, 80, 120);
      g.fillStyle = bigCol; g.font = `400 300px ${SERIF}`; g.letterSpacing = '-4px'; fit(g, big, 70, 440, cw - 140);
      g.fillStyle = '#f5f3ee'; g.font = `600 44px ${FONT}`; g.letterSpacing = '6px'; fit(g, line1, 80, 560, cw - 160);
      g.fillStyle = 'rgba(245,243,238,.7)'; g.font = `500 34px ${FONT}`; g.letterSpacing = '3px'; fit(g, line2, 80, 630, cw - 160); });
    box(darkSteel, w + .14, h + .14, .04, x, 2.35, R.z1 - .26);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, 2.35, R.z1 - .23); group.add(p); return p; };
  const kona = recordPanel(14.0, 4.6, 3.1, 'KAILUA-KONA · 8 OCTOBER 2022', KONA.bike, '#ff8a3d', 'BIKE COURSE RECORD · 180 KM', `2nd overall · ${KONA.time}`, ['#2a0f08', '#0c0a0a']);
  info(kona, { model: act => konaCard(act), eyebrow: 'KONA · 2022', title: `${KONA.bike} on the Queen K`, sub: 'Bike course record' });
  const roth = recordPanel(28.0, 4.6, 3.1, 'ROTH · 5 JULY 2026', ROTH.time, '#9fd0ff', 'LONG-DISTANCE WORLD RECORD', 'Canyon Speedmax CFR · then unreleased (per Canyon)', ['#0b1f33', '#081018']);
  info(roth, { model: act => rothCard(act), eyebrow: 'ROTH · 2026', title: ROTH.time, sub: 'Long-distance world record, per Canyon' });
  // the front page: fictional paper, gilt frame, the room's one joke
  const paperMat = panel(2.0, 2.7, 1200, (g, w, h) => { g.fillStyle = '#f1ead9'; g.fillRect(0, 0, w, h); const r = rng(41); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(90,70,40,${r() * .05})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = '#1d1a16'; g.textAlign = 'center'; g.font = `700 112px ${SERIF}`; g.fillText('Le Promeneur', w / 2, 150);
    g.font = `600 22px ${FONT}`; g.letterSpacing = '6px'; g.fillText('NICE · LUNDI 11 SEPTEMBRE 2023 · ÉDITION SPÉCIALE', w / 2, 200); g.letterSpacing = '0px';
    g.fillRect(60, 225, w - 120, 4); g.fillRect(60, 236, w - 120, 1.5);
    g.font = `800 118px ${SERIF}`; fit(g, 'LE JEUNE HOMME', w / 2, 380, w - 120); fit(g, 'ET LA MER', w / 2, 500, w - 120);
    g.font = `italic 400 58px ${SERIF}`; g.fillText('Nice. Very nice.', w / 2, 590);
    g.fillStyle = '#8a1f1f'; g.font = `700 30px ${FONT}`; g.letterSpacing = '3px'; fit(g, `8:06:22 · FIRST FRENCH CHAMPION · YOUNGEST EVER`, w / 2, 660, w - 140); g.letterSpacing = '0px';
    g.fillStyle = '#3a342c'; g.textAlign = 'left'; g.font = `400 30px ${SERIF}`;
    const col = ['Local man rides 180 km and ends up', 'exactly where he started. Experts', 'call it "a course". The Promenade', 'calls it the best Sunday since 1880.', '', 'Swim 47:50. Bike 4:31:28.', 'Run 2:41:46. Chairs: all occupied.'];
    col.forEach((t, i) => g.fillText(t, 90, 760 + i * 46));
    g.fillStyle = 'rgba(29,26,22,.18)'; g.fillRect(w / 2 + 40, 735, w / 2 - 130, 300);
    g.fillStyle = '#3a342c'; g.font = `italic 400 24px ${SERIF}`; g.fillText('No photograph: we were all watching.', w / 2 + 60, 1070);
    g.font = `600 18px ${FONT}`; g.letterSpacing = '3px'; g.fillStyle = 'rgba(29,26,22,.55)'; g.fillText('A FICTIONAL FRONT PAGE · KONA.m', 90, h - 50); });
  const gilt = E(new THREE.MeshStandardMaterial({ color: '#b8893c', roughness: .3, metalness: 1 }));
  box(gilt, 2.3, 3.0, .07, 21.0, 2.35, R.z1 - .25);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.7), paperMat); paper.position.set(21.0, 2.35, R.z1 - .205); group.add(paper);
  info(paper, { model: act => paperCard(act), eyebrow: 'LE PROMENEUR', title: 'Le jeune homme et la mer.', sub: 'A fictional front page' });
  for (const x of [14.0, 21.0, 28.0]) { const s = new THREE.SpotLight('#ffe9cf', lite ? 8 : 13, 6.5, .5, .65, 1.4); s.position.set(x, R.h - .2, R.z1 + 2.2); s.target.position.set(x, 2.3, R.z1); group.add(s, s.target); }

  // ------------------------------------------------------------ the hero drum: limestone, a bleu-blanc-rouge ring of light
  const drum = add(limestone, new THREE.CylinderGeometry(1.75, 1.85, .34, 64), HX, .17, HZ, 0, true);
  box(steel, .02, .02, .02, HX, .35, HZ);
  const ringC = canvas(1024, 8, (g, w) => { const s = ['#2f5fae', '#f5f3ee', '#c8323f']; for (let i = 0; i < 3; i++) { g.fillStyle = s[i]; g.fillRect(i * w / 3, 0, w / 3, 8); } });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.86, .018, 8, 160), new THREE.MeshBasicMaterial({ map: tex(ringC), toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.set(HX, .32, HZ); group.add(ring);
  obstacles.push({ c: new THREE.Vector3(HX, 0, HZ), r: 1.95 });
  if (ctx.contactShadow) { const cs = ctx.contactShadow(2.2, .6); cs.position.set(HX, .345, HZ); cs.rotation.z = Math.PI / 2; group.add(cs); }
  const plaque = lettering(2.2, .2, g => { g.fillStyle = 'rgba(30,38,46,.9)'; g.font = `600 .085px ${FONT}`; g.letterSpacing = '.014px'; g.fillText('CANYON SPEEDMAX CFR · THE LINE HE RACES', .05, .13); }, 1024);
  plaque.rotation.set(-Math.PI / 2 + .35, 0, -Math.PI / 2); plaque.position.set(HX - 1.95, .2, HZ); group.add(plaque);

  // ------------------------------------------------------------ museum art from the catalogue (museum/art), hung the way the wings hang it
  const P = id => PAINTINGS.paintings.find(p => p.id === id), SC = id => SCULPTURES.sculptures.find(x => x.id === id);
  const texLoader = new THREE.TextureLoader(), frameMat = new THREE.MeshStandardMaterial({ color: '#1c1916', roughness: .5 });
  const ROOM = 'LAIDLOW // NICE';
  for (const [id, x, y, z, ry] of [['queen-k-first-light', 9.55, 2.35, R.z1 - .22, 0], ['race-morning-bay', 7.55, 2.2, -12.4, Math.PI / 2], ['midnight-seawall', 7.55, 2.3, -15.0, Math.PI / 2]]) {
    const p = P(id); if (!p) continue;
    const { g, fr, pic } = framedPainting(p, { frameMat, texLoader, wash: null, lettering, FONT, SERIF, width: 1.6 });
    g.position.set(x, y, z); g.rotation.y = ry; group.add(g);
    info([pic, fr], { model: () => paintingCard(p, { room: ROOM }), eyebrow: 'FROM THE MUSEUM', title: p.title, sub: p.medium });
  }
  const sculptAt = [['the-tuck', 12.9, -5.4, .5], ['sea-glass-wave', 32.0, -13.6, -1.2]], sculptHolders = [];
  for (const [id, x, z, yaw] of sculptAt) { const sc = SC(id); if (!sc) continue;
    box(limestone, .7, .62, .7, x, .31, z, 0, true); obstacles.push({ c: new THREE.Vector3(x, 0, z), r: .55 });
    const h = new THREE.Group(); h.position.set(x, .62, z); h.rotation.y = yaw; group.add(h); sculptHolders.push({ h, sc }); }

  // ------------------------------------------------------------ the coach's corner: a director's chair and a whiteboard
  const canvasBlue = new THREE.MeshStandardMaterial({ color: PAL.bleu, roughness: .9 }), wood = new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: .7 });
  const cx = 11.2, cz = -15.6;
  for (const [dx, dz] of [[-.25, -.2], [.25, -.2], [-.25, .2], [.25, .2]]) box(wood, .035, .45, .035, cx + dx, .225, cz + dz);
  box(canvasBlue, .52, .03, .44, cx, .46, cz); box(canvasBlue, .52, .32, .02, cx, .78, cz - .22); for (const dx of [-.27, .27]) box(wood, .035, .5, .035, cx + dx, .7, cz - .22);
  const boardMat = panel(1.4, 1.0, 900, (g, w, h) => { g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1f5fa0'; g.lineWidth = 6; g.lineCap = 'round';
    g.font = `700 54px ${FONT}`; g.fillStyle = '#1f5fa0'; g.fillText('RACE WEEK · NICE', 50, 90);
    const arrow = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 26 * Math.cos(a - .5), y1 - 26 * Math.sin(a - .5)); g.moveTo(x1, y1); g.lineTo(x1 - 26 * Math.cos(a + .5), y1 - 26 * Math.sin(a + .5)); g.stroke(); };
    g.font = `600 46px ${FONT}`; g.fillStyle = '#20262c'; [['SWIM', 120], ['BIKE', 400], ['RUN', 660]].forEach(([t, x], i) => { g.fillText(t, x - 50, 260); if (i < 2) arrow(x + 80, 245, x + 190, 245); });
    g.strokeStyle = '#c8323f'; g.beginPath(); g.ellipse(430, 245, 140, 60, 0, 0, 6.3); g.stroke();
    g.fillStyle = '#c8323f'; g.font = `italic 600 44px ${SERIF}`; g.fillText('go at 40 km', 330, 360);
    g.fillStyle = '#20262c'; g.font = `500 36px ${FONT}`; g.fillText('— Dad', 640, 520); });
  box(wood, .04, 1.7, .04, cx + 1.0, .85, cz + .3); box(wood, .04, 1.7, .04, cx + 1.7, .85, cz + .3);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), boardMat); board.position.set(cx + 1.35, 1.25, cz + .33); group.add(board);
  info([board], { model: act => coachCard(act), eyebrow: 'THE COACH', title: 'Coached by his father.', sub: 'Richard Laidlow' });
  obstacles.push({ c: new THREE.Vector3(cx + .6, 0, cz), r: 1.0 });

  // ------------------------------------------------------------ hall-side sign over the door
  const sign = lettering(4.6, .9, g => { g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('LAIDLOW // NICE · BAIE DES ANGES', 0, .28);
    g.fillStyle = PAL.bleu; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('8:06:22. Nice, very nice.', 0, .69); }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ light: the bay does most of the work
  if (!rectLib) { RectAreaLightUniformsLib.init(); rectLib = true; }
  const sunIn = new THREE.RectAreaLight('#ffc48a', lite ? 4.5 : 6, RD - 1, 3.6); sunIn.position.set(GX - .1, 2.2, CZ); sunIn.lookAt(GX - 6, 1.0, CZ); group.add(sunIn);
  const skyFill = new THREE.HemisphereLight('#cfe3ff', '#e4d3bb', lite ? .9 : .6); group.add(skyFill);
  const heroSpot = new THREE.SpotLight('#fff1dc', lite ? 26 : 34, 9, .5, .5, 1.3); heroSpot.position.set(HX - 1.6, R.h - .2, HZ + 1.2); heroSpot.target.position.set(HX, .6, HZ); group.add(heroSpot, heroSpot.target);
  if (!lite) { heroSpot.castShadow = true; heroSpot.shadow.mapSize.set(2048, 2048); heroSpot.shadow.bias = -.0002; heroSpot.shadow.normalBias = .02; heroSpot.shadow.camera.near = 2; heroSpot.shadow.camera.far = 9; }
  if (!lite) { const shaft = lightShaft({ top: .5, bottom: 2.4, height: 6.5, color: '#ffd9a8', opacity: .07 }); shaft.position.set(GX - .3, R.h - .3, CZ + 1.5); shaft.lookAt(HX + 4, 0, HZ); shaft.rotateX(Math.PI / 2); group.add(shaft); }

  // ------------------------------------------------------------ bike spot: the host loads the canonical Speedmax CFR (setBike)
  const bikeSpot = { kind: 'beast', pos: new THREE.Vector3(HX, 0, HZ), rotY: 0, bike: null };
  const portrait = coarse && innerHeight > innerWidth;
  bikeSpot.view = portrait ? new THREE.Vector3(14.4, 0, HZ + .6) : new THREE.Vector3(12.6, 0, HZ + .4);
  bikeSpot.face = new THREE.Vector3(HX + .6, 1.1, HZ);
  bikeSpot.info = info(drum, { model: act => bikeCard(act), eyebrow: 'THE BIKE', title: 'Canyon Speedmax CFR', sub: facts.equipment.line });

  // ------------------------------------------------------------ cards
  const disclaimer = { cls: 'G', text: 'An independent KONA.m room. Not affiliated with, endorsed by or sponsored by Sam Laidlow, his team, IRONMAN®, Challenge or any brand. Taglines are KONA.m copy.' };
  const src = (line, urls) => `${line} (${[].concat(urls).map(u => u.includes('wikipedia') ? 'Wikipedia' : new URL(u).hostname.replace(/^www\./, '')).join(', ')})`;
  const back = act => ({ label: 'Back to the promenade', primary: true, onClick: () => act.close() });
  const more = (act, skip) => [['Nice 2023', niceCard], ['Kona 2022', konaCard], ['Roth 2026', rothCard], ['The bike', bikeCard]].filter(([, f]) => f !== skip).map(([label, f]) => ({ label, onClick: () => ctx.renderCard?.(f(act)) }));
  function introCard(act) {
    return { kind: 'beast', eyebrow: 'AN INDEPENDENT ROOM · LAIDLOW // NICE', title: 'Baie des Anges.', kicker: '8:06:22. Nice, very nice.',
      lede: 'The Promenade des Anglais at golden hour, brought indoors for Sam Laidlow: limestone underfoot, the blue chairs facing the sea, and the Canyon Speedmax CFR on a drum of stone in the middle of it all.',
      facts: [{ cls: 'P', text: src(`${NICE.event}, ${NICE.place}: 1st in ${NICE.time}. ${NICE.note}`, NICE.sources) }, disclaimer,
        { cls: 'G', text: 'No likeness is used. The bay is drawn in real time, not photographed.' }],
      actions: [{ label: 'Walk to the bike →', primary: true, onClick: () => act.close() }, ...more(act)] };
  }
  function niceCard(act) {
    return { kind: 'beast', eyebrow: 'NICE · 10 SEPTEMBER 2023', title: NICE.time, kicker: `Swim ${NICE.splits.swim} · Bike ${NICE.splits.bike} · Run ${NICE.splits.run}`,
      lede: 'A world title on home roads: away on the bike, alone on the Promenade, and the whole bay watching.',
      facts: [{ cls: 'P', text: src(NICE.note, NICE.sources) }, disclaimer], actions: [back(act), ...more(act, niceCard)] };
  }
  function konaCard(act) {
    return { kind: 'beast', eyebrow: 'KAILUA-KONA · 2022', title: `${KONA.bike}.`, kicker: `2nd overall in ${KONA.time}`,
      lede: 'The Queen K at a speed nobody had ridden it before: the bike course record, and second on the island a year before Nice.',
      facts: [{ cls: 'P', text: src(KONA.note, KONA.sources) }, disclaimer], actions: [back(act), ...more(act, konaCard)] };
  }
  function rothCard(act) {
    return { kind: 'beast', eyebrow: 'ROTH · 5 JULY 2026', title: `${ROTH.time}.`, kicker: 'Long-distance world record, per Canyon',
      lede: 'Roth, again, faster than anyone over the full distance, on a Speedmax CFR the public had not seen yet.',
      facts: [{ cls: 'P', text: src(ROTH.note, ROTH.sources) }, disclaimer], actions: [back(act), ...more(act, rothCard)] };
  }
  function bikeCard(act) {
    return { kind: 'beast', eyebrow: 'THE BIKE · LAIDLOW // NICE', title: 'Canyon Speedmax CFR.', kicker: facts.equipment.line,
      lede: 'The KONA.m museum’s own Speedmax CFR, in its documented finish, on a drum of Nice limestone. Walk round it.',
      facts: [{ cls: 'P', text: src(facts.equipment.line, facts.equipment.sources) }, { cls: 'G', text: facts.equipment.room_model }, disclaimer], actions: [back(act), ...more(act, bikeCard)] };
  }
  const simple = (eyebrow, title, lede, extra = []) => act => ({ kind: 'beast', eyebrow, title, lede, facts: [...extra, disclaimer], actions: [back(act)] });
  const chairsCard = simple('LES CHAISES BLEUES', 'A seat facing the sea.', 'The blue chairs of the Promenade des Anglais, turned to the bay the way Nice turns them every evening. Sit for a minute: the race came past right here.');
  const coachCard = act => simple('THE COACH', 'Coached by his father.', 'A director’s chair and a whiteboard for race week. The board is KONA.m set dressing, not anyone’s actual plan.', [{ cls: 'P', text: src(facts.athlete.coach.line, facts.athlete.coach.source) }])(act);
  const paperCard = simple('LE PROMENEUR · A FICTIONAL FRONT PAGE', 'Le jeune homme et la mer.', 'Local man rides 180 km and ends up exactly where he started. The paper is invented; the times on it are real.', [{ cls: 'P', text: src(`Nice 2023 splits: swim ${NICE.splits.swim}, bike ${NICE.splits.bike}, run ${NICE.splits.run}.`, NICE.sources) }]);

  // ------------------------------------------------------------ static merge (one draw per material), reflections
  const keepers = new Set([floor, sign, drum, ring, mon, kona, roth, paper, board, bay, glass, chairs, peb, posts, ...sculptHolders.map(s => s.h), ...sway.map(w => w.o)]);
  group.userData.merged = mergeStatic(group, { keep: o => keepers.has(o) || !!o.userData?.info || o.isLight || o.isPoints || o.isInstancedMesh || o.material?.transparent });
  let envDirty = 2;
  const dust = lite ? null : motes({ n: 160, box: [GX - 7, GX - .4, .3, R.h - .6, CZ - 3, CZ + 3], color: '#ffe2b0', size: .03, rise: .05, sway: .18, opacity: .6 });   // the sunbeam's dust (roomkit)
  if (dust) group.add(dust.points);
  const env = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(HX - 3, 1.6, HZ), lite, mats: envMats });

  // ------------------------------------------------------------ host interface (same shape as the Beast Cave)
  return {
    group, floor, sign, bikeSpot, infos, mood: LAIDLOW_MOOD, introCard,
    async useAssets(loader) {                                           // the museum's sculptures (museum/art/sculptures.json), scaled as catalogued
      if (this._assets) return; this._assets = true;
      for (const { h, sc } of sculptHolders) loader.loadAsync(`assets/art/sculptures/${sc.file}`).then(g => {
        const m = g.scene, b = new THREE.Box3().setFromObject(m), size = b.getSize(new THREE.Vector3()); m.scale.setScalar(sc.height / Math.max(.001, size.y));
        const b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3()); m.position.set(-c.x, -b2.min.y, -c.z);
        m.traverse(o => { if (o.isMesh) { o.castShadow = !lite; envMats.push(o.material); } }); h.add(m);
        const parts = []; m.traverse(o => { if (o.isMesh) parts.push(o); });
        info(parts, { model: () => sculptureCard(sc, { room: ROOM }), eyebrow: 'FROM THE MUSEUM', title: sc.title, sub: sc.material });
        envDirty = 2; }).catch(e => console.warn('sculpture', sc.id, e?.message || e));
    },
    setBike(bike, dress) {                                             // the canonical Speedmax CFR, side-on to the door, front wheel to the 8:06:22 wall
      bike.traverse(o => { if (!o.isMesh) return; o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); o.castShadow = !lite; delete o.userData.piece; o.userData.info = bikeSpot.info; pickables.push(o); });
      dress?.(bike);
      const holder = new THREE.Group(); holder.add(bike); group.add(holder);
      const node = n => bike.getObjectByName(n) || [...bike.children].find(ch => ch.userData?.part === n), centre = o => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      const box0 = new THREE.Box3().setFromObject(bike), c0 = box0.getCenter(new THREE.Vector3()); bike.position.set(-c0.x, -box0.min.y, -c0.z);
      holder.position.set(HX, .34, HZ); holder.updateMatrixWorld(true);
      const front = node('wheel_front'), rear = node('wheel_rear');
      if (front && rear) { const f = centre(front), r = centre(rear); holder.rotation.y = Math.atan2(-(f.x - r.x), f.z - r.z); /* wheelbase onto +z */ holder.updateMatrixWorld(true);
        if (centre(front).z < centre(rear).z) { holder.rotation.y += Math.PI; holder.updateMatrixWorld(true); }
        const m = centre(front).add(centre(rear)).multiplyScalar(.5); holder.position.x += HX - m.x; holder.position.z += HZ - m.z; }
      bikeSpot.bike = holder; envDirty = 2;
    },
    update(t, reduce, dt = 1 / 60) {
      if (envDirty) { envDirty--; if (!envDirty) env.capture(); }
      bayMat.uniforms.t.value = reduce ? 0 : t;
      if (dust && !reduce) dust.step(t);
      if (!reduce) for (const w of sway) { const a = Math.sin(t * .9 + w.phase) * w.amp; w.o.rotation.z = a; w.o.rotation.x = a * .5; }
      return { power: 0, heat: 0, riding: false };
    },
  };
}
