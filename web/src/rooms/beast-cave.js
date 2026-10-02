// rooms/beast-cave.js
// Lionel Sanders x Zwift "Beast Cave" prototype.
//
// IMPORTANT: this module is intentionally UNWIRED. It is not imported by hall.js,
// navigation, the canonical 28-room registry, service worker manifests or release
// bundles. It exists as a reviewable room builder that can be connected only
// after design, evidence, rights and performance review.
//
// Design reference: world/konam/prototypes/athlete-lionel-sanders-beast-cave-v1.json
// Philosophy: calm Kona.m shell, alive room; the trainer is the hero; Kona stays
// visible as the destination. Avoid generic cyberpunk fitness aesthetics.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const BEAST_CAVE_BOUNDS = Object.freeze({
  x0: -14, x1: 14,
  z0: 11, z1: -11,
  h: 5.6,
});

export const BEAST_CAVE_ENTRY = Object.freeze({
  wall: 'west',
  z0: 1.8,
  z1: -1.8,
  h: 3.7,
});

export const BEAST_CAVE_ZONES = Object.freeze([
  { id: 'threshold', label: 'The Threshold', x: -11.5, z: 0, r: 3.0 },
  { id: 'trainer', label: 'The Machine', x: -2.5, z: -2.0, r: 4.8 },
  { id: 'data-wall', label: 'The Science Lab', x: 2.0, z: -8.7, r: 4.0 },
  { id: 'heat', label: 'Heat Protocol', x: 9.5, z: -3.5, r: 3.3 },
  { id: 'gear', label: 'Gear Wall', x: 9.5, z: 5.5, r: 3.8 },
  { id: 'recovery', label: 'Reset', x: 2.5, z: 7.0, r: 4.0 },
  { id: 'kona-horizon', label: 'Kona Horizon', x: -7.5, z: 7.0, r: 4.2 },
]);

const C = Object.freeze({
  basalt: '#171717',
  basalt2: '#22201e',
  concrete: '#35312e',
  rubber: '#111111',
  steel: '#242424',
  warm: '#f3e7d7',
  paper: '#e8dfd1',
  lava: '#ff6a2a',
  ember: '#d84a1b',
  screen: '#86aee8',
  shadow: '#080808',
});

const at = (o, x, y, z) => {
  o.position.set(x, y, z);
  return o;
};

const mat = (color, roughness = .8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  paint(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function textPanel({
  width = 3,
  height = 1.5,
  bg = '#111111',
  fg = '#f1eadf',
  accent = C.lava,
  lines = [],
  kicker = '',
  footer = '',
}) {
  const tex = canvasTexture(1400, 800, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const vignette = g.createLinearGradient(0, 0, w, h);
    vignette.addColorStop(0, 'rgba(255,255,255,.03)');
    vignette.addColorStop(1, 'rgba(0,0,0,.30)');
    g.fillStyle = vignette;
    g.fillRect(0, 0, w, h);
    g.fillStyle = accent;
    g.fillRect(80, 74, 86, 8);
    if (kicker) {
      g.fillStyle = '#b7afa5';
      g.font = '500 28px Arial';
      g.letterSpacing = '5px';
      g.fillText(kicker.toUpperCase(), 80, 135);
    }
    g.fillStyle = fg;
    g.font = '700 72px Arial';
    let y = 235;
    for (const line of lines) {
      g.fillText(line, 80, y);
      y += 92;
    }
    if (footer) {
      g.fillStyle = '#a99f94';
      g.font = 'italic 36px Georgia';
      g.fillText(footer, 80, h - 80);
    }
  });
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
}

function makeSign(text, w = 1.8, h = .55, accent = C.paper) {
  const tex = canvasTexture(1024, 320, (g, W, H) => {
    g.fillStyle = '#151515';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#4b4843';
    g.lineWidth = 2;
    g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = accent;
    g.font = '600 54px Arial';
    g.letterSpacing = '8px';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text.toUpperCase(), W / 2, H / 2);
  });
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
}

