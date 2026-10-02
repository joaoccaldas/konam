import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { coarse as coarseDetect, small } from './detect.js';

const ASSET_URL = 'assets/artworld/artworld_assets.glb';

const PLACE_DEFS = [
  {
    id: 'st-george',
    title: 'St. George',
    sub: 'Red rock / contour study',
    text: 'One canyon silhouette from the aisle. Up close it separates into contour fins and a warm seam.',
    prefix: ['STG_'],
    position: [5.25, 0, -11.8],
    color: '#8f311f',
    accent: '#ff8c42',
    split: .34,
  },
  {
    id: 'las-vegas',
    title: 'Las Vegas',
    sub: 'Mirror / neon study',
    text: 'A dark reflective object from far away. Walk closer and the surface breaks into offset neon planes.',
    prefix: ['VEGAS_'],
    position: [5.25, 0, -22.6],
    color: '#111218',
    accent: '#ff3d8e',
    split: .42,
  },
  {
    id: 'nice',
    title: 'Nice',
    sub: 'Sea glass / coastal study',
    text: 'A quiet coastal ribbon at distance, then layered translucent geometry appears as you move around it.',
    prefix: ['NICE_'],
    position: [5.25, 0, -33.4],
    color: '#8bd4dc',
    accent: '#c8f5f2',
    split: .16,
  },
  {
    id: 'kona',
    title: 'Kona',
    sub: 'Obsidian / heat study',
    text: 'An obsidian marker from the hall. Close up, black shards expose a hot volcanic core.',
    prefix: ['KONA_'],
    position: [5.25, 0, -43.3],
    color: '#121419',
    accent: '#ff592c',
    split: .38,
  },
];

// the secret collection's liveries live in museum/skins/museum.json (group: artworld)
const HORROR_THEMES = (window.__SKINS?.skins || []).filter(s => s.group === 'artworld').map(s => ({ name: s.name, paint: s.frame, accent: s.accent, note: s.note }));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

function physical(color, roughness=.28, metalness=.1, emissive=null) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: .82,
    clearcoatRoughness: .07,
    envMapIntensity: 1.8,
    emissive: emissive || '#000000',
    emissiveIntensity: emissive ? .55 : 0,
  });
}

function matte(color, roughness=.75, metalness=.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: .7 });
}

function glow(color, opacity=.9) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    toneMapped: false,
  });
}

function box(w, h, d, material) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  o.castShadow = false;
  o.receiveShadow = true;
  return o;
}

function makeTube(a, b, r, material) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va), len = d.length();
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), material);
  o.position.copy(va).add(vb).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize());
  return o;
}

function wireBike(material) {
  const g = new THREE.Group();
  const wheelGeo = new THREE.TorusGeometry(.34, .018, 5, 22);
  for (const x of [-.55, .55]) {
    const w = new THREE.Mesh(wheelGeo, material);
    w.rotation.y = Math.PI / 2;
    w.position.set(x, .38, 0);
    g.add(w);
  }
  const pts = {
    bb: [-.05,.37,0], seat: [-.12,.84,0], head: [.38,.78,0],
    rear: [-.55,.38,0], front: [.55,.38,0], cockpit: [.53,.94,0],
  };
  for (const [a,b] of [['rear','bb'],['bb','seat'],['seat','head'],['head','bb'],['head','front'],['seat','rear'],['head','cockpit']]) {
    g.add(makeTube(pts[a], pts[b], .018, material));
  }
  return g;
}

function assetMeshes(asset, prefixes) {
  const matches = [];
  asset.traverse(src => {
    if (src.isMesh && prefixes.some(p => src.name.startsWith(p))) matches.push(src);
  });
  return matches;
}

const ART_AXIS_FIX = new THREE.Matrix4().makeRotationX(Math.PI/2);
const ART_FACE_HALL = new THREE.Matrix4()
  .makeRotationY(Math.PI/2)
  .multiply(ART_AXIS_FIX);

function bakedAssetMesh(src, authoredOrientation=ART_AXIS_FIX) {
  // The procedural Blender generator intentionally treats its Y coordinate as vertical.
  // Blender is Z-up, so glTF exports that intended vertical along -Z. Preserve each
  // node's full authored transform, then bake the runtime axis/orientation correction
  // into geometry before reparenting. After this, every exhibit is ordinary Three.js Y-up.
  const c = new THREE.Mesh(src.geometry.clone(), src.material);
  c.name = src.name;
  c.geometry.applyMatrix4(src.matrixWorld);
  if (authoredOrientation) c.geometry.applyMatrix4(authoredOrientation);
  c.position.set(0,0,0);
  c.rotation.set(0,0,0);
  c.scale.set(1,1,1);
  c.updateMatrix();
  return c;
}

