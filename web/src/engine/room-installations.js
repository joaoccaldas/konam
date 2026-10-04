// Indexed room installations. Architecture, navigation and exhibit placement belong to
// the host; each decorator owns only its geometry, effects and animation state.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {rng,rootTex,crackTex,plasterTex,scrawlTex,glyphTex,fenceTex,mistTex,motes} from '../roomkit.js';

function bio(ctx) {
  const {r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds}=ctx;

      // vines climb the east wall and run out along the ceiling; leaves are one instanced draw
      const vineMat = new THREE.MeshStandardMaterial({ color: '#1d4a2a', emissive: '#2c8a44', emissiveIntensity: .16, roughness: .7 });
      const vines = new THREE.Group(); vines.position.set(cx, Y, cz); rg.add(vines);
      const nV = lite ? 8 : 14, curves = [], rand = rng(seed + 5);
      for (let k = 0; k < nV; k++) {
        const z = (-.5 + k / (nV - 1)) * (rd - .7), wob = () => (rand() - .5) * .5;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(4.18, 0, z), new THREE.Vector3(4.12, 1.2, z + wob()), new THREE.Vector3(4.1, 2.5, z + wob()),
          new THREE.Vector3(3.9, 3.88, z + wob()), new THREE.Vector3(2.6, 3.95, z * .9 + wob()), new THREE.Vector3(1.1 - rand() * 1.4, 3.9, z * .8 + wob()),
        ]);
        curves.push(curve);
        vines.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 44, .026 + (k % 3) * .012, 5, false), vineMat));
      }
      const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.09, .1, 0, .26); leafShape.quadraticCurveTo(-.09, .1, 0, 0);
      const leafMat = new THREE.MeshStandardMaterial({ color: '#2f7a3a', emissive: '#3dba55', emissiveIntensity: .12, side: THREE.DoubleSide, roughness: .6 });
      const perVine = lite ? 10 : 22, leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(leafShape, 3), leafMat, nV * perVine);
      const d = new THREE.Object3D(); let n = 0;
      for (const c of curves) for (let j = 0; j < perVine; j++) {
        const u = .04 + (j / perVine) * .94, p = c.getPointAt(u);
        d.position.copy(p).add(vines.position);
        d.rotation.set(rand() * 6.28, rand() * 6.28, rand() * 6.28); d.scale.setScalar(.7 + rand() * .9);
        d.updateMatrix(); leaves.setMatrixAt(n++, d.matrix);
      }
      rg.add(leaves);
      // strands hang from the vines behind the bike, each with a lit tip
      const nS = lite ? 12 : 26, strand = new THREE.InstancedMesh(new THREE.CylinderGeometry(.008, .012, 1, 4).translate(0, -.5, 0), vineMat, nS);
      const tipMat = new THREE.MeshBasicMaterial({ color: '#c8ff7a' });
      const tips = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 6), tipMat, nS);
      const hang = [];
      for (let k = 0; k < nS; k++) {
        const x = cx + 1.4 + rand() * 2.6, z = cz + (rand() - .5) * (rd - .8), len = .5 + rand() * 1.7;
        hang.push({ x, z, len, ph: rand() * 6.28 });
      }
      const pose = t => {
        hang.forEach((h, k) => {
          const a = Math.sin(t * .6 + h.ph) * .05;
          d.position.set(h.x, Y + 3.92, h.z); d.rotation.set(a, 0, a * .6); d.scale.set(1, h.len, 1); d.updateMatrix(); strand.setMatrixAt(k, d.matrix);
          d.position.set(h.x + Math.sin(a * .6) * h.len, Y + 3.92 - h.len * Math.cos(a), h.z + Math.sin(a) * h.len); d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix(); tips.setMatrixAt(k, d.matrix);
        });
        strand.instanceMatrix.needsUpdate = tips.instanceMatrix.needsUpdate = true;
      };
      pose(0); rg.add(strand, tips);
      // pods keep to the walls, out of the sight line: a clouded shell and a lit core
      const podMat = new THREE.MeshStandardMaterial({ color: '#2f8a45', emissive: '#7dff6b', emissiveIntensity: .25, roughness: .2, transparent: true, opacity: .62 });
      const coreMat = new THREE.MeshBasicMaterial({ color: '#d4ff9a' });
      const nP = lite ? 8 : 14, pods = new THREE.InstancedMesh(new THREE.SphereGeometry(.26, 16, 12), podMat, nP), cores = new THREE.InstancedMesh(new THREE.SphereGeometry(.08, 8, 6), coreMat, nP);
      for (let k = 0; k < nP; k++) {
        const side = k % 2 ? 1 : -1, s = .6 + rand() * .8;
        const x = cx - .6 + (k / nP) * 4.6 + rand() * .3, z = cz + side * (rd / 2 - .38 - rand() * .25);
        d.position.set(x, Y + .26 * s * 1.2, z); d.rotation.set(0, rand() * 6, 0); d.scale.set(s, s * 1.25, s); d.updateMatrix(); pods.setMatrixAt(k, d.matrix);
        d.scale.setScalar(s); d.updateMatrix(); cores.setMatrixAt(k, d.matrix);
      }
      rg.add(pods, cores);
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, 6.29, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: rootTex('#0c2414', '#39ff64', seed + 9, [2, 1]), roughness: .7, emissive: '#39ff64', emissiveIntensity: .08 }));
      mound.scale.set(1.05, .2, .5); put(mound, specimen.x, Y, specimen.z);
      obstacles.push({ box: [specimen.x - .95, specimen.x + .95, specimen.z - .5, specimen.z + .5] });
      const glow = new THREE.PointLight('#5dff7a', lite ? 2 : 4, 7, 2); glow.position.set(cx + 3.4, Y + .6, cz); rg.add(glow);
      const spores = motes({ n: lite ? 60 : 150, box: [cx - 3.6, cx + 4, Y + .1, Y + 3.8, r.z1 + .3, r.z0 - .3], color: '#c8ff7a', size: .045, rise: .07, sway: .18, seed: seed + 3 });
      rg.add(spores.points); L.motes.push(spores);
      Object.assign(L, { vines, podMat, tipMat, glow, pose });
    }