function box(group, name, size, pos, material, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  m.name = name;
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function cylinder(group, name, radius, depth, pos, material, rot = [0, 0, 0], segments = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material);
  m.name = name;
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function addObstacle(obstacles, x, z, r) {
  obstacles?.push?.({ c: new THREE.Vector3(x, 0, z), r });
}

function addPickable(pickables, object, hotspot, label) {
  object.traverse(o => {
    if (!o.isMesh) return;
    o.userData.beastCave = { hotspot, label };
    pickables?.push?.(o);
  });
}

function buildShell(group, lite) {
  const B = BEAST_CAVE_BOUNDS;
  const width = B.x1 - B.x0;
  const depth = B.z0 - B.z1;
  const floorM = new THREE.MeshStandardMaterial({
    color: C.rubber,
    roughness: .92,
    metalness: .02,
  });
  const floor = box(group, 'BEAST_FLOOR', [width, .18, depth], [0, -.09, 0], floorM);
  floor.userData.floor = true;

  const wallM = mat(C.concrete, .94, .02);
  const rockM = mat(C.basalt2, 1, 0);
  const ceilingM = mat('#171614', .93, .02);

  // South / north.
  box(group, 'BEAST_WALL_N', [width, B.h, .32], [0, B.h / 2, B.z0 + .16], wallM);
  box(group, 'BEAST_WALL_S', [width, B.h, .32], [0, B.h / 2, B.z1 - .16], wallM);

  // East wall.
  box(group, 'BEAST_WALL_E', [.32, B.h, depth], [B.x1 + .16, B.h / 2, 0], wallM);

  // West wall with a wide portal.
  const d = BEAST_CAVE_ENTRY;
  const northSpan = B.z0 - d.z0;
  const southSpan = d.z1 - B.z1;
  box(group, 'BEAST_WALL_W_N', [.45, B.h, northSpan], [B.x0 - .22, B.h / 2, (B.z0 + d.z0) / 2], rockM);
  box(group, 'BEAST_WALL_W_S', [.45, B.h, southSpan], [B.x0 - .22, B.h / 2, (d.z1 + B.z1) / 2], rockM);
  box(group, 'BEAST_PORTAL_LINTEL', [.55, B.h - d.h, d.z0 - d.z1], [B.x0 - .25, d.h + (B.h - d.h) / 2, 0], rockM);

  // Ceiling, with three shallow recessed coffers to create the mockup's cave-studio rhythm.
  box(group, 'BEAST_CEILING', [width, .20, depth], [0, B.h + .10, 0], ceilingM);
  for (const x of [-7.5, 0, 7.5]) {
    const coffer = box(group, 'BEAST_CEILING_COVE', [6.4, .06, 7.2], [x, B.h - .05, 0], mat('#0d0d0d', .7));
    coffer.material.emissive = new THREE.Color(lite ? '#130a06' : '#2a1005');
    coffer.material.emissiveIntensity = lite ? .08 : .28;
  }

  // Thin lava light, never full-room red wash.
  const coveM = new THREE.MeshBasicMaterial({
    color: C.lava,
    transparent: true,
    opacity: lite ? .33 : .70,
    toneMapped: false,
  });
  for (const z of [B.z0 - .02, B.z1 + .02]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(width - 2.4, .055), coveM);
    strip.position.set(0, B.h - .28, z);
    strip.rotation.y = z > 0 ? Math.PI : 0;
    group.add(strip);
  }

  // Main ambient treatment.
  group.add(new THREE.HemisphereLight('#b9c0c8', '#100c09', lite ? .55 : .68));
  const warm = new THREE.DirectionalLight('#ffe0bd', lite ? .65 : .95);
  warm.position.set(-4, 6, 8);
  group.add(warm);

  return { floorM, wallM, rockM, ceilingM };
}