function normalizeAssetGroup(g) {
  // Normalize in authored local space, independent of where the exhibit will live.
  // Restoring the transform afterwards keeps placement and centering as separate concerns.
  const pos = g.position.clone(), quat = g.quaternion.clone(), scale = g.scale.clone();
  g.position.set(0,0,0);
  g.quaternion.identity();
  g.scale.set(1,1,1);
  g.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(g);
  if (!bounds.isEmpty()) {
    const center = bounds.getCenter(new THREE.Vector3());
    const dy = bounds.min.y;
    g.traverse(o => {
      if (o.isMesh) o.geometry.translate(-center.x, -dy, -center.z);
    });
  }
  g.position.copy(pos);
  g.quaternion.copy(quat);
  g.scale.copy(scale);
  g.updateMatrixWorld(true);
  return g;
}

function cloneBikeForCollection(root) {
  // Three.js deep-clones userData with JSON serialization. Museum bike meshes carry
  // a live back-reference to their piece, so sanitize only during the synchronous clone.
  const saved = [];
  root.traverse(o => {
    saved.push([o, o.userData]);
    o.userData = o.userData?.part ? { part: o.userData.part } : {};
  });
  try {
    return root.clone(true);
  } finally {
    for (const [o, userData] of saved) o.userData = userData;
  }
}

function repaintBike(root, theme, simplified=false) {
  root.traverse(o => {
    if (!o.isMesh) return;
    if (simplified) {
      const p = o.userData?.part || '';
      if (!/frame|fork|wheel_front|wheel_rear|base_bar|basebar|extensions|seatpost|saddle/.test(p)) {
        o.visible = false;
        return;
      }
    }
    const source = [].concat(o.material || []);
    const mats = source.map(m => {
      const c = m.clone();
      c.envMapIntensity = 2.3;
      if (c.name === 'paint_frame' || /paint/i.test(c.name || '')) {
        c.color?.set(theme.paint);
        c.roughness = .085;
        c.metalness = Math.max(c.metalness || 0, .18);
        if ('clearcoat' in c) {
          c.clearcoat = 1;
          c.clearcoatRoughness = .045;
        }
      } else if (/decal|logo|graphic/i.test(c.name || '')) {
        c.color?.set(theme.accent);
        if (c.emissive) {
          c.emissive.set(theme.accent);
          c.emissiveIntensity = .12;
        }
      }
      return c;
    });
    o.material = Array.isArray(o.material) ? mats : mats[0];
    o.castShadow = false;
    o.receiveShadow = false;
  });
}