function horror(ctx) {
  const {r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds}=ctx;

      obstacles.push({ box: [cx - 3.45, cx - 1.15, cz - 1.2, cz + 1.2] });
      obstacles.push({ box: [cx + 1.15, cx + 3.45, cz - 1.2, cz + 1.2] });
      obstacles.push({ box: [cx - .7, cx + .7, cz - 1.6, cz - .55] });
      const dark = new THREE.MeshStandardMaterial({ map: plasterTex('#241417', '#050102', seed + 4, [1, 1.5]), roughness: .95, emissive: '#3a1018', emissiveIntensity: .12 });
      box(2.3, 3.6, .18, cx - 2.3, Y + 1.8, cz, dark);
      box(2.3, 3.6, .18, cx + 2.3, Y + 1.8, cz, dark);
      // the bulb swings, and its light swings with it
      const pivot = new THREE.Group(); pivot.position.set(cx, Y + 3.95, cz - .45); rg.add(pivot);
      const bulbMat = new THREE.MeshBasicMaterial({ color: '#fff4e0' });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), bulbMat); bulb.position.y = -1.55; pivot.add(bulb);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(.2, .16, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#1a1414', roughness: .6, metalness: .6, side: THREE.DoubleSide }));
      shade.position.y = -1.44; pivot.add(shade);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1.4, 5), new THREE.MeshStandardMaterial({ color: '#111' })); cord.position.y = -.7; pivot.add(cord);
      const bulbLight = new THREE.PointLight('#ffc68a', lite ? 5 : 9, 6.5, 1.8); bulbLight.position.y = -1.62; pivot.add(bulbLight);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 28), new THREE.MeshBasicMaterial({ color: '#ffcf9a', transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.rotation.x = -Math.PI / 2; put(pool, cx, Y + .015, cz - .45);
      // eyes, in pairs, in the dark either side of the passage; each pair blinks on its own
      const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff1a2a' }), eyeGeo = new THREE.SphereGeometry(.028, 8, 6);
      const pairs = [], rand = rng(seed + 7);
      const spotsE = [[-1.22, 1.55, .18], [1.22, 1.35, .22], [-3.1, 1.7, -1.7], [3.05, 1.2, -1.85], [-2.4, .55, 1.9], [2.6, 2.2, 1.7], [-1.25, 2.6, -.2], [1.3, .9, -.3]].slice(0, lite ? 4 : 8);
      for (const [dx, y, dz] of spotsE) {
        const pr = new THREE.Group(); pr.position.set(cx + dx, Y + y, cz + dz); pr.lookAt(cx, Y + 1.6, cz + 1.7);
        for (const s of [-1, 1]) { const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.x = s * .06; e.scale.set(1.3, 1, .6); pr.add(e); }
        rg.add(pr); pairs.push({ g: pr, ph: rand() * 20, rate: .6 + rand() * .9, home: pr.position.clone() });
      }
      // chains from the ceiling, either side of the bulb
      const linkGeo = new THREE.TorusGeometry(.045, .012, 5, 10), chainMat = new THREE.MeshStandardMaterial({ color: '#3a3232', metalness: .8, roughness: .45 });
      const chains = [];
      for (const [dx, dz, len] of [[-.75, -1.6, 16], [.8, -1.75, 22], [-.6, .5, 12]]) {
        const cg = new THREE.Group(); cg.position.set(cx + dx, Y + 4.0, cz + dz);
        const links = new THREE.InstancedMesh(linkGeo, chainMat, len), m = new THREE.Object3D();
        for (let k = 0; k < len; k++) { m.position.set(0, -.07 - k * .075, 0); m.rotation.set(0, k % 2 ? Math.PI / 2 : 0, Math.PI / 2); m.updateMatrix(); links.setMatrixAt(k, m.matrix); }
        cg.add(links); rg.add(cg); chains.push({ g: cg, ph: rand() * 6 });
      }
      // the far wall has been written on
      const scrawl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshStandardMaterial({ map: scrawlTex('#6a0c14', seed), transparent: true, roughness: .9, depthWrite: false }));
      put(scrawl, cx, Y + 1.7, r.z1 + .1);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, .16, .7), new THREE.MeshStandardMaterial({ color: '#14080c', roughness: .3, metalness: .4 }));
      put(plinth, specimen.x, Y + .06, specimen.z);
      const dust = motes({ n: lite ? 40 : 90, box: [cx - 1.1, cx + 1.1, Y + .2, Y + 2.6, cz - 1.5, cz + .6], color: '#ffd9a8', size: .022, rise: .025, sway: .2, opacity: .7, seed: seed + 2 });
      rg.add(dust.points); L.motes.push(dust);
      Object.assign(L, { pivot, bulbMat, bulbLight, pool, pairs, chains });
    }