function buildThreshold(group, obstacles) {
  const rock = mat('#211f1d', .98);
  const steel = mat('#222222', .5, .4);
  const panel = textPanel({
    width: 4.3,
    height: 2.2,
    kicker: 'LIONEL SANDERS × ZWIFT',
    lines: ['BEAST', 'CAVE'],
    footer: 'Zwift is the companion. Kona is the destination.',
  });
  panel.position.set(-13.72, 2.9, -4.6);
  panel.rotation.y = Math.PI / 2;
  group.add(panel);

  // Rough portal ribs.
  for (let i = 0; i < 8; i++) {
    const y = .45 + i * .55;
    box(group, 'PORTAL_RIB', [.15 + (i % 2) * .06, .18, 4.8], [-13.76, y, 0], i % 2 ? steel : rock);
  }
  const matDoor = box(group, 'GOOD_SUFFERING_MAT', [2.8, .03, 1.2], [-12.1, .025, 0], mat('#171717', 1));
  const sign = makeSign('GOOD SUFFERING', 2.2, .46, C.paper);
  sign.rotation.x = -Math.PI / 2;
  sign.position.set(-12.1, .05, 0);
  group.add(sign);
  addObstacle(obstacles, matDoor.position.x, matDoor.position.z, .8);
}

function buildTrainer(group, obstacles, pickables, lite) {
  const dark = mat('#121212', .45, .15);
  const carbon = mat('#101010', .25, .55);
  const metal = mat('#383838', .30, .75);
  const towel = mat('#d7d0c4', .95);
  const orange = new THREE.MeshStandardMaterial({
    color: '#2b160b',
    roughness: .55,
    emissive: new THREE.Color(C.lava),
    emissiveIntensity: lite ? .18 : .6,
  });

  // Trainer mat.
  box(group, 'TRAINER_MAT', [6.6, .04, 3.0], [-2.5, .02, -2.0], mat('#0c0c0c', 1));
  const floorWord = makeSign('KONA', 2.2, .58, '#9d9387');
  floorWord.rotation.x = -Math.PI / 2;
  floorWord.position.set(-2.5, .05, -.65);
  group.add(floorWord);

  // Simplified aerodynamic bike silhouette: enough to compose the room before an
  // exact sourced GLB is attached.
  const bike = new THREE.Group();
  bike.name = 'BEAST_BIKE_PROXY';
  bike.position.set(-2.5, .72, -2.0);
  bike.rotation.y = Math.PI / 2;
  group.add(bike);

  const wheelGeo = new THREE.TorusGeometry(.67, .045, 12, 48);
  for (const z of [-1.05, 1.05]) {
    const w = new THREE.Mesh(wheelGeo, carbon);
    w.rotation.y = Math.PI / 2;
    w.position.z = z;
    w.castShadow = true;
    bike.add(w);
  }
  // Frame.
  const tube = (a, b, radius = .055, material = carbon) => {
    const d = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 12), material);
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    m.castShadow = true;
    bike.add(m);
    return m;
  };
  const A = new THREE.Vector3(0, .05, -1.02);
  const B = new THREE.Vector3(0, .05, .98);
  const BB = new THREE.Vector3(0, .08, .02);
  const seat = new THREE.Vector3(0, 1.05, .44);
  const head = new THREE.Vector3(0, .83, -.58);
  tube(A, BB, .065);
  tube(BB, B, .065);
  tube(BB, seat, .078);
  tube(seat, head, .06);
  tube(head, BB, .065);
  tube(head, A, .05);
  tube(seat, B, .05);
  tube(new THREE.Vector3(0, .88, -.62), new THREE.Vector3(0, .90, -1.25), .035, metal);
  box(bike, 'BIKE_SADDLE', [.12, .08, .38], [0, 1.16, .55], dark, [0, 0, -.12]);

  // Smart trainer base.
  const trainer = new THREE.Group();
  trainer.name = 'SMART_TRAINER_PROXY';
  trainer.position.set(-2.5, .25, -2.0);
  group.add(trainer);
  box(trainer, 'TRAINER_BASE', [1.45, .12, .50], [0, 0, .90], metal);
  cylinder(trainer, 'TRAINER_FLYWHEEL', .48, .22, [0, .35, .92], dark, [Math.PI / 2, 0, 0], 40);
  box(trainer, 'TRAINER_ACCENT', [.03, .26, .72], [.13, .35, .92], orange);

  // Aerobar towel.
  box(group, 'TRAINER_TOWEL', [.50, .018, .88], [-1.25, 1.52, -2.0], towel, [0, .05, .10]);

  // Bottles.
  for (const [i, z] of [-.75, .02, .75].entries()) {
    const b = cylinder(group, 'BOTTLE', .09, .54, [-.7, .28, -3.65 + z], i === 1 ? mat('#ded7ca', .6) : dark, [0, 0, 0], 20);
    addPickable(pickables, b, 'zwift-console', 'Training bottle');
  }

  // Low desk.
  box(group, 'TRAINING_DESK_TOP', [2.5, .10, .68], [1.4, 1.16, -3.35], mat('#262421', .70, .18));
  box(group, 'TRAINING_DESK_L', [.09, 1.15, .62], [.32, .58, -3.35], metal);
  box(group, 'TRAINING_DESK_R', [.09, 1.15, .62], [2.48, .58, -3.35], metal);

  addObstacle(obstacles, -2.5, -2.0, 1.6);
  addObstacle(obstacles, 1.4, -3.35, 1.2);
  addPickable(pickables, bike, 'speedmax', 'Triathlon bike');
  addPickable(pickables, trainer, 'zwift-console', 'Indoor trainer');
}