export async function initArtWorld(museum) {
  const { scene, camera, P, PIECES, pickables, obstacles } = museum;
  const coarse = coarseDetect;
  const mobile = coarse || small;

  const api = {
    ready: false,
    regionOf,
    walkable,
    enter,
    update,
    goto,
  };
  window.__museumArt = api;

  const root = new THREE.Group();
  root.name = 'ART WORLD';
  scene.add(root);

  const installations = [];
  api.installations = installations;
  const hiddenRoom = new THREE.Group();
  hiddenRoom.name = 'SECRET COLLECTION';
  hiddenRoom.visible = false;
  scene.add(hiddenRoom);

  const HORROR = { x0: 35, x1: 55, z0: -44, z1: -15.5, h: 5.6 };
  let collectionBuilt = false;
  const fullBikes = [];
  const artLights = [];

  function regionOf(x, z) {
    return x > HORROR.x0+.35 && x < HORROR.x1-.35 && z > HORROR.z0+.35 && z < HORROR.z1-.35 ? 'horror' : null;
  }

  function walkable(x, z) {
    if (!regionOf(x,z)) return false;
    for (const o of obstacles) {
      if (o.c && o.c.x > HORROR.x0 && Math.hypot(x-o.c.x, z-o.c.z) < o.r) return false;
      if (o.box && x > o.box[0] && x < o.box[1] && z > o.box[2] && z < o.box[3]) return false;
    }
    return true;
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('on'), 3600);
  }

  function addInfo(mesh, info) {
    mesh.userData.info = info;
    pickables.push(mesh);
  }

  function makePlinth(pos, info, accent) {
    const base = box(1.85,.17,.82,physical('#22242a',.18,.32));
    base.position.set(pos[0],.085,pos[2]);
    root.add(base);
    const seam = box(1.58,.018,.62,glow(accent,.78));
    seam.position.set(pos[0],.18,pos[2]);
    root.add(seam);
    addInfo(base, info);
    obstacles.push({ c: new THREE.Vector3(pos[0],0,pos[2]), r: .95 });
  }

  function materialForName(name, def) {
    if (/GLOW|NEON|CORE/i.test(name)) return physical(def.accent,.12,.08,def.accent);
    if (def.id === 'nice') return new THREE.MeshPhysicalMaterial({
      color: def.color, roughness:.12, metalness:.04, transmission:.08,
      transparent:true, opacity:.88, clearcoat:1, clearcoatRoughness:.04, envMapIntensity:2,
    });
    return physical(def.color, def.id === 'las-vegas' ? .08 : .18, def.id === 'las-vegas' ? .42 : .15);
  }

  function mountAssetGroup(asset, def) {
    const g = new THREE.Group();
    g.name = 'ART ' + def.title;
    g.position.set(...def.position);
    g.position.y = .18;
    g.scale.setScalar(1.28);

    const parts = [];
    for (const src of assetMeshes(asset, def.prefix)) {
      const c = bakedAssetMesh(src, ART_FACE_HALL);
      c.material = materialForName(c.name, def);
      c.userData = { index: parts.length };
      c.castShadow = !mobile;
      c.receiveShadow = true;
      parts.push(c);
      g.add(c);
    }
    normalizeAssetGroup(g);
    root.add(g);

    makePlinth(def.position, {
      eyebrow: 'Distance-reactive art',
      title: def.title,
      sub: def.sub,
      text: def.text,
    }, def.accent);

    installations.push({ g, parts, def });
  }

  function mountPortal(asset) {
    const g = new THREE.Group();
    g.name = 'HIDDEN PORTAL';
    g.position.set(-6.76,0,-36.4);
    g.position.y = .08;
    g.scale.setScalar(1.42);
    for (const src of assetMeshes(asset, ['PORTAL_'])) {
      const c = bakedAssetMesh(src, ART_FACE_HALL);
      c.material = src.name.includes('RING') ? physical('#261833',.08,.22,'#a568d0') : physical('#121318',.14,.42);
      c.userData = {};
      g.add(c);
    }
    normalizeAssetGroup(g);
    root.add(g);

    const hit = box(.15,2.6,1.65,new THREE.MeshBasicMaterial({ transparent:true, opacity:.001, depthWrite:false }));
    hit.position.set(-6.62,1.35,-36.4);
    hit.userData.artPortal = { id:'horror-in', label:'Hidden collection' };
    root.add(hit);
    pickables.push(hit);

    g.userData.hit = hit;
    api.portal = g;
  }

  function clonePrefabs(asset, prefixes) {
    const g = new THREE.Group();
    for (const src of assetMeshes(asset, prefixes)) {
      const c = bakedAssetMesh(src, ART_AXIS_FIX);
      if (/CARNIVAL/i.test(c.name)) c.material = physical('#5c1524',.12,.24,'#8a2236');
      else if (/TOTEM/i.test(c.name)) c.material = physical('#4c331b',.2,.58);
      else c.material = physical('#17151a',.38,.16);
      g.add(c);
    }
    return normalizeAssetGroup(g);
  }

  function buildRoomShell(asset) {
    const floor = box(HORROR.x1-HORROR.x0,.28,HORROR.z1-HORROR.z0,matte('#111014',.34,.12));
    floor.position.set((HORROR.x0+HORROR.x1)/2,-.14,(HORROR.z0+HORROR.z1)/2);
    floor.userData.floor = true;
    floor.receiveShadow = true;
    hiddenRoom.add(floor);
    pickables.push(floor);                                           // click-to-walk works inside the hidden collection too

    const wallMat = matte('#141216',.72,.04);
    const ceiling = box(HORROR.x1-HORROR.x0,.24,HORROR.z1-HORROR.z0,matte('#0a090c',.82,.04));
    ceiling.position.set((HORROR.x0+HORROR.x1)/2,HORROR.h+.12,(HORROR.z0+HORROR.z1)/2);
    hiddenRoom.add(ceiling);

    const back = box(HORROR.x1-HORROR.x0,HORROR.h,.35,wallMat);
    back.position.set(45,HORROR.h/2,HORROR.z0);
    hiddenRoom.add(back);
    for (const x of [HORROR.x0,HORROR.x1]) {
      const wall = box(.35,HORROR.h,HORROR.z1-HORROR.z0,wallMat);
      wall.position.set(x,HORROR.h/2,(HORROR.z0+HORROR.z1)/2);
      hiddenRoom.add(wall);
    }

    const ribs = [];
    for (let i=0;i<9;i++) {
      const z=-41.5+i*3.15;
      for (const x of [34.2,55.8]) {
        const r=box(.045,3.7,.045,glow(i%2?'#503556':'#623333',.55));
        r.position.set(x,2.0,z);
        hiddenRoom.add(r); ribs.push(r);
      }
    }

    const arch = clonePrefabs(asset,['ARCH_']);
    arch.position.set(45,0,-43.9);
    arch.scale.setScalar(1.24);
    hiddenRoom.add(arch);

    const totemA = clonePrefabs(asset,['TOTEM_']);
    totemA.position.set(35.3,0,-39.2);
    totemA.scale.setScalar(1.6);
    hiddenRoom.add(totemA);

    const totemB = totemA.clone(true);
    totemB.position.set(54.7,0,-22.5);
    totemB.rotation.y = Math.PI;
    hiddenRoom.add(totemB);

    const carnival = clonePrefabs(asset,['CARNIVAL_']);
    carnival.position.set(55.55,1.05,-36.4);
    carnival.rotation.y = -Math.PI/2;
    carnival.scale.setScalar(1.5);
    hiddenRoom.add(carnival);

    const exit = box(.12,2.6,1.9,physical('#28232b',.2,.26));
    exit.position.set(33.27,1.3,-29.2);
    exit.userData.artPortal = { id:'horror-out', label:'Return to museum' };
    hiddenRoom.add(exit);
    pickables.push(exit);

    const cold = new THREE.HemisphereLight('#9b88bd','#170d12',.72);
    hiddenRoom.add(cold);
    for (const [x,z,c] of [[45,-42,'#a568d0'],[38,-38,'#7b4ea0'],[52,-33,'#8e2635'],[38,-22,'#33576e'],[52,-18,'#6c5735']]) {
      const l = new THREE.PointLight(c,7.5,14,1.8);
      l.position.set(x,3.9,z);
      l.castShadow = false;
      hiddenRoom.add(l);
      artLights.push(l);
    }
  }

  function buildCollection() {
    if (collectionBuilt) return;
    const source = PIECES.find(p => p.key === 'cfr' && p.bike) || PIECES.find(p => p.bike);
    if (!source?.bike) return;
    const fullCount = mobile ? 4 : 6;
    const slots = [
      [39.1,-38.6,Math.PI/2],[50.9,-36.0,-Math.PI/2],
      [39.1,-30.1,Math.PI/2],[50.9,-27.4,-Math.PI/2],
      [39.1,-21.8,Math.PI/2],[50.9,-19.0,-Math.PI/2],
    ];

    for (let i=0;i<Math.min(fullCount, HORROR_THEMES.length);i++) {
      const theme = HORROR_THEMES[i];
      const holder = cloneBikeForCollection(source.bike);
      repaintBike(holder,theme,false);
      holder.scale.setScalar(mobile ? 1.16 : 1.32);
      holder.position.set(slots[i][0],.34,slots[i][1]);
      holder.rotation.y = slots[i][2];
      hiddenRoom.add(holder);
      fullBikes.push({ holder, theme, i });

      const plinth = box(4.15,.34,1.58,physical('#16141a',.11,.42));
      plinth.position.set(slots[i][0],.15,slots[i][1]);
      hiddenRoom.add(plinth);
      const seam = box(3.78,.028,1.28,glow(theme.accent,.86));
      seam.position.set(slots[i][0],.32,slots[i][1]);
      hiddenRoom.add(seam);
      addInfo(plinth,{
        eyebrow:'Secret collection',
        title:theme.name,
        sub:'Experimental bike livery',
        text:theme.note,
      });
      obstacles.push({ c:new THREE.Vector3(slots[i][0],0,slots[i][1]), r:1.82 });
    }

    const archiveMat = new THREE.MeshBasicMaterial({ color:'#736c82', transparent:true, opacity:.34, toneMapped:false });
    const archive = new THREE.Group();
    archive.name = 'ARCHIVE WALL';
    const total = mobile ? 8 : 18;
    for (let i=0;i<total;i++) {
      const b = wireBike(archiveMat.clone());
      const row = Math.floor(i/6), col = i%6;
      b.position.set(37.1+col*2.58,1.85+row*1.28,-43.72);
      b.scale.setScalar(.66);
      archive.add(b);
    }
    hiddenRoom.add(archive);
    collectionBuilt = true;
  }

  async function loadAssets() {
    const gltf = await new GLTFLoader().loadAsync(ASSET_URL);
    const asset = gltf.scene;
    asset.updateMatrixWorld(true);
    for (const def of PLACE_DEFS) mountAssetGroup(asset,def);
    mountPortal(asset);
    buildRoomShell(asset);
    api.asset = asset;
    api.ready = true;
    window.dispatchEvent(new CustomEvent('museum-art-ready'));
  }

  function enter(portal) {
    if (!portal) return;
    if (portal.id === 'horror-in') {
      P.x=36.15; P.z=-29.2; P.yaw=-Math.PI/2; P.pitch=-.03; P.vx=P.vz=0;
      hiddenRoom.visible=true;
      document.body.classList.add('secret-room');
      buildCollection();
      toast('Secret collection unlocked. The room changes as you move through it.');
    } else if (portal.id === 'horror-out') {
      P.x=-5.3; P.z=-36.4; P.yaw=Math.PI/2; P.pitch=-.03; P.vx=P.vz=0;
      hiddenRoom.visible=false;
      document.body.classList.remove('secret-room');
      toast('Back in the main gallery.');
    }
  }

  function goto(id) {
    if (id === 'horror') {
      enter({id:'horror-in'});
      P.x=45; P.z=-17.0; P.yaw=0; P.pitch=-.045;
      return;
    }
    const i = installations.find(x => x.def.id === id);
    if (!i) return;
    P.x=1.9; P.z=i.def.position[2]; P.yaw=-Math.PI/2; P.pitch=-.05; P.vx=P.vz=0;
  }

  function update(dt,t,visitor,cam,region) {
    buildCollection();

    for (const inst of installations) {
      const d=Math.hypot(cam.position.x-inst.g.position.x,cam.position.z-inst.g.position.z);
      const open=smooth(clamp((6.4-d)/4.5,0,1));
      inst.parts.forEach((p,i) => {
        const center=(inst.parts.length-1)/2;
        const s=i-center;
        const targetX=s*inst.def.split*open*.18;
        const targetZ=Math.abs(s)*inst.def.split*open*.055;
        p.position.x += (targetX-p.position.x)*(1-Math.exp(-dt*5));
        p.position.z += (targetZ-p.position.z)*(1-Math.exp(-dt*5));
        p.rotation.y = s*.055*open*(inst.def.id==='las-vegas'?-1:1);
      });
    }

    if (api.portal) {
      const d=Math.hypot(cam.position.x-api.portal.position.x,cam.position.z-api.portal.position.z);
      const wake=smooth(clamp((6.4-d)/4.8,0,1));
      api.portal.scale.setScalar(1.08+wake*.12);
      api.portal.rotation.z=Math.sin(t*.35)*.015*wake;
    }

    const inside = region === 'horror' || !!regionOf(visitor.x,visitor.z);
    hiddenRoom.visible = inside;
    if (inside) {
      fullBikes.forEach(({holder,i}) => {
        holder.traverse(o => {
          if (!o.isMesh) return;
          for (const m of [].concat(o.material || [])) {
            if (m.name === 'paint_frame' || /paint/i.test(m.name || '')) {
              m.roughness=.078+Math.sin(t*.48+i)*.014;
              m.envMapIntensity=2.4+Math.sin(t*.32+i)*.22;
            }
          }
        });
      });
    }
  }

  loadAssets().catch(err => {
    api.loadError = err?.stack || err?.message || String(err);
    console.warn('art world asset load failed', api.loadError);
    api.ready = true;
  });

  return api;
}
