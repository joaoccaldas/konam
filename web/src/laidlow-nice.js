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
import { travertineTex, marbleTex, wallWash, normalFrom } from './engine/textures.js';
import { decorateRoom } from './engine/decoration-props.js';
import { framedPainting } from './engine/wing.js';
import { paintingCard, sculptureCard } from './engine/card.js';
import PAINTINGS from '../../museum/art/paintings.json' with { type: 'json' };
import SCULPTURES from '../../museum/art/sculptures.json' with { type: 'json' };

export const LAIDLOW_MOOD = Object.freeze({ exposure: .98, hemi: .22, sun: .1, fog: { near: 18, far: 70 }, fogColor: new THREE.Color('#d9c7ae') });
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
  const travMap = travertineTex([RW / 3.0, RD / 3.0]);                  // the museum's own stone (engine/textures.js)
  const travN = lite ? null : normalFrom(travMap.image, 1.1); if (travN) travN.repeat.set(RW / 3.0, RD / 3.0);
  const floorMat = E(new THREE.MeshPhysicalMaterial({ map: travMap, normalMap: travN, normalScale: new THREE.Vector2(.25, .25), color: '#fbf5ea', roughness: .5, clearcoat: lite ? 0 : .35, clearcoatRoughness: .3, envMapIntensity: .55 }));
  const stuccoH = canvas(lite ? 256 : 512, lite ? 256 : 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(17);
    for (let i = 0; i < (lite ? 1800 : 7000); i++) { const v = 100 + r() * 70; g.fillStyle = `rgba(${v},${v},${v},.35)`; g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 5, 1 + r() * 3, r() * 3, 0, 6.3); g.fill(); } });
  const stuccoC = canvas(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e9dcc6'); gr.addColorStop(1, '#f3e9d8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalAlpha = .18; g.drawImage(stuccoH, 0, 0, w, h); });
  const plaster = new THREE.MeshStandardMaterial({ map: tex(stuccoC, true, [RW / 4, R.h / 4]), normalMap: lite ? null : Object.assign(normalFrom(stuccoH, 1.6), {}), normalScale: new THREE.Vector2(.5, .5), color: '#ffffff', roughness: .93 });
  if (plaster.normalMap) plaster.normalMap.repeat.set(RW / 4, R.h / 4);
  const moulding = new THREE.MeshStandardMaterial({ color: '#f6efe3', roughness: .7 });
  const ochre = new THREE.MeshStandardMaterial({ color: PAL.ochre, roughness: .9 });
  const navyWall = new THREE.MeshStandardMaterial({ color: PAL.navy, roughness: .85 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#f4ede2', roughness: .95 });
  const steel = E(new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: .3, metalness: .85 }));
  const darkSteel = E(new THREE.MeshStandardMaterial({ color: '#20262c', roughness: .35, metalness: .8 }));
  const ledWarm = new THREE.MeshBasicMaterial({ color: '#ffe2b8', toneMapped: false });
  const limestone = E(new THREE.MeshPhysicalMaterial({ map: marbleTex('#f7f1e6', '150,132,108', [1, .35], 9), color: '#fffaf2', roughness: .4, clearcoat: .5, clearcoatRoughness: .25 }));
  const chairMat = E(new THREE.MeshPhysicalMaterial({ color: PAL.chair, roughness: .32, metalness: .55, clearcoat: .8, clearcoatRoughness: .15 }));

  // ------------------------------------------------------------ floor and shell
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW, .16, RD), floorMat); floor.position.set(CX, -.074, CZ); floor.receiveShadow = true; floor.userData.floor = true; group.add(floor); pickables.push(floor);
  box(plaster, RW, R.h, .3, CX, R.h / 2, R.z0 + .15); box(plaster, RW, R.h, .3, CX, R.h / 2, R.z1 - .15);   // north / south
  box(ceilMat, RW, .2, RD, CX, R.h + .1, CZ);
  for (const z of [R.z0, R.z1]) box(ochre, RW, .9, .04, CX, .45, z + (z > CZ ? -.02 : .02));   // inside faces: north is z < z0, south is z > z1                // an ochre dado: Vieux Nice
  for (let x = 9.6; x < GX - 1; x += 2.6) box(ledWarm, .9, .02, RD - 2.2, x, R.h - .01, CZ);               // long ceiling light slots
  // Belle Époque order on the long walls: pilasters with capitals, a stepped crown cornice, a stone skirting
  for (const [z, d] of [[R.z0, -1], [R.z1, 1]]) {
    for (const x of [8.4, 11.8, 30.2, 32.9]) { box(moulding, .34, R.h - .6, .08, x, (R.h - .6) / 2 + .1, z + d * .04); box(moulding, .46, .14, .14, x, R.h - .42, z + d * .07); box(moulding, .44, .12, .12, x, .16, z + d * .06); }
    box(moulding, RW, .1, .16, CX, R.h - .25, z + d * .08); box(moulding, RW, .07, .26, CX, R.h - .14, z + d * .13); box(moulding, RW, .05, .36, CX, R.h - .05, z + d * .18);
    box(moulding, RW, .1, .05, CX, .95, z + d * .045);                 // a dado rail over the ochre band
  }

  // ------------------------------------------------------------ the bay: glass, the beach, the Baie des Anges
  const BAYS = [R.z0 - .05, -8.6, -13.1, R.z1 + .05];
  for (const z of BAYS) box(steel, .14, R.h, .14, GX, R.h / 2, z);
  box(steel, .18, .12, RD, GX, .06, CZ); box(plaster, .3, .8, RD, GX, R.h - .4, CZ);
  for (let i = 0; i < 3; i++) { const z0 = BAYS[i], z1 = BAYS[i + 1], w = Math.abs(z1 - z0), arch = new THREE.TorusGeometry(w / 2 - .08, .06, lite ? 6 : 10, lite ? 24 : 48, Math.PI);
    arch.rotateY(Math.PI / 2); add(moulding, arch, GX - .05, R.h - 1.6 - (w / 2 - .08) * .25, (z0 + z1) / 2).scale.set(1, .5, 1);
    box(steel, .05, .05, w, GX - .02, 1.0, (z0 + z1) / 2); }                        // the arches of a Promenade façade, a rail at sill height
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
        vec2 dq=(u-vec2(.80,coast))*vec2(70.,110.); float dome=step(length(vec2(dq.x,max(dq.y,0.)))-1.,0.)*step(0.,dq.y)+step(abs(dq.x),.12)*step(1.,dq.y)*step(dq.y,1.6);   // the Negresco's pink dome
        if(u.y>hz){ c=sky; if(u.y<hill) c=mix(vec3(.30,.27,.30),vec3(.46,.38,.36),(u.y-hz)/.11); if(u.y<coast&&u.x>.6) c=vec3(.38,.33,.34); if(dome>.5) c=mix(vec3(.93,.62,.58),vec3(.55,.40,.42),smoothstep(.0,1.2,dq.y)*.5);
          float lights=step(.985,h(floor(vec2(u.x*400.,u.y*600.))))*step(.6,u.x)*step(u.y,coast+.004); c+=vec3(1.,.8,.5)*lights*.8; }
        else { float dy=hz-u.y; vec3 sea=mix(vec3(.10,.42,.62),vec3(.03,.22,.40),smoothstep(.0,.42,dy));
          float w=n(vec2(u.x*90.,dy*260.-t*.6))*n(vec2(u.x*40.+t*.2,dy*120.)); float glint=smoothstep(.6,.95,w)*smoothstep(.16,.0,abs(u.x-sun.x))*(1.-smoothstep(.0,.42,dy)*.6);
          c=sea+vec3(1.,.82,.55)*glint*1.4+vec3(.9,.95,1.)*smoothstep(.006,.0,abs(dy-.004))*.25;
          for(int k=0;k<3;k++){ float fk=float(k); vec2 b=vec2(fract(.18+fk*.29+t*.002*(1.+fk*.3)),.012+fk*.018);   // sails far out on the bay
            float sx=(u.x-b.x)/(.004+fk*.002), sy=(dy-b.y)/(.02+fk*.008); if(sy<0.&&sy>-1.&&abs(sx)<1.+sy) c=mix(c,vec3(.97,.95,.9),.9); } }
        if(u.y>hz+.08){ for(int k=0;k<4;k++){ float fk=float(k); vec2 b=vec2(fract(.3+fk*.21+t*.006*(1.+fk*.2)),.62+fk*.05+.01*sin(t*.5+fk));   // gulls gliding
          vec2 q=(u-b)*vec2(180.,260.); float wing=abs(abs(q.x)-1.2+.0)*.6+abs(q.y+.5*abs(q.x)-.0); if(abs(q.x)<2.4&&abs(q.y+.4*abs(q.x)*(.6+.4*sin(t*4.+fk)))<.18) c=mix(c,vec3(.25,.24,.26),.85); } }
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
  for (const g of decorateRoom([{ prop: 'kona-palm', x: 28.9, z: -4.9, height: 2.6, seed: 2 }, { prop: 'kona-palm', x: 32.3, z: -16.5, height: 2.4, seed: 5 },
    { prop: 'kona-palm', x: 8.3, z: -4.8, height: 2.2, seed: 7 }, { prop: 'kona-palm', x: 31.6, z: -10.9, height: 2.9, seed: 11 }], { group, lite, obstacles, sway, basaltTex: ctx.basaltTex })) g.userData.prop = 'kona-palm';   // the factory adds to the group

  // ------------------------------------------------------------ the blue chairs of the Promenade, facing the sea (one InstancedMesh)
  const chairGeo = (() => { const p = [], RS = lite ? 5 : 8, TS = lite ? 10 : 22;
    const tube = pts => p.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), TS, .014, RS).toNonIndexed());
    for (const sx of [-.25, .25]) {                                   // side frames: front leg up into the armrest, back leg sweeping into the back post
      tube([[sx, 0, .24], [sx, .3, .23], [sx, .6, .2], [sx, .63, .05], [sx, .64, -.12]]);
      tube([[sx, 0, -.26], [sx, .32, -.2], [sx, .62, -.3], [sx, .95, -.42]]); }
    tube([[-.25, .34, .2], [0, .345, .2], [.25, .34, .2]]); tube([[-.25, .3, -.2], [0, .3, -.2], [.25, .3, -.2]]);
    const slat = (w, len, bend, segs) => { const g = new THREE.BoxGeometry(w, .016, len, 1, 1, segs), q = g.attributes.position; for (let k = 0; k < q.count; k++) { const z = q.getZ(k) / len * 2; q.setY(k, q.getY(k) - bend * (1 - z * z)); } g.computeVertexNormals(); return g.toNonIndexed(); };
    for (let i = 0; i < 6; i++) { const g = slat(.07, .46, .025, lite ? 3 : 6); g.translate(-.18 + i * .072, .37, 0); g.rotateX(-.06); p.push(g); }                    // a dished seat
    for (let i = 0; i < 6; i++) { const g = slat(.07, .5, .03, lite ? 3 : 6); g.rotateX(Math.PI / 2 - .4); g.translate(-.18 + i * .072, .72, -.33); p.push(g); }    // a reclined, curved back
    const g = mergeGeometries(p); g.rotateY(-Math.PI / 2); return g; })();      // faces +x: the sea
  const chairAt = []; for (let i = 0; i < 11; i++) chairAt.push([28.5 + (i % 2) * .5 + rand() * .3, R.z1 + 1.2 + i * (RD - 2.4) / 10, (rand() - .5) * .5]);
  const chairs = new THREE.InstancedMesh(chairGeo, chairMat, chairAt.length);
  chairAt.forEach(([x, z, yaw], k) => { M4.compose(V.set(x, 0, z), Q.setFromEuler(EU.set(0, yaw, 0)), S.set(1, 1, 1)); chairs.setMatrixAt(k, M4); }); chairs.castShadow = !lite; chairs.receiveShadow = true; group.add(chairs);
  const cs0 = ctx.contactShadow ? ctx.contactShadow(.8, .7) : null;        // one soft footprint per chair, one draw for all of them
  if (cs0) { const csI = new THREE.InstancedMesh(cs0.geometry, cs0.material, chairAt.length); csI.renderOrder = 1;
    chairAt.forEach(([x, z, yaw], k) => { M4.compose(V.set(x, .006, z), Q.setFromEuler(EU.set(-Math.PI / 2, 0, yaw)), S.set(1, 1, 1)); csI.setMatrixAt(k, M4); }); group.add(csI); }
  info(chairs, { model: act => chairsCard(act), eyebrow: 'LES CHAISES BLEUES', title: 'A seat facing the sea.', sub: 'The Promenade des Anglais' });

  // ------------------------------------------------------------ the Promenade's cast-iron lamps along the railing (instanced, emissive globes, no lights)
  const lampAt = [-5.3, -8.6, -13.1, -16.4], lampGeo = (() => { const p = [];
    p.push(new THREE.CylinderGeometry(.11, .15, .3, 12).translate(0, .15, 0), new THREE.CylinderGeometry(.04, .06, 2.6, 10).translate(0, 1.6, 0), new THREE.TorusGeometry(.09, .015, 6, 18).rotateX(Math.PI / 2).translate(0, 2.9, 0), new THREE.ConeGeometry(.16, .14, 12).translate(0, 3.32, 0));
    return mergeGeometries(p.map(g => g.toNonIndexed())); })();
  const castIron = E(new THREE.MeshStandardMaterial({ color: '#1f2a28', roughness: .45, metalness: .6 }));
  const lamps = new THREE.InstancedMesh(lampGeo, castIron, lampAt.length), globes = new THREE.InstancedMesh(new THREE.SphereGeometry(.13, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe3b0', toneMapped: false }), lampAt.length);
  lampAt.forEach((z, k) => { M4.makeTranslation(RAIL + .05, 0, z); lamps.setMatrixAt(k, M4); M4.makeTranslation(RAIL + .05, 3.1, z); globes.setMatrixAt(k, M4); });
  lamps.castShadow = !lite; group.add(lamps, globes);
  const haloT = tex(canvas(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,220,160,.9)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ map: haloT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), lampAt.length);
  lampAt.forEach((z, k) => { M4.compose(V.set(RAIL - .05, 3.1, z), Q.setFromEuler(EU.set(0, -Math.PI / 2, 0)), S.set(1, 1, 1)); halos.setMatrixAt(k, M4); }); group.add(halos);
  obstacles.push(...lampAt.map(z => ({ c: new THREE.Vector3(RAIL + .05, 0, z), r: .3 })));

  // ------------------------------------------------------------ voile at the bay's edges, breathing in the sea breeze (vertex shader, two planes)
  const sheerU = { t: { value: 0 } };
  const sheerMat = new THREE.MeshStandardMaterial({ color: '#fbf6ee', roughness: 1, transparent: true, opacity: lite ? .5 : .62, side: THREE.DoubleSide, depthWrite: false });
  sheerMat.onBeforeCompile = sh => { sh.uniforms.uT = sheerU.t; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat hang=clamp((2.6-position.y)/5.2,0.,1.);transformed.z+=(sin(position.x*5.+uT*1.3)*.07+sin(position.x*11.-uT*2.1)*.03)*hang*hang+hang*.05;'); };
  sheerMat.customProgramCacheKey = () => 'laidlow-sheer';
  for (const z of [R.z0 - .55, R.z1 + .55]) { const g = new THREE.PlaneGeometry(1.1, R.h - .9, lite ? 6 : 14, lite ? 8 : 20); const sh = new THREE.Mesh(g, sheerMat); sh.rotation.y = -Math.PI / 2; sh.position.set(GX - .35, (R.h - .9) / 2, z); sh.renderOrder = 2; group.add(sh); }

  // ------------------------------------------------------------ the blue enamel street sign of Nice, on the pilaster by the bay
  const plaqueMat = new THREE.MeshPhysicalMaterial({ map: tex(canvas(1024, 384, (g, w, h) => { g.fillStyle = '#1d4f9c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4f1e8'; g.lineWidth = 14; g.strokeRect(22, 22, w - 44, h - 44);
      g.fillStyle = '#f4f1e8'; g.textAlign = 'center'; g.font = `700 30px ${FONT}`; g.letterSpacing = '8px'; g.fillText('VILLE DE NICE', w / 2, 92);
      g.font = `800 76px ${FONT}`; g.letterSpacing = '2px'; fit(g, 'PROMENADE', w / 2, 196, w - 140); fit(g, 'DES ANGLAIS', w / 2, 286, w - 140); })), roughness: .18, clearcoat: 1, clearcoatRoughness: .05 });
  const streetSign = new THREE.Mesh(new THREE.BoxGeometry(1.15, .43, .02), plaqueMat); streetSign.position.set(29.9, 2.75, R.z0 - .1); streetSign.rotation.y = Math.PI; group.add(streetSign);

  // ------------------------------------------------------------ someone just went for a swim: a striped towel and Le Promeneur left on a chair
  { const [cx2, cz2, yaw2] = chairAt[4], o = new THREE.Object3D(); o.position.set(cx2, 0, cz2); o.rotation.y = yaw2; o.updateMatrix();
    const towelC = canvas(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f1e8' : '#2f74c0'; g.fillRect(i * w / 8, 0, w / 8, h); } });
    const towel = new THREE.Mesh(new THREE.BoxGeometry(.4, .05, .3), new THREE.MeshStandardMaterial({ map: tex(towelC), roughness: 1 })); towel.position.set(0, .42, .03); towel.rotation.y = .2;
    const paperM = new THREE.MeshStandardMaterial({ color: '#efe7d6', roughness: .9 }), folded = new THREE.Mesh(new THREE.BoxGeometry(.22, .012, .3), paperM); folded.position.set(.04, .455, -.02); folded.rotation.y = -.35;
    for (const m of [towel, folded]) { m.applyMatrix4(o.matrix); m.castShadow = !lite; group.add(m); } }

  // ------------------------------------------------------------ golden hour: the arches' light lying across the floor and up the walls
  const sunPatch = tex(canvas(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,200,140,.95)'); gr.addColorStop(1, 'rgba(255,180,120,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(14, h); g.lineTo(14, h * .32); g.ellipse(w / 2, h * .32, w / 2 - 14, h * .2, 0, Math.PI, 0); g.lineTo(w - 14, h); g.fill(); }));
  const patchMat = new THREE.MeshBasicMaterial({ map: sunPatch, transparent: true, opacity: lite ? .22 : .3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (let i = 0; i < 3; i++) { const z = (BAYS[i] + BAYS[i + 1]) / 2, pl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9.5), patchMat); pl.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 - .12); pl.position.set(GX - 5.2, .008, z + .5); pl.renderOrder = 1; group.add(pl); }
  for (const x of [14.0, 21.0, 28.0]) { const w = wallWash(3.6, 4.4, lite ? .28 : .38); w.position.set(x, 2.6, R.z1 + .03); group.add(w); }
  for (const x of [15.5, 26.5]) { const w = wallWash(3.6, 4.4, lite ? .2 : .3); w.position.set(x, 2.6, R.z0 - .03); w.rotation.y = Math.PI; group.add(w); }
  // a brass line set into the stone: from the door, past the drum, to the sea
  const brass = E(new THREE.MeshStandardMaterial({ color: '#c9a25a', roughness: .28, metalness: 1 }));
  box(brass, GX - 1 - R.x0, .012, .05, (R.x0 + GX - 1) / 2, .004, HZ + 2.4);
  const inlay = lettering(3.2, .3, g => { g.fillStyle = '#b48b45'; g.font = `600 .12px ${FONT}`; g.letterSpacing = '.04px'; g.fillText('NICE · 10.09.2023 · 8:06:22', .05, .2); }, 1024);
  inlay.rotation.set(-Math.PI / 2, 0, 0); inlay.position.set(12.2, .006, HZ + 2.62); group.add(inlay);

  // ------------------------------------------------------------ the header over the bay
  const header = lettering(5.4, .8, g => { g.textAlign = 'center'; g.fillStyle = '#1b2733'; g.font = `800 .34px ${FONT}`; g.letterSpacing = '.02px'; g.fillText('KONA.m', 2.7, .38);
    g.fillStyle = 'rgba(27,39,51,.82)'; g.font = `600 .16px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('LAIDLOW // NICE · BAIE DES ANGES', 2.7, .68); }, 1536);
  header.rotation.y = -Math.PI / 2; header.position.set(GX - .2, R.h - .42, CZ); group.add(header);

  // ------------------------------------------------------------ north wall: 8:06:22, cut like a monument (real-pixel canvas)
  const panel = (w, h, px, draw) => { const c = canvas(px, Math.round(px * h / w), draw), t = tex(c);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: .35, roughness: .75 }); };
  box(navyWall, 12.4, 4.6, .06, 21.0, 2.75, R.z0 - .07);
  const monMat = panel(12, 4.4, 2400, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#12355c'); gr.addColorStop(1, '#0b2440'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.fillStyle = 'rgba(245,243,238,.78)'; g.font = `700 36px ${FONT}`; g.letterSpacing = '12px'; g.fillText('IRONMAN WORLD CHAMPIONSHIP · NICE · 10 SEPTEMBER 2023', w / 2, 96);
    g.fillStyle = PAL.gold; g.font = `400 400px ${SERIF}`; g.letterSpacing = '-6px'; g.fillText(NICE.time, w / 2, 450);
    g.fillStyle = 'rgba(245,243,238,.9)'; g.font = `600 44px ${FONT}`; g.letterSpacing = '10px';
    const sp = [['SWIM', NICE.splits.swim], ['BIKE', NICE.splits.bike], ['RUN', NICE.splits.run]];
    sp.forEach(([k, v], i) => { const x = w * (.25 + i * .25); g.fillStyle = 'rgba(245,243,238,.55)'; g.font = `600 30px ${FONT}`; g.fillText(k, x, 530); g.fillStyle = '#f5f3ee'; g.font = `400 78px ${SERIF}`; g.letterSpacing = '0px'; g.fillText(v, x, 610); g.letterSpacing = '10px'; });
    g.fillStyle = 'rgba(245,243,238,.18)'; g.fillRect(w * .12, 650, w * .76, 2);
    for (let i = 0; i < 3; i++) { g.fillStyle = ['#2f5fae', '#f5f3ee', '#c8323f'][i]; g.fillRect(w / 2 - 90 + i * 60, 676, 60, 8); }
    g.fillStyle = 'rgba(245,243,238,.82)'; g.font = `italic 400 52px ${SERIF}`; g.letterSpacing = '0px'; fit(g, 'First from France. Youngest man ever. On home soil.', w / 2, 770, w * .8); });
  const mon = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.4), monMat); mon.rotation.y = Math.PI; mon.position.set(21.0, 2.75, R.z0 - .105); group.add(mon);
  info(mon, { model: act => niceCard(act), eyebrow: 'NICE · 2023', title: NICE.time, sub: 'IRONMAN World Champion' });
  for (const x of [15.5, 21, 26.5]) { const s = new THREE.SpotLight('#ffe6c4', lite ? 10 : 16, 7, .55, .6, 1.4); s.position.set(x, R.h - .2, R.z0 - 2.2); s.target.position.set(x, 2.6, R.z0 - .1); group.add(s, s.target); }

  // ------------------------------------------------------------ south wall: Kona 2022, the front page, Roth 2026
  const recordPanel = (x, w, h, top, big, bigCol, line1, line2, grad) => {
    const m = panel(w, h, 1400, (g, cw, ch) => { const gr = g.createLinearGradient(0, 0, cw, ch); gr.addColorStop(0, grad[0]); gr.addColorStop(1, grad[1]); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
      g.fillStyle = 'rgba(245,243,238,.7)'; g.font = `700 34px ${FONT}`; g.letterSpacing = '9px'; g.fillText(top, 80, 120);
      g.fillStyle = bigCol; g.font = `400 300px ${SERIF}`; g.letterSpacing = '-4px'; fit(g, big, 70, 440, cw - 140);
      g.fillStyle = '#f5f3ee'; g.font = `600 44px ${FONT}`; g.letterSpacing = '6px'; fit(g, line1, 80, 560, cw - 160);
      g.fillStyle = 'rgba(245,243,238,.7)'; g.font = `500 34px ${FONT}`; g.letterSpacing = '3px'; fit(g, line2, 80, 630, cw - 160); });
    box(darkSteel, w + .14, h + .14, .04, x, 2.35, R.z1 + .02);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, 2.35, R.z1 + .045); group.add(p); return p; };
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
  box(gilt, 2.3, 3.0, .07, 21.0, 2.35, R.z1 + .035);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.7), paperMat); paper.position.set(21.0, 2.35, R.z1 + .075); group.add(paper);
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
  plaque.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); plaque.position.set(HX - 1.45, .346, HZ - 1.1);   // on the drum's top, reading from the door group.add(plaque);

  // ------------------------------------------------------------ museum art from the catalogue (museum/art), hung the way the wings hang it
  const P = id => PAINTINGS.paintings.find(p => p.id === id), SC = id => SCULPTURES.sculptures.find(x => x.id === id);
  const texLoader = new THREE.TextureLoader(), frameMat = new THREE.MeshStandardMaterial({ color: '#1c1916', roughness: .5 });
  const ROOM = 'LAIDLOW // NICE';
  for (const [id, x, y, z, ry] of [['queen-k-first-light', 9.55, 2.35, R.z1 + .04, 0], ['midnight-seawall', 18.1, 2.4, R.z1 + .04, 0], ['race-morning-bay', 10.9, 2.35, R.z0 - .04, Math.PI]]) {
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
  const cx = 9.6, cz = -13.4;
  for (const [dx, dz] of [[-.25, -.2], [.25, -.2], [-.25, .2], [.25, .2]]) box(wood, .035, .45, .035, cx + dx, .225, cz + dz);
  box(canvasBlue, .52, .03, .44, cx, .46, cz); box(canvasBlue, .52, .32, .02, cx, .78, cz - .22); for (const dx of [-.27, .27]) box(wood, .035, .5, .035, cx + dx, .7, cz - .22);
  const boardMat = panel(1.4, 1.0, 900, (g, w, h) => { g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1f5fa0'; g.lineWidth = 6; g.lineCap = 'round';
    g.font = `700 54px ${FONT}`; g.fillStyle = '#1f5fa0'; g.fillText('RACE WEEK · NICE', 50, 90);
    const arrow = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 26 * Math.cos(a - .5), y1 - 26 * Math.sin(a - .5)); g.moveTo(x1, y1); g.lineTo(x1 - 26 * Math.cos(a + .5), y1 - 26 * Math.sin(a + .5)); g.stroke(); };
    g.font = `600 46px ${FONT}`; g.fillStyle = '#20262c'; [['SWIM', 120], ['BIKE', 400], ['RUN', 660]].forEach(([t, x], i) => { g.fillText(t, x - 50, 260); if (i < 2) arrow(x + 80, 245, x + 190, 245); });
    g.strokeStyle = '#c8323f'; g.beginPath(); g.ellipse(430, 245, 140, 60, 0, 0, 6.3); g.stroke();
    g.fillStyle = '#c8323f'; g.font = `italic 600 44px ${SERIF}`; g.fillText('go at 40 km', 330, 360);
    g.fillStyle = '#20262c'; g.font = `500 36px ${FONT}`; g.fillText('— Dad', 640, 520); });
  box(wood, .04, 1.5, .04, cx - .55, .75, cz + 1.0); box(wood, .04, 1.5, .04, cx - .55, .75, cz + 2.4);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), boardMat); board.position.set(cx - .52, 1.15, cz + 1.7); board.rotation.y = Math.PI / 2; group.add(board);
  info([board], { model: act => coachCard(act), eyebrow: 'THE COACH', title: 'Coached by his father.', sub: 'Richard Laidlow' });
  obstacles.push({ c: new THREE.Vector3(cx, 0, cz + .9), r: 1.1 });

  // ------------------------------------------------------------ hall-side sign over the door
  const sign = lettering(4.6, .9, g => { g.fillStyle = '#12181d'; g.font = `700 .14px ${FONT}`; g.letterSpacing = '.06px'; g.fillText('LAIDLOW // NICE · BAIE DES ANGES', 0, .28);
    g.fillStyle = PAL.bleu; g.font = `italic 400 .25px ${SERIF}`; g.letterSpacing = '0px'; g.fillText('8:06:22. Nice, very nice.', 0, .69); }, 1024);
  sign.position.set(hallWallX + .02, BDOOR.h + .75, (BDOOR.z0 + BDOOR.z1) / 2 + .2); sign.rotation.y = -Math.PI / 2;

  // ------------------------------------------------------------ light: the bay does most of the work
  if (!rectLib) { RectAreaLightUniformsLib.init(); rectLib = true; }
  const sunIn = new THREE.RectAreaLight('#ffbb7a', lite ? 5.5 : 7.5, RD - 1, 3.6); sunIn.position.set(GX - .1, 2.2, CZ); sunIn.lookAt(GX - 6, 1.0, CZ); group.add(sunIn);
  const skyFill = new THREE.HemisphereLight('#cfe3ff', '#d8c2a2', lite ? .7 : .42); group.add(skyFill);
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
  const keepers = new Set([floor, sign, drum, ring, mon, kona, roth, paper, board, bay, glass, chairs, peb, posts, lamps, globes, halos, streetSign, ...sculptHolders.map(s => s.h), ...sway.map(w => w.o)]);
  group.userData.merged = mergeStatic(group, { keep: o => keepers.has(o) || !!o.userData?.info || o.isLight || o.isPoints || o.isInstancedMesh || o.material?.transparent });
  let envDirty = 2;
  const dust = lite ? null : motes({ n: 160, box: [GX - 7, GX - .4, .3, R.h - .6, CZ - 3, CZ + 3], color: '#ffe2b0', size: .03, rise: .05, sway: .18, opacity: .6 });   // the sunbeam's dust (roomkit)
  if (dust) group.add(dust.points);
  const env = localEnvCapture({ renderer, scene, group, at: new THREE.Vector3(HX - 3, 1.6, HZ), lite, mats: envMats });

  // ------------------------------------------------------------ host interface (same shape as the Beast Cave)
  return {
    group, floor, sign, bikeSpot, infos, mood: LAIDLOW_MOOD, introCard,
    async useAssets(loader) {                                           // the museum's sculptures (museum/art/sculptures.json), scaled as catalogued
      if (this._assets) return; this._assets = true; this._loader = loader; this._lod?.();
      for (const { h, sc } of sculptHolders) loader.loadAsync(`assets/art/sculptures/${sc.file}`).then(g => {
        const m = g.scene, b = new THREE.Box3().setFromObject(m), size = b.getSize(new THREE.Vector3()); m.scale.setScalar(sc.height / Math.max(.001, size.y));
        const b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3()); m.position.set(-c.x, -b2.min.y, -c.z);
        m.traverse(o => { if (o.isMesh) { o.castShadow = !lite; envMats.push(o.material); } }); h.add(m);
        const parts = []; m.traverse(o => { if (o.isMesh) parts.push(o); });
        info(parts, { model: () => sculptureCard(sc, { room: ROOM }), eyebrow: 'FROM THE MUSEUM', title: sc.title, sub: sc.material });
        envDirty = 2; }).catch(e => console.warn('sculpture', sc.id, e?.message || e));
    },
    setBike(bike, dress) {                                             // the canonical Speedmax CFR, side-on to the door, front wheel to the 8:06:22 wall
      const prep = b => { const once = new Map(), cl = m => { const k = m.name || m.uuid; if (!once.has(k)) once.set(k, m.clone()); return once.get(k); };   // one material per name (the shared loader hands out per-mesh copies), so they merge
        b.traverse(o => { if (!o.isMesh) return; o.material = Array.isArray(o.material) ? o.material.map(cl) : cl(o.material); o.castShadow = !lite; delete o.userData.piece; });
        dress?.(b); };
      const merge = b => { mergeStatic(b); b.traverse(o => { if (o.isMesh) { o.userData.info = bikeSpot.info; pickables.push(o); } }); };   // after orienting: the merge removes the wheel nodes
      prep(bike);
      const holder = new THREE.Group(); holder.add(bike); group.add(holder);
      const node = n => bike.getObjectByName(n) || [...bike.children].find(ch => ch.userData?.part === n), centre = o => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      const box0 = new THREE.Box3().setFromObject(bike), c0 = box0.getCenter(new THREE.Vector3()); bike.position.set(-c0.x, -box0.min.y, -c0.z);
      holder.position.set(HX, .34, HZ); holder.updateMatrixWorld(true);
      const front = node('wheel_front'), rear = node('wheel_rear');
      if (front && rear) { const f = centre(front), r = centre(rear); holder.rotation.y = Math.atan2(-(f.x - r.x), f.z - r.z); /* wheelbase onto +z */ holder.updateMatrixWorld(true);
        if (centre(front).z < centre(rear).z) { holder.rotation.y += Math.PI; holder.updateMatrixWorld(true); }
        const m = centre(front).add(centre(rear)).multiplyScalar(.5); holder.position.x += HX - m.x; holder.position.z += HZ - m.z; }
      merge(bike);                                                    // this room never explodes the bike: ~70 parts → one draw per material
      bikeSpot.bike = holder; envDirty = 2;
      this._lod = () => {                                              // desktop: the derived 77k hero beyond 5 m (room budget); runs once both bike and loader exist
        if (lite || !this._loader || this._lodDone) return; this._lodDone = true;
        const load = u => this._loader.loadAsync(u).then(g => { const m = g.scene; prep(m); merge(m); const lb = new THREE.Box3().setFromObject(m), lc = lb.getCenter(new THREE.Vector3()); m.position.set(-lc.x, -lb.min.y, -lc.z); return m; });
        Promise.all([load('assets/museum/speedmax_web-hero.glb'), load('assets/museum/speedmax_web-lite.glb')]).then(([near, far]) => {   // 134k within 5 m, 77k beyond
          near.position.copy(bike.position); far.position.copy(bike.position);
          const lod = new THREE.LOD(); lod.addLevel(near, 0); lod.addLevel(far, 5); far.visible = false; holder.remove(bike); holder.add(lod);
          bike.traverse(o => { if (o.isMesh) { const i = pickables.indexOf(o); if (i >= 0) pickables.splice(i, 1); } }); envDirty = 2; }).catch(() => {}); };
      this._lod();
    },
    update(t, reduce, dt = 1 / 60) {
      if (envDirty) { envDirty--; if (!envDirty) env.capture(); }
      bayMat.uniforms.t.value = reduce ? 0 : t; sheerU.t.value = reduce ? 0 : t;
      if (dust && !reduce) dust.step(t);
      if (!reduce) for (const w of sway) { const a = Math.sin(t * .9 + w.phase) * w.amp; w.o.rotation.z = a; w.o.rotation.x = a * .5; }
      return { power: 0, heat: 0, riding: false };
    },
  };
}