function buildDataWall(group, pickables, lite) {
  const screenTex = canvasTexture(1600, 900, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#18304e');
    grd.addColorStop(.48, '#46688d');
    grd.addColorStop(.55, '#a77a48');
    grd.addColorStop(1, '#132132');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);

    // Stylised road-to-volcano view, intentionally not a copied Zwift screenshot.
    g.fillStyle = '#0f1c16';
    g.beginPath();
    g.moveTo(0, h * .56);
    g.lineTo(w * .21, h * .30);
    g.lineTo(w * .36, h * .58);
    g.lineTo(w * .52, h * .22);
    g.lineTo(w * .70, h * .56);
    g.lineTo(w, h * .42);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();

    g.fillStyle = '#4f4f52';
    g.beginPath();
    g.moveTo(w * .38, h);
    g.lineTo(w * .49, h * .58);
    g.lineTo(w * .57, h * .58);
    g.lineTo(w * .70, h);
    g.closePath();
    g.fill();

    g.strokeStyle = '#f1df9a';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(w * .535, h);
    g.lineTo(w * .525, h * .62);
    g.stroke();

    g.fillStyle = 'rgba(4,7,10,.70)';
    g.fillRect(38, 38, 320, 278);
    g.fillStyle = '#ffffff';
    g.font = '700 74px Arial';
    g.fillText('312 W', 72, 125);
    g.font = '500 46px Arial';
    g.fillText('142 BPM', 72, 194);
    g.fillText('01:12:06', 72, 262);

    g.fillStyle = C.lava;
    g.font = '800 54px Arial';
    g.textAlign = 'right';
    g.fillText('FLOW', w - 55, 90);
  });

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(7.7, 4.25),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  screen.position.set(1.6, 3.0, -10.78);
  group.add(screen);
  addPickable(pickables, screen, 'zwift-console', 'Training screen');

  const board = textPanel({
    width: 3.1,
    height: 2.25,
    bg: '#111111',
    fg: '#ddd3c5',
    kicker: 'THE WORK',
    lines: ['SHOW UP.', 'DO THE WORK.', 'REPEAT.'],
    footer: 'Controlled. Measurable. Repeatable.',
  });
  board.position.set(7.6, 2.7, -10.76);
  group.add(board);
  addPickable(pickables, board, 'workout-board', 'Workout board');

  // Screen spill, kept cheap.
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(7.0, 4.2),
    new THREE.MeshBasicMaterial({
      color: C.screen,
      transparent: true,
      opacity: lite ? .025 : .065,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(1.5, .025, -6.8);
  group.add(spill);
}

function buildHeatZone(group, obstacles, pickables, lite) {
  const dark = mat('#151515', .55, .35);
  const bladeM = mat('#2f2f2f', .52, .35);

  for (let j = 0; j < 2; j++) {
    const fan = new THREE.Group();
    fan.name = 'COOLING_FAN';
    fan.position.set(9.6 + j * 2.15, 1.0, -4.8 + j * .7);
    fan.rotation.y = -Math.PI / 2.5;
    group.add(fan);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(.68, .07, 10, 40), dark);
    fan.add(rim);
    const hub = cylinder(fan, 'FAN_HUB', .12, .20, [0, 0, 0], dark, [Math.PI / 2, 0, 0], 20);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const blade = box(fan, 'FAN_BLADE', [.11, .42, .04], [Math.cos(a) * .25, Math.sin(a) * .25, 0], bladeM, [0, 0, a]);
      blade.position.y += .02;
    }
    box(fan, 'FAN_STAND', [.14, 1.2, .14], [0, -.98, 0], dark);
    box(fan, 'FAN_FOOT', [1.05, .08, .42], [0, -1.55, 0], dark);
    addObstacle(obstacles, fan.position.x, fan.position.z, .8);
    addPickable(pickables, fan, 'fans', 'Cooling fan');
  }

  const sign = textPanel({
    width: 3.6,
    height: 2.0,
    kicker: 'HEAT PROTOCOL',
    lines: ['CONTROL', 'THE VARIABLES'],
    footer: 'Heat, airflow, hydration, repeatability.',
  });
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(13.82, 2.7, -4.2);
  group.add(sign);

  // Warm floor pool.
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 48),
    new THREE.MeshBasicMaterial({
      color: C.lava,
      transparent: true,
      opacity: lite ? .025 : .07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(9.7, .015, -3.4);
  group.add(glow);
}

function buildGearWall(group, obstacles, pickables) {
  const cabinet = mat('#242220', .82, .12);
  const dark = mat('#111111', .50, .28);
  const textile = mat('#d7d0c4', .95);
  const metal = mat('#8e8171', .35, .55);

  box(group, 'GEAR_CABINET', [6.4, 2.1, .66], [10.35, 1.05, 8.95], cabinet);
  for (let i = 0; i < 4; i++) box(group, 'GEAR_SHELF', [6.2, .06, .62], [10.35, .42 + i * .48, 8.60], dark);

  // Helmet proxy.
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(.42, 24, 14, 0, Math.PI * 2, 0, Math.PI * .55),
    dark
  );
  helmet.name = 'HELMET_PROXY';
  helmet.scale.set(1.15, .7, 1);
  helmet.position.set(8.4, 1.85, 8.35);
  group.add(helmet);

  // Shoes.
  for (let i = 0; i < 2; i++) {
    const shoe = box(group, 'CYCLING_SHOE_PROXY', [.72, .22, .24], [9.55 + i * .85, 1.46, 8.35], textile, [0, i ? -.15 : .15, i ? -.03 : .03]);
    shoe.scale.x = 1.2;
  }

  // Medal rail.
  box(group, 'MEDAL_RAIL', [3.4, .06, .08], [11.25, 3.55, 8.65], dark);
  for (let i = 0; i < 6; i++) {
    box(group, 'MEDAL_RIBBON', [.035, 1.0, .035], [9.95 + i * .52, 3.02, 8.58], i % 2 ? mat('#6f4b34', .9) : mat('#262626', .9));
    const medal = cylinder(group, 'MEDAL', .18, .04, [9.95 + i * .52, 2.48, 8.56], metal, [Math.PI / 2, 0, 0], 30);
    addPickable(pickables, medal, 'gear-wall', 'Race medal');
  }

  const kit = makeSign('SWIM  BIKE  RUN  REPEAT', 4.4, .78, '#d7d0c4');
  kit.position.set(9.8, 4.55, 8.69);
  group.add(kit);

  addObstacle(obstacles, 10.35, 8.2, 2.8);
  addPickable(pickables, helmet, 'gear-wall', 'Helmet');
}