function alien(ctx) {
  const {r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds}=ctx;

      // the rings hang above the bike and turn like a gyroscope; nothing crosses the frame at eye height
      const ringMat = new THREE.MeshStandardMaterial({ color: '#0e3a36', emissive: '#3dffe0', emissiveIntensity: .55, roughness: .25, metalness: .6 });
      const rings = [];
      for (let k = 0; k < 3; k++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25 + k * .32, .035 + k * .01, 10, 64), ringMat);
        ring.position.set(specimen.x, Y + 2.55 + k * .42, specimen.z); ring.rotation.x = Math.PI / 2;
        rg.add(ring); rings.push(ring);
      }
      // ribs arch across the room from wall to wall, like the inside of a hull
      const ribMat = new THREE.MeshStandardMaterial({ color: '#102028', emissive: '#3dffe0', emissiveIntensity: .35, roughness: .4, metalness: .5 });
      const ribR = rd / 2 - .14;
      for (let k = 0; k < (lite ? 4 : 7); k++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(ribR, .055, 8, 40, Math.PI), ribMat);
        rib.position.set(cx - 3.3 + k * 1.15, Y, cz); rib.rotation.y = Math.PI / 2; rib.scale.set(1, 3.8 / ribR, 1);
        rg.add(rib);
      }
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.25, .95, 3.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#3dffe0', transparent: true, opacity: .09, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      put(beam, specimen.x, Y + 1.9, specimen.z);
      // the scan: a disc of light that passes through the frame, top to bottom and back
      const scan = new THREE.Group(); scan.position.set(specimen.x, Y + 1, specimen.z); rg.add(scan);
      const scanMat = new THREE.MeshBasicMaterial({ color: '#7dfff0', transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), scanMat); disc.rotation.x = -Math.PI / 2; scan.add(disc);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(1.25, .012, 6, 64), new THREE.MeshBasicMaterial({ color: '#b8fff6' })); edge.rotation.x = Math.PI / 2; scan.add(edge);
      const glyphs = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: glyphTex('#7dfff0', seed), transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
      glyphs.rotation.y = -Math.PI / 2; put(glyphs, bounds.x0 + rw - .12, Y + 2.1, cz);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(.85, .95, .18, 32), new THREE.MeshStandardMaterial({ color: '#07141c', emissive: '#3dffe0', emissiveIntensity: .35, metalness: .6, roughness: .25 }));
      put(plinth, specimen.x, Y + .08, specimen.z);
      const halo = new THREE.Mesh(new THREE.RingGeometry(.96, 1.08, 48), new THREE.MeshBasicMaterial({ color: '#3dffe0', transparent: true, opacity: .8 }));
      halo.rotation.x = -Math.PI / 2; put(halo, specimen.x, Y + .02, specimen.z);
      obstacles.push({ box: [specimen.x - .85, specimen.x + .85, specimen.z - .85, specimen.z + .85] });
      const stars = motes({ n: lite ? 50 : 120, box: [cx - 3.8, cx + 4, Y + .3, Y + 3.9, r.z1 + .3, r.z0 - .3], color: '#9ffff4', size: .03, rise: .02, sway: .3, opacity: .75, seed: seed + 4 });
      rg.add(stars.points); L.motes.push(stars);
      Object.assign(L, { rings, beam, scan, scanMat, glyphs });
    }

function zombie(ctx) {
  const {r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds}=ctx;

      // chain-link along both long walls; the figures are behind it, pressing in
      const fenceMap = fenceTex([rw * 3.2, 2.6 * 3.2]);
      const fenceMat = new THREE.MeshStandardMaterial({ map: fenceMap, alphaTest: .5, side: THREE.DoubleSide, roughness: .5, metalness: .7, color: '#9a977e' });
      const fx0 = cx - 3.2, fx1 = bounds.x0 + rw - .1, fw = fx1 - fx0, inset = 1.05;
      for (const side of [-1, 1]) {
        const fz = cz + side * (rd / 2 - inset);
        put(new THREE.Mesh(new THREE.PlaneGeometry(fw, 2.6), fenceMat), (fx0 + fx1) / 2, Y + 1.3, fz);
        const postGeo = new THREE.CylinderGeometry(.03, .03, 2.7, 6), postMat = new THREE.MeshStandardMaterial({ color: '#55533f', metalness: .7, roughness: .5 });
        for (let k = 0; k <= 4; k++) put(new THREE.Mesh(postGeo, postMat), fx0 + k * fw / 4, Y + 1.35, fz);
        obstacles.push({ box: [fx0 - .1, fx1, side < 0 ? r.z1 : fz - .08, side < 0 ? fz + .08 : r.z0] });
      }
      // figures: two instanced draws (cloth, skin), posed every frame from a few numbers
      const cloth = new THREE.MeshStandardMaterial({ color: '#3a3a28', roughness: .95, emissive: '#6a6840', emissiveIntensity: .08 });
      const skin = new THREE.MeshStandardMaterial({ color: '#8a8a55', roughness: .75, emissive: '#c6c07a', emissiveIntensity: .12 });
      const part = (geo, x, y, z, rx = 0, rz = 0) => geo.rotateX(rx).rotateZ(rz).translate(x, y, z);
      const clothGeo = mergeGeometries([
        part(new THREE.CapsuleGeometry(.19, .5, 4, 8), 0, 1.12, .06, .38),                       // torso, hunched
        part(new THREE.CapsuleGeometry(.08, .62, 3, 6), -.11, .42, 0, 0, .05),                    // legs
        part(new THREE.CapsuleGeometry(.08, .62, 3, 6), .11, .42, .04, -.12, -.04),
        part(new THREE.CapsuleGeometry(.055, .5, 3, 6), -.24, 1.3, .36, Math.PI / 2 - .25),       // arms, reaching
        part(new THREE.CapsuleGeometry(.055, .5, 3, 6), .24, 1.24, .34, Math.PI / 2 - .05),
      ]);
      const skinGeo = mergeGeometries([
        part(new THREE.SphereGeometry(.15, 10, 8).scale(1, 1.12, 1), .03, 1.55, .26, 0, .35),     // head, lolling
        part(new THREE.SphereGeometry(.055, 6, 5), -.24, 1.24, .7), part(new THREE.SphereGeometry(.055, 6, 5), .24, 1.2, .68),
      ]);
      const nF = lite ? 6 : 10, figC = new THREE.InstancedMesh(clothGeo, cloth, nF), figS = new THREE.InstancedMesh(skinGeo, skin, nF);
      figC.frustumCulled = figS.frustumCulled = false;
      const rand = rng(seed + 11), figs = [];
      for (let k = 0; k < nF; k++) {
        const side = k % 2 ? 1 : -1, fz = cz + side * (rd / 2 - inset);
        figs.push({ x: fx0 + .4 + ((k >> 1) + rand() * .5) * (fw - .8) / Math.ceil(nF / 2), z: fz + side * .32, fz, side, ph: rand() * 6.28, s: 1.02 + rand() * .16, lean: (rand() - .5) * .2 });
      }
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
      const pose = t => {
        figs.forEach((f, k) => {
          const press = Math.max(0, Math.sin(t * .5 + f.ph)) * .12;           // lean into the wire, fall back
          const x = f.x + Math.sin(t * .23 + f.ph) * .35, z = f.z + f.side * -press;
          e3.set(f.side * -(.08 + press * .6), (f.side < 0 ? 0 : Math.PI) + Math.sin(t * .4 + f.ph) * .25, f.lean + Math.sin(t * 1.3 + f.ph) * .06);
          m4.compose(v3.set(x, Y, z), q.setFromEuler(e3), s3.setScalar(f.s));
          figC.setMatrixAt(k, m4); figS.setMatrixAt(k, m4);
        });
        figC.instanceMatrix.needsUpdate = figS.instanceMatrix.needsUpdate = true;
      };
      pose(0); rg.add(figC, figS);
      const crateMat = new THREE.MeshStandardMaterial({ map: crackTex('#4a4630', '#2a2818', seed + 3, [1, 1], 1), roughness: .92 });
      for (const [dx, dz, s, ry] of [[3.6, -.9, .62, .2], [3.55, -.2, .48, .9], [3.7, .7, .55, .4], [3.1, .95, .4, 1.3]].slice(0, lite ? 2 : 4)) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s * .8, s), crateMat); crate.rotation.y = ry; put(crate, cx + dx, Y + s * .4, cz + dz);
      }
      // mist lies in layers and drifts; a sodium lamp on a pole buzzes over the block
      const mist = [];
      for (let k = 0; k < 3; k++) {
        const map = mistTex(seed + k); map.repeat.set(2, 1.4);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(rw - .3, rd - .3), new THREE.MeshBasicMaterial({ map, color: '#d8d49a', transparent: true, opacity: .55 - k * .14, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; put(m, cx, Y + .12 + k * .28, cz); mist.push(m);
      }
      const pole = box(.07, 3.6, .07, cx + 3.9, Y + 1.8, cz - rd / 2 + .45, new THREE.MeshStandardMaterial({ color: '#2a2a22', metalness: .6, roughness: .6 }));
      box(.9, .05, .05, cx + 3.5, Y + 3.58, cz - rd / 2 + .45, pole.material);
      const sodiumMat = new THREE.MeshBasicMaterial({ color: '#ffb35a' });
      box(.3, .08, .16, cx + 3.1, Y + 3.52, cz - rd / 2 + .45, sodiumMat);
      const sodium = new THREE.PointLight('#ff9d3c', lite ? 4 : 8, 9, 1.6); sodium.position.set(cx + 3.1, Y + 3.3, cz - rd / 2 + .6); rg.add(sodium);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, .2, .75), new THREE.MeshStandardMaterial({ map: crackTex('#3a3a2a', '#1c1c12', seed + 5, [2, 1], 2), roughness: .85 }));
      put(plinth, specimen.x, Y + .08, specimen.z);
      obstacles.push({ box: [specimen.x - .8, specimen.x + .8, specimen.z - .5, specimen.z + .5] });
      const ash = motes({ n: lite ? 50 : 120, box: [cx - 3.8, cx + 4, Y + .1, Y + 3.9, r.z1 + .3, r.z0 - .3], color: '#e8e2b0', size: .03, rise: -.12, sway: .25, opacity: .55, seed: seed + 6 });
      rg.add(ash.points); L.motes.push(ash);
      Object.assign(L, { pose, mist, sodium, sodiumMat });
    }


