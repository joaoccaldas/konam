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

export const INSTALLATION_BUILDERS=Object.freeze({bio,horror,alien,zombie});
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