function buildRecovery(group, obstacles, pickables) {
  const sofa = mat('#26221f', .96);
  const textile = mat('#5d5147', .98);
  const black = mat('#111111', .82);

  box(group, 'RECOVERY_SOFA_BASE', [4.4, .46, 1.6], [2.2, .32, 8.35], sofa);
  box(group, 'RECOVERY_SOFA_BACK', [4.4, 1.25, .34], [2.2, .95, 9.02], sofa, [-.08, 0, 0]);
  for (const x of [.7, 2.2, 3.7]) box(group, 'RECOVERY_CUSHION', [1.20, .32, 1.18], [x, .67, 8.2], textile);

  const matRoll = box(group, 'RECOVERY_MAT', [2.9, .035, 1.05], [5.25, .03, 6.1], black);
  const roller = cylinder(group, 'FOAM_ROLLER', .18, .80, [5.8, .22, 6.05], black, [0, 0, Math.PI / 2], 24);
  const dumb = new THREE.Group();
  dumb.position.set(4.65, .21, 5.55);
  group.add(dumb);
  cylinder(dumb, 'DUMBBELL_BAR', .05, .65, [0, 0, 0], mat('#333333', .35, .7), [0, 0, Math.PI / 2], 16);
  for (const x of [-.35, .35]) cylinder(dumb, 'DUMBBELL_PLATE', .18, .12, [x, 0, 0], black, [0, 0, Math.PI / 2], 18);

  addObstacle(obstacles, 2.2, 8.35, 2.4);
  addPickable(pickables, roller, 'gear-wall', 'Recovery tools');
  addPickable(pickables, matRoll, 'gear-wall', 'Recovery mat');
}