function norwegian(ctx) {
  const {r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds}=ctx;
  const rand=rng(seed+41);
  const reviewPickables=[];

  const surfaceTexture=(kind,repeat=[2,2])=>{
    const c=document.createElement('canvas');c.width=c.height=512;
    const g=c.getContext('2d'),rr=rng(seed+(kind==='wood'?73:kind==='stone'?89:101));
    if(kind==='wood'){
      g.fillStyle='#2e1e14';g.fillRect(0,0,512,512);
      for(let y=0;y<512;y+=5+Math.floor(rr()*9)){
        g.strokeStyle='rgba(190,118,67,'+(.025+rr()*.055)+')';g.lineWidth=.8+rr()*1.4;
        g.beginPath();g.moveTo(0,y+rr()*8);
        for(let x=0;x<=512;x+=32)g.lineTo(x,y+Math.sin(x*.025+rr()*3)*5+rr()*5);
        g.stroke();
      }
    }else{
      g.fillStyle=kind==='stone'?'#171d20':'#0d1519';g.fillRect(0,0,512,512);
      for(let i=0;i<4200;i++){
        const v=kind==='stone'?50+rr()*55:25+rr()*55;
        g.fillStyle='rgba('+v+','+(v+3)+','+(v+5)+','+(.025+rr()*.07)+')';
        const z=.5+rr()*2.2;g.fillRect(rr()*512,rr()*512,z,z);
      }
      for(let i=0;i<32;i++){
        g.strokeStyle='rgba(126,158,168,'+(.015+rr()*.025)+')';g.lineWidth=.5+rr()*1.2;
        const y=rr()*512;g.beginPath();g.moveTo(0,y);g.lineTo(512,y+(rr()-.5)*20);g.stroke();
      }
    }
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=lite?2:6;return t;
  };
  const textPanel=(text,w=.72,h=.18,fg='#dbe9ed',bg='rgba(8,13,16,.72)')=>{
    const c=document.createElement('canvas');c.width=768;c.height=192;const g=c.getContext('2d');
    g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);
    g.fillStyle=fg;g.font='700 58px Manrope, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,c.height/2);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}));
  };
  const contactShadowTex=(()=>{
    const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');
    const grd=g.createRadialGradient(128,64,8,128,64,122);grd.addColorStop(0,'rgba(0,0,0,.52)');grd.addColorStop(.55,'rgba(0,0,0,.20)');grd.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=grd;g.fillRect(0,0,256,128);return new THREE.CanvasTexture(c);
  })();
  const contactShadow=(x,z,w,d,opacity=.55)=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:contactShadowTex,transparent:true,opacity,depthWrite:false,fog:false}));
    m.rotation.x=-Math.PI/2;m.position.set(x,Y+.022,z);rg.add(m);return m;
  };

  const rubber=new THREE.MeshStandardMaterial({color:'#0b0f11',roughness:.94});
  const steel=new THREE.MeshStandardMaterial({color:'#252d31',roughness:.44,metalness:.72});
  const blackSteel=new THREE.MeshStandardMaterial({color:'#0d1214',roughness:.58,metalness:.58});
  const basalt=new THREE.MeshStandardMaterial({color:'#101619',roughness:.97,metalness:.02});
  const wet=new THREE.MeshPhysicalMaterial({color:'#0e1518',roughness:.52,metalness:.08,clearcoat:.24,clearcoatRoughness:.68,envMapIntensity:.72});
  const oak=new THREE.MeshStandardMaterial({color:'#2b190f',roughness:.84});
  const paper=new THREE.MeshStandardMaterial({color:'#d8d0c3',roughness:.92});
  const linen=new THREE.MeshStandardMaterial({color:'#a8a29a',roughness:.98});
  // Alpha, roughness and PMREM carry the chamber glass. Transmission is intentionally
  // disabled on every tier because Three.js' transmissive pre-pass almost doubles room calls.
  const glass=new THREE.MeshPhysicalMaterial({color:'#8fb2bb',roughness:.22,transmission:0,transparent:true,opacity:lite?.24:.42,depthWrite:false,envMapIntensity:.72});
  const frost=new THREE.MeshPhysicalMaterial({color:'#749ca7',roughness:.48,transmission:0,transparent:true,opacity:lite?.18:.30,depthWrite:false});
  const warm=new THREE.MeshStandardMaterial({color:'#3b1605',roughness:.38,emissive:'#ff6a00',emissiveIntensity:lite?.48:1.05});
  const warmDim=new THREE.MeshStandardMaterial({color:'#2b160d',roughness:.48,emissive:'#d74c14',emissiveIntensity:lite?.18:.42});
  const cold=new THREE.MeshStandardMaterial({color:'#10323d',roughness:.46,emissive:'#5bbdd0',emissiveIntensity:lite?.14:.34});
  const lime=new THREE.MeshStandardMaterial({color:'#25311c',roughness:.52,emissive:'#c7f300',emissiveIntensity:lite?.20:.48});
  basalt.map=surfaceTexture('stone',[2.8,2.2]);basalt.needsUpdate=true;
  wet.map=surfaceTexture('wet',[3.2,2.5]);wet.needsUpdate=true;
  oak.map=surfaceTexture('wood',[2.0,1.3]);oak.needsUpdate=true;

  const mark=(obj,title,body)=>{
    obj.userData.review={title,body};
    reviewPickables.push(obj);
    return obj;
  };
  const rod=(a,b,radius,material,segments=10)=>{
    const mid=a.clone().add(b).multiplyScalar(.5),dir=b.clone().sub(a),len=dir.length();
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,len,segments),material);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    rg.add(mesh);
    return mesh;
  };
  const ring=(radius,tube,material,x,y,z,rx=Math.PI/2)=>{
    const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,10,36),material);
    m.position.set(x,y,z);m.rotation.x=rx;rg.add(m);return m;
  };
  // Merge repeated static box primitives by material. The room keeps semantic/pickable
  // hero objects separate, but architecture does not need one draw call per beam or rail.
  const mergedMesh=(geos,material)=>{
    if(!geos.length)return null;
    const merged=mergeGeometries(geos,false);
    geos.forEach(g=>g.dispose());
    const mesh=new THREE.Mesh(merged,material);rg.add(mesh);return mesh;
  };
  const mergedBoxes=(specs,material)=>{
    const geos=specs.map(([w,h,d,x,y,z,rx=0,ry=0,rz=0])=>{
      const geo=new THREE.BoxGeometry(w,h,d);
      geo.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(x,y,z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),
        new THREE.Vector3(1,1,1)
      ));
      return geo;
    });
    return mergedMesh(geos,material);
  };
  const rodGeo=(a,b,radius,segments=10)=>{
    const mid=a.clone().add(b).multiplyScalar(.5),dir=b.clone().sub(a),len=dir.length();
    const geo=new THREE.CylinderGeometry(radius,radius,len,segments);
    geo.applyMatrix4(new THREE.Matrix4().compose(
      mid,
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()),
      new THREE.Vector3(1,1,1)
    ));
    return geo;
  };
  const torusGeo=(radius,tube,x,y,z)=>{
    const geo=new THREE.TorusGeometry(radius,tube,10,36);
    geo.rotateX(Math.PI/2);geo.translate(x,y,z);return geo;
  };
  const boxGeo=(w,h,d,x,y,z)=>{
    const geo=new THREE.BoxGeometry(w,h,d);geo.translate(x,y,z);return geo;
  };

  // Architectural depth inside the host shell: overhead ribs, wet floor, service spine.
  const ribCount=lite?5:8;
  const ribs=[],ribWarm=[];
  for(let i=0;i<ribCount;i++){
    const z=r.z1+.45+i*((rd-.9)/(ribCount-1));
    ribs.push([rw-.55,.09,.11,cx,Y+3.88,z]);
    if(i%2===0)ribWarm.push([rw*.62,.025,.035,cx-.30,Y+3.72,z]);
  }
  mergedBoxes(ribs,blackSteel);
  mergedBoxes(ribWarm,warmDim);
  box(.18,3.3,rd-.55,bounds.x0+.25,Y+1.65,cz,blackSteel);
  box(.07,3.0,rd-.75,bounds.x0+.39,Y+1.52,cz,cold);

  // Wet floor fields: subtle reflection zones rather than mirror slabs.
  mergedBoxes([
    [2.35,.012,.58,cx-1.65,Y+.014,cz-rd*.29],
    [2.65,.012,.66,cx-1.35,Y+.014,cz],
    [2.45,.012,.58,cx-1.05,Y+.014,cz+rd*.29],
    [1.25,.012,.74,cx+2.4,Y+.014,cz-.15]
  ],wet);

  const laneZ=[cz-rd*.28,cz,cz+rd*.28];
  const specimenSlots=[];
  const left=cx-3.35,right=cx+1.30,headY=3.23;
  mergedBoxes(laneZ.flatMap(z=>[
    [.10,3.05,.12,left,Y+1.53,z],
    [.10,3.05,.12,right,Y+1.53,z],
    [right-left+.10,.10,.12,(left+right)/2,Y+headY,z]
  ]),blackSteel);
  mergedBoxes(laneZ.map(z=>[right-left-.55,.025,.05,(left+right)/2,Y+headY-.22,z]),warmDim);
  mergedBoxes(laneZ.map(z=>[rw*.55,.025,Math.min(.92,rd*.20),cx-.85,Y+.018,z]),rubber);
  mergedBoxes(laneZ.flatMap(z=>[-.27,.27].map(dz=>[3.85,.016,.018,cx-1.0,Y+.037,z+dz])),steel);
  mergedBoxes(laneZ.flatMap(z=>[-.27,.27].map(dz=>[.32,.012,.035,cx-2.95,Y+.045,z+dz])),warm);
  mergedBoxes(laneZ.map(z=>[.24,.74,.48,cx-1.54,Y+.74,z]),blackSteel);
  mergedBoxes(laneZ.map(z=>[.98,.10,.42,cx+.68,Y+.08,z]),steel);
  mergedBoxes(laneZ.flatMap(z=>[
    [.16,.08,1.00,cx+.44,Y+.055,z],
    [.16,.08,1.00,cx+.93,Y+.055,z]
  ]),blackSteel);
  const runRollers=new THREE.InstancedMesh(new THREE.CylinderGeometry(.055,.055,.46,18),steel,laneZ.length*2);
  {
    const d=new THREE.Object3D();let n=0;
    for(const z of laneZ)for(const dx of [-.68,.68]){
      d.position.set(cx-2.35+dx,Y+.13,z);d.rotation.set(Math.PI/2,0,0);d.updateMatrix();
      runRollers.setMatrixAt(n++,d.matrix);
    }
    runRollers.instanceMatrix.needsUpdate=true;rg.add(runRollers);
  }

  laneZ.forEach((z,i)=>{

    contactShadow(cx-.20,z,4.3,.72,.42);

    // Trainer: flywheel, axle, feet, support.
    const fly=mark(new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.17,36),blackSteel),
      'Direct-drive trainer','Generic equipment study. No athlete-specific trainer claim is attached.');
    fly.rotation.z=Math.PI/2;put(fly,cx+.68,Y+.43,z);
    const axle=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.34,14),steel);
    axle.rotation.z=Math.PI/2;put(axle,cx+.68,Y+.43,z);
    // Compact run deck with shared instanced rollers and an individual inspectable deck.
    const deck=mark(box(1.62,.10,.54,cx-2.35,Y+.09,z,rubber),
      'Run deck','Compact treadmill-style deck: the lane reads as a complete training station rather than a bike pedestal.');
    const console=mark(box(.30,.20,.42,cx-1.48,Y+1.35,z,cold),
      'Lane console','Environmental and session information lives here. It is editorial UI, not an athlete data claim.');
    console.rotation.z=-.05;

    // Canonical bike slot. The procedural study remains only as a fallback until the host
    // supplies the canonical CFR model. It is tagged so review/host code can hide it without
    // knowing mesh names or reimplementing the room.
    const bx=cx-.22,by=Y+.66;
    const pBB=new THREE.Vector3(bx,by-.05,z),pSeat=new THREE.Vector3(bx-.10,by+.54,z),pHead=new THREE.Vector3(bx+.42,by+.30,z);
    const fallbackSteel=mergedMesh([
      torusGeo(.42,.026,bx-.55,by,z),torusGeo(.42,.026,bx+.55,by,z),
      rodGeo(new THREE.Vector3(bx+.40,by+.34,z),new THREE.Vector3(bx+.70,by+.42,z),.018,10)
    ],steel);
    const fallbackFrame=mergedMesh([
      rodGeo(pBB,pSeat,.026),rodGeo(pSeat,pHead,.026),rodGeo(pHead,pBB,.026),
      rodGeo(pSeat,new THREE.Vector3(bx-.55,by,z),.022),rodGeo(pHead,new THREE.Vector3(bx+.55,by,z),.022),
      boxGeo(.34,.035,.10,bx-.14,by+.61,z)
    ],blackSteel);
    mark(fallbackSteel,'Canonical bike slot','The room reserves a canonical bike position, but no athlete-specific bike or livery is assigned without a verified source.');
    [fallbackSteel,fallbackFrame].forEach(o=>{o.userData.nor3BikeFallback=true;});

    // Accessories and signs of use.
    const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.052,.34,16),glass);
    put(bottle,bx+.20,Y+.25,z-.34);
    const towel=box(.40,.025,.33,bx-.65,Y+.31,z+.34,linen);towel.rotation.y=.08*(i-1);
    const identity=ring(.11,.014,i===1?lime:warm,bx-1.10,Y+.16,z,Math.PI/2);
    const plaque=textPanel('0'+(i+1),.36,.13,i===1?'#c7f300':'#ff8b55');plaque.position.set(left+.02,Y+2.70,z-.075);plaque.rotation.y=Math.PI/2;rg.add(plaque);
    mark(identity,['Lane 01','Lane 02','Lane 03'][i],
      ['Kristian Blummenfelt concept lane','Gustav Iden concept lane','Casper Stornes concept lane'][i]+'. Subject presence does not imply endorsement.');

    // Small lane practical light.
    if(!lite||i===1){
      const pl=new THREE.PointLight(i===1?'#d9f7ff':'#ff8750',lite?1.0:2.0,4.5,2);
      pl.position.set(cx-.9,Y+2.75,z);rg.add(pl);
    }

    specimenSlots.push(new THREE.Vector3(bx,Y,z));
    obstacles.push({box:[left-.12,right+.12,z-.46,z+.46]});
  });

  // Protocol table and wall: a working bench, not a sci-fi hologram.
  box(2.75,.13,1.16,cx+2.55,Y+1.02,cz,oak);
  box(.10,1.0,.94,cx+1.42,Y+.50,cz,steel);
  box(.10,1.0,.94,cx+3.68,Y+.50,cz,steel);
  const analyser=mark(box(.64,.30,.48,cx+1.82,Y+1.30,cz-.25,blackSteel),
    'Protocol analyser','A generic lab instrument study. Exact Norwegian-team hardware is not asserted.');
  const screen=box(.44,.018,.21,cx+1.82,Y+1.47,cz-.08,cold);screen.rotation.x=-.16;
  box(2.65,1.65,.08,cx+2.55,Y+2.18,r.z0-.14,basalt);
  const protocolTitle=textPanel('MEASURE  /  ADAPT  /  REPEAT',2.20,.20,'#c8f2fb','rgba(6,12,15,.82)');protocolTitle.position.set(cx+2.55,Y+3.15,r.z0-.21);rg.add(protocolTitle);
  mergedBoxes([0,1,2].map(i=>[.08,.55+.12*i,.028,cx+1.75+i*.42,Y+2.05,r.z0-.19,0,0,(i-1.5)*.025]),cold);
  mergedBoxes([[.08,.91,.028,cx+3.01,Y+2.05,r.z0-.19,0,0,(3-1.5)*.025]],warm);
  const vialGeo=new THREE.CylinderGeometry(.025,.025,.18,12);
  const vials=new THREE.InstancedMesh(vialGeo,glass,lite?8:16);
  const dummy=new THREE.Object3D();
  for(let i=0;i<vials.count;i++){
    const row=i%2,col=Math.floor(i/2);
    dummy.position.set(cx+2.28+col*.12,Y+1.31,cz-.27+row*.17);
    dummy.updateMatrix();vials.setMatrixAt(i,dummy.matrix);
  }
  rg.add(vials);mark(vials,'Sample rack','Repeated lab props are instanced to keep the room visually dense without multiplying draw calls.');
  mergedBoxes(Array.from({length:lite?3:6},(_,i)=>[
    .34,.010,.23,cx+1.95+i*.31,Y+1.15,cz+.38,0,(rand()-.5)*.12,0
  ]),paper);
  const protocolLight=new THREE.PointLight('#ffd0a6',lite?1.4:3.2,4.8,2);
  protocolLight.position.set(cx+2.5,Y+2.65,cz-.2);rg.add(protocolLight);
  obstacles.push({box:[cx+1.15,cx+3.95,cz-.76,cz+.76]});

  // Controlled-environment bay: framed low-iron glass with internal haze.
  const ax=cx+3.28,az=cz-rd*.30,gw=1.86,gd=Math.min(1.22,rd*.24),gh=2.65;
  const pane=(w,h,x,y,z,ry=0,mat=glass)=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
    m.position.set(x,y,z);m.rotation.y=ry;rg.add(m);return m;
  };
  const backPane=mark(pane(gw,gh,ax,Y+gh/2,az-gd/2,0,glass),
    'Environment bay','A controlled-environment chamber for heat, cold and altitude storytelling. It is an original room device, not a replica of a specific facility.');
  pane(gd,gh,ax-gw/2,Y+gh/2,az,Math.PI/2,glass);
  pane(gd,gh,ax+gw/2,Y+gh/2,az,Math.PI/2,glass);
  mergedBoxes([
    [ .035,gh,.035,ax-gw/2,Y+gh/2,az-gd/2],[ .035,gh,.035,ax-gw/2,Y+gh/2,az+gd/2],
    [ .035,gh,.035,ax+gw/2,Y+gh/2,az-gd/2],[ .035,gh,.035,ax+gw/2,Y+gh/2,az+gd/2],
    [ gw,.035,.035,ax,Y+gh,az-gd/2],[ gw,.035,.035,ax,Y+gh,az+gd/2]
  ],steel);
  box(.62,.82,.20,ax+.46,Y+.87,az-gd/2+.13,blackSteel);
  box(.42,.26,.025,ax+.46,Y+1.10,az-gd/2-.01,cold);
  mergedBoxes(Array.from({length:5},(_,i)=>[
    .018,.52,.02,ax-gw*.34+i*(gw*.17),Y+1.6,az-gd/2-.02,0,0,(i-2)*.025
  ]),frost);

  // Heat/cool wall and moving fans.
  const fanRotors=[];
  [cz+rd*.20,cz+rd*.36].forEach((z,i)=>{
    const rim=mark(new THREE.Mesh(new THREE.TorusGeometry(.42,.04,10,36),blackSteel),
      i?'Cooling fan B':'Cooling fan A','Animated generic cooling hardware. Rotors stop in reduced-motion mode.');
    rim.rotation.y=Math.PI/2;put(rim,cx+3.13,Y+1.22,z);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.14,16),steel);
    hub.rotation.z=Math.PI/2;put(hub,cx+3.13,Y+1.22,z);
    const rotor=new THREE.Group();rotor.position.set(cx+3.10,Y+1.22,z);rg.add(rotor);
    const blades=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,.22,.08),steel,5);
    const d=new THREE.Object3D();
    for(let b=0;b<5;b++){
      const a=b*Math.PI*2/5;d.position.set(0,Math.cos(a)*.18,Math.sin(a)*.18);d.rotation.set(a,0,0);d.updateMatrix();blades.setMatrixAt(b,d.matrix);
    }
    blades.instanceMatrix.needsUpdate=true;rotor.add(blades);
    fanRotors.push({o:rotor,ph:i});
  });
  const heat=mark(box(.10,.80,.55,cx+3.72,Y+2.62,cz+rd*.34,warm),
    'Heat panel','A restrained warm counterpoint in the heat/cool zone. It is an original environmental prop.');
  heat.rotation.z=.06;

  // Podium vault: museum-grade but abstract, with a shadow-gap cabinet.
  box(3.05,1.60,.20,cx+2.35,Y+2.63,r.z0-.22,blackSteel);
  box(2.80,1.36,.05,cx+2.35,Y+2.63,r.z0-.34,basalt);
  const metals=[
    new THREE.MeshStandardMaterial({color:'#9c792d',roughness:.25,metalness:.88}),
    new THREE.MeshStandardMaterial({color:'#8b949a',roughness:.21,metalness:.92}),
    new THREE.MeshStandardMaterial({color:'#74412a',roughness:.29,metalness:.82})
  ];
  [-1,0,1].forEach((k,i)=>{
    const disc=mark(new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.07,48),metals[i]),
      'Abstract result object','Original geometry evokes achievement without copying a medal, trophy or protected object.');
    disc.rotation.x=Math.PI/2;put(disc,cx+2.35+k*.82,Y+2.72,r.z0-.39);
  });
  mergedBoxes([-1,0,1].map(k=>[.52,.035,.26,cx+2.35+k*.82,Y+2.25,r.z0-.31]),steel);

  // Fjord relief: mount on the room-facing side of the smoked-oak service wall.
  // The outer shell sits behind that wall, so placing content on the shell made it invisible.
  const featureWallX=bounds.x1-1.18;
  const nRidges=lite?15:29,steelRidges=[],darkRidges=[];
  for(let i=0;i<nRidges;i++){
    const u=i/(nRidges-1),z=cz-rd*.34+u*(rd*.68);
    const mountain=.42+.92*Math.abs(Math.sin(u*Math.PI*2.25+.35))+.34*Math.abs(Math.sin(u*Math.PI*5.1));
    const h=Math.min(1.92,mountain);
    const depth=.07+.18*Math.abs(Math.sin(i*.71));
    const x=featureWallX-depth*.52;
    (i%5===0?steelRidges:darkRidges).push([depth,h,.20,x,Y+.72+h/2,z,0,0,.015*Math.sin(i*.7)]);
  }
  mergedBoxes(steelRidges,steel);
  mergedBoxes(darkRidges,blackSteel);
  const fjordBase=mark(box(.24,.16,Math.min(6.1,rd*.72),featureWallX-.07,Y+.68,cz,oak),
    'Fjord relief','Original layered geometry brings landscape memory into the room without copying maps or landscape photography.');
  const fjordLight=new THREE.SpotLight('#9ed9e7',lite?3.6:7.2,7.5,Math.PI*.24,.68,1.55);
  fjordLight.position.set(featureWallX-2.35,Y+2.15,cz-rd*.20);
  fjordLight.target.position.set(featureWallX-.12,Y+1.55,cz);
  rg.add(fjordLight,fjordLight.target);

  // Recovery corner and the deliberately mundane objects that make a room feel inhabited.
  contactShadow(cx+1.05,r.z1+.62,1.95,.78,.44);
  const bench=mark(box(1.65,.18,.52,cx+1.05,Y+.38,r.z1+.62,oak),
    'Recovery bench','A quiet recovery corner: practical, imperfect, and intentionally less ceremonial than the podium wall.');
  box(.10,.38,.46,cx+.42,Y+.19,r.z1+.62,steel);box(.10,.38,.46,cx+1.68,Y+.19,r.z1+.62,steel);
  for(let i=0;i<(lite?2:4);i++){
    const roller=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.52,16),i%2?rubber:linen);
    roller.rotation.z=Math.PI/2;put(roller,cx+.55+i*.32,Y+.20,r.z1+.25);
  }
  for(let i=0;i<3;i++){
    const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.052,.34,16),i===1?frost:glass);
    put(bottle,cx+1.55+i*.13,Y+.27,r.z1+.22);
  }

  // Kona line shares that room-facing surface, then turns onto the floor as a route.
  const konaSignal=new THREE.MeshBasicMaterial({color:'#ff6a22',toneMapped:false});
  const konaMark=textPanel('KONA  →',.88,.18,'#ff8a54','rgba(8,11,14,.62)');konaMark.position.set(featureWallX-.14,Y+3.22,cz);konaMark.rotation.y=-Math.PI/2;rg.add(konaMark);
  const konaLine=mark(box(.045,.055,Math.min(4.8,rd*.86),featureWallX-.13,Y+2.95,cz,konaSignal),
    'Kona line','One thin warm destination line. Kona remains the destination, not the decoration theme.');
  box(Math.min(3.2,rw*.26),.016,.045,featureWallX-1.60,Y+.026,cz,konaSignal);

  // Atmosphere and air movement.
  const moisture=motes({
    n:lite?42:96,
    box:[bounds.x0+.18,bounds.x0+1.15,Y+.12,Y+3.55,r.z1+.18,r.z0-.18],
    color:'#bfe8ef',size:.026,rise:-.08,sway:.055,opacity:.34,seed:seed+7
  });
  rg.add(moisture.points);L.motes.push(moisture);
  const chamberMist=motes({
    n:lite?18:44,
    box:[ax-gw*.42,ax+gw*.42,Y+.20,Y+2.45,az-gd*.35,az+gd*.35],
    color:'#dff8ff',size:.020,rise:.035,sway:.025,opacity:.24,seed:seed+19
  });
  rg.add(chamberMist.points);L.motes.push(chamberMist);

  // Accents stay inside room lighting budget.
  const coolLight=new THREE.PointLight('#d6f6ff',lite?2.4:5.2,8,1.7);
  coolLight.position.set(cx+.40,Y+3.10,cz-.35);rg.add(coolLight);
  const konaLight=new THREE.PointLight('#ff6a22',lite?1.6:3.4,6,2);
  konaLight.position.set(bounds.x1-.55,Y+2.75,cz);rg.add(konaLight);
  const vaultLight=new THREE.PointLight('#ffcf9a',lite?1.1:2.2,4.5,2);
  vaultLight.position.set(cx+2.35,Y+3.25,r.z0-.50);rg.add(vaultLight);

  Object.assign(L,{
    specimenSlots,fanRotors,analyser,protocolScreen:screen,coolLight,konaLight,fjordLight,
    reviewPickables,environmentBay:backPane,fjordBase,bench,konaLine
  });
}