function buildKonaHorizon(group, pickables) {
  const tex = canvasTexture(1600, 900, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#654a47');
    sky.addColorStop(.38, '#d28d65');
    sky.addColorStop(.60, '#3c4e57');
    sky.addColorStop(1, '#0b1114');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    // Lava coast silhouettes.
    g.fillStyle = '#11100f';
    g.beginPath();
    g.moveTo(0, h * .68);
    for (let x = 0; x <= w; x += 90) {
      const y = h * (.66 + .045 * Math.sin(x / 135) + .025 * Math.sin(x / 61));
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();

    // Ocean.
    g.fillStyle = 'rgba(18,38,48,.72)';
    g.fillRect(0, h * .54, w, h * .16);

    const sun = g.createRadialGradient(w * .72, h * .37, 0, w * .72, h * .37, 92);
    sun.addColorStop(0, '#fff4d2');
    sun.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, w, h);

    g.fillStyle = '#efe5d7';
    g.font = '700 60px Arial';
    g.letterSpacing = '8px';
    g.fillText('KONA', 90, 120);
    g.font = 'italic 46px Georgia';
    g.fillText('always in the room.', 90, 184);
  });
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(6.7, 3.7),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  panel.position.set(-7.4, 2.55, 10.79);
  panel.rotation.y = Math.PI;
  group.add(panel);
  addPickable(pickables, panel, 'kona-window', 'Kona horizon');

  const bench = box(group, 'KONA_HORIZON_BENCH', [4.5, .42, .92], [-7.4, .35, 8.9], mat('#2c2926', .88));
  addPickable(pickables, bench, 'kona-window', 'Kona bench');
}

function buildRoomLabels(group) {
  const labels = [
    ['THE MACHINE', -5.2, .7, -4.3, 0],
    ['SCIENCE LAB', 5.8, .7, -9.95, 0],
    ['HEAT', 13.75, .7, -1.0, -Math.PI / 2],
    ['GEAR', 13.75, .7, 6.5, -Math.PI / 2],
    ['RESET', 2.5, .7, 10.72, Math.PI],
    ['KONA HORIZON', -7.4, .7, 10.72, Math.PI],
  ];
  for (const [txt, x, y, z, ry] of labels) {
    const s = makeSign(txt, 1.6, .38, '#8f877d');
    s.position.set(x, y, z);
    s.rotation.y = ry;
    group.add(s);
  }
}