function PAPER_MAT(){
  return new THREE.MeshStandardMaterial({color:'#d7d1c7',roughness:.94});
}

export const INSTALLATION_BUILDERS=Object.freeze({bio,horror,alien,zombie,norwegian});
export function buildInstallation(preset,{group,bounds,elevation=0,specimen,lite=false,obstacles=[],floorMat,seed=101}={}){
  const build=INSTALLATION_BUILDERS[preset];
  if(!build)throw new Error(`Unknown decoration preset: ${preset}`);
  const rg=new THREE.Group();rg.name=`decoration-${preset}`;group.add(rg);
  const Y=elevation,rw=bounds.x1-bounds.x0,rd=Math.abs(bounds.z1-bounds.z0);
  const cx=(bounds.x0+bounds.x1)/2,cz=(bounds.z0+bounds.z1)/2;
  const r={id:preset,z0:Math.max(bounds.z0,bounds.z1),z1:Math.min(bounds.z0,bounds.z1)};
  const put=(mesh,x,y,z)=>{mesh.position.set(x,y,z);rg.add(mesh);return mesh};
  const box=(w,h,d,x,y,z,mat)=>put(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat),x,y,z);
  const L={id:preset,group:rg,floorMat,motes:[]};
  build({r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen:specimen||new THREE.Vector3(cx+.55,Y,cz),obstacles,L,bounds});
  return L;
}