function mergeRepeatedFloorProps(group) {
  // Small weighted blocks create visual training texture without dozens of draw calls.
  const geos = [];
  for (const [x, z, sx, sy, sz] of [
    [7.2, 5.2, .34, .34, .34],
    [7.8, 5.0, .28, .28, .28],
    [8.2, 5.7, .24, .24, .24],
    [-.2, 5.6, .28, .28, .28],
  ]) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(x, sy / 2, z);
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  const mesh = new THREE.Mesh(merged, mat('#1b1b1b', .78, .1));
  mesh.name = 'BEAST_SMALL_PROPS_MERGED';
  mesh.castShadow = true;
  group.add(mesh);
  geos.forEach(g => g.dispose());
}

/**
 * Build the large, explorable Beast Cave.
 *
 * @param {object} ctx
 * @param {THREE.Scene|THREE.Group} ctx.scene
 * @param {boolean} [ctx.lite=false] reduce expensive visual treatment
 * @param {Array} [ctx.pickables=[]]
 * @param {Array} [ctx.obstacles=[]]
 * @returns {{group:THREE.Group,bounds:object,walkable:Function,zones:Array,overview:{position:THREE.Vector3,target:THREE.Vector3}}}
 */
export function buildBeastCave({
  scene,
  lite = false,
  pickables = [],
  obstacles = [],
} = {}) {
  if (!scene) throw new Error('buildBeastCave requires a THREE scene/group');

  const group = new THREE.Group();
  group.name = 'athlete-lionel-sanders-beast-cave';
  group.userData.prototypeOnly = true;
  group.userData.publicNavigation = false;
  scene.add(group);

  buildShell(group, lite);
  buildThreshold(group, obstacles);
  buildTrainer(group, obstacles, pickables, lite);
  buildDataWall(group, pickables, lite);
  buildHeatZone(group, obstacles, pickables, lite);
  buildGearWall(group, obstacles, pickables);
  buildRecovery(group, obstacles, pickables);
  buildKonaHorizon(group, pickables);
  buildRoomLabels(group);
  mergeRepeatedFloorProps(group);

  const B = BEAST_CAVE_BOUNDS;
  const walkable = (x, z) =>
    x > B.x0 + .65 &&
    x < B.x1 - .65 &&
    z < B.z0 - .65 &&
    z > B.z1 + .65;

  return {
    group,
    bounds: B,
    entry: BEAST_CAVE_ENTRY,
    zones: BEAST_CAVE_ZONES,
    walkable,
    overview: {
      position: new THREE.Vector3(-11.7, 3.1, 8.8),
      target: new THREE.Vector3(-.8, 1.25, -.8),
    },
    hero: {
      position: new THREE.Vector3(-7.2, 2.25, 1.7),
      target: new THREE.Vector3(-2.0, 1.2, -2.2),
    },
  };
}

/**
 * Optional authored-bike hook. Deliberately separate from buildBeastCave so the room
 * stays inspectable without pulling a GLB into startup. Call only after explicit 3D entry.
 */
export async function attachBeastCaveBike(built, loader, glbPath) {
  if (!built?.group || !loader || !glbPath) return null;
  const gltf = await loader.loadAsync(glbPath);
  const root = gltf.scene;
  root.name = 'BEAST_AUTHORED_BIKE';
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData.beastCave = { hotspot: 'speedmax', label: 'Triathlon bike' };
    }
  });
  const box3 = new THREE.Box3().setFromObject(root);
  const size = box3.getSize(new THREE.Vector3());
  const scale = 2.2 / Math.max(size.x, size.y, size.z, .001);
  root.scale.setScalar(scale);
  const b2 = new THREE.Box3().setFromObject(root);
  root.position.set(-2.5 - b2.getCenter(new THREE.Vector3()).x, .12 - b2.min.y, -2.0);
  root.rotation.y = Math.PI / 2;
  built.group.add(root);
  const proxy = built.group.getObjectByName('BEAST_BIKE_PROXY');
  if (proxy) proxy.visible = false;
  return root;
}

export function disposeBeastCave(built) {
  const group = built?.group;
  if (!group) return;
  group.traverse(o => {
    if (!o.isMesh) return;
    o.geometry?.dispose?.();
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of materials) {
      if (!m) continue;
      for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap']) {
        m[key]?.dispose?.();
      }
      m.dispose?.();
    }
  });
  group.removeFromParent();
}
