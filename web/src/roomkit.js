// roomkit.js — painted surfaces and small living things for the upper-floor theme rooms.
// Everything is drawn on canvases at load (no image downloads) and seeded, so a room
// looks the same on every visit and on every device.
import * as THREE from 'three';

export function rng(seed = 1) {                                     // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function canvas(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}
function toTex(c, repeat = [1, 1], color = true) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4;
  return t;
}
function speckle(g, s, r, alpha = .08, n = 2400) {
  for (let i = 0; i < n; i++) {
    const v = r() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
  }
}

// Roots: branching random walks that glow in the vein colour (Bio floor and walls).
export function rootTex(base, vein, seed = 3, repeat = [1, 1], glow = 1) {
  const r = rng(seed);
  return toTex(canvas(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s); speckle(g, s, r, .1);
    g.lineCap = 'round'; g.shadowColor = vein;
    const walk = (x, y, a, w, n) => {
      g.lineWidth = w; g.strokeStyle = vein; g.globalAlpha = .25 + .45 * glow * (w / 5); g.shadowBlur = 10 * glow;
      g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < n; i++) {
        a += (r() - .5) * .7; x += Math.cos(a) * 9; y += Math.sin(a) * 9;
        for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) if (!dx && !dy) g.lineTo(x, y);
        if (w > 1.2 && r() < .07) { g.stroke(); walk(x, y, a + (r() < .5 ? -1 : 1) * (.6 + r() * .6), w * .62, n * .6 | 0); g.lineWidth = w; g.globalAlpha = .25 + .45 * glow * (w / 5); g.beginPath(); g.moveTo(x, y); }
      }
      g.stroke();
    };
    for (let k = 0; k < 7; k++) walk(r() * s, r() * s, r() * 6.28, 4 + r() * 2.5, 60);
    g.globalAlpha = 1; g.shadowBlur = 0;
  }), repeat);
}

// Cracked tile or slab, optionally with moss in the cracks (Horror floor, Zombie yard).
export function crackTex(base, crack, seed = 5, repeat = [1, 1], tiles = 4, moss = null) {
  const r = rng(seed);
  return toTex(canvas(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    const step = s / tiles;
    for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
      const l = (r() - .5) * 18; g.fillStyle = `rgba(${l > 0 ? 255 : 0},${l > 0 ? 255 : 0},${l > 0 ? 255 : 0},${Math.abs(l) / 180})`;
      g.fillRect(i * step + 2, j * step + 2, step - 4, step - 4);
    }
    speckle(g, s, r, .12, 3200);
    g.strokeStyle = crack; g.globalAlpha = .9; g.lineWidth = 3;
    for (let i = 0; i <= tiles; i++) { g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, s); g.moveTo(0, i * step); g.lineTo(s, i * step); g.stroke(); }
    for (let k = 0; k < 9; k++) {
      let x = r() * s, y = r() * s, a = r() * 6.28; g.lineWidth = 1 + r() * 1.6; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 16; i++) { a += (r() - .5) * 1.2; x += Math.cos(a) * 10; y += Math.sin(a) * 10; g.lineTo(x, y); }
      g.stroke();
    }
    if (moss) {
      g.fillStyle = moss;
      for (let k = 0; k < 500; k++) { const i = r() * (tiles + 1) | 0, along = r() * s, side = r() < .5; g.globalAlpha = .25 + r() * .4; g.beginPath(); g.arc(side ? i * step + (r() - .5) * 8 : along, side ? along : i * step + (r() - .5) * 8, 1 + r() * 3.5, 0, 6.28); g.fill(); }
    }
    g.globalAlpha = 1;
  }), repeat);
}

// Stained plaster: water runs, scuffs and a patch of tally marks (Horror walls).
export function plasterTex(base, stain, seed = 7, repeat = [1, 1]) {
  const r = rng(seed);
  return toTex(canvas(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s); speckle(g, s, r, .14, 4000);
    for (let k = 0; k < 26; k++) {                                   // runs from the ceiling
      const x = r() * s, len = 60 + r() * 360, w = 2 + r() * 9;
      const grd = g.createLinearGradient(0, 0, 0, len); grd.addColorStop(0, stain); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = .18 + r() * .3; g.fillStyle = grd; g.fillRect(x, 0, w, len);
    }
    g.globalAlpha = .5; g.strokeStyle = '#000'; g.lineWidth = 1;
    for (let k = 0; k < 40; k++) { const x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 60, y + (r() - .5) * 20); g.stroke(); }
    g.globalAlpha = 1;
  }), repeat);
}

// A scrawl for the far wall of the passage: tally marks and handprints, nothing legible.
export function scrawlTex(ink = '#5a0c12', seed = 11) {
  const r = rng(seed);
  const t = toTex(canvas(512, (g, s) => {
    g.clearRect(0, 0, s, s); g.strokeStyle = ink; g.lineCap = 'round';
    for (let row = 0; row < 5; row++) for (let grp = 0; grp < 5 - (row % 2); grp++) {
      const x0 = 40 + grp * 92 + (r() - .5) * 14, y0 = 40 + row * 70 + (r() - .5) * 10;
      g.lineWidth = 4 + r() * 2; g.globalAlpha = .55 + r() * .35;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x0 + i * 13, y0 + r() * 5); g.lineTo(x0 + i * 13 + (r() - .5) * 6, y0 + 46); g.stroke(); }
      g.beginPath(); g.moveTo(x0 - 6, y0 + 38); g.lineTo(x0 + 52, y0 + 6); g.stroke();
    }
    g.fillStyle = ink;
    for (let h = 0; h < 3; h++) {                                     // palms, dragged down
      const x = 90 + h * 150 + r() * 30, y = 390 + r() * 40; g.globalAlpha = .5;
      g.beginPath(); g.ellipse(x, y, 26, 30, 0, 0, 6.28); g.fill();
      for (let f = 0; f < 5; f++) { const a = -2.4 + f * .42; g.beginPath(); g.ellipse(x + Math.cos(a) * 42, y + Math.sin(a) * 42, 7, 17, a + 1.57, 0, 6.28); g.fill(); }
      g.globalAlpha = .25; g.fillRect(x - 20, y + 20, 40, 60 + r() * 40);
    }
    g.globalAlpha = 1;
  }), [1, 1]);
  return t;
}

// Hex deck with a lit seam (Alien floor), and panel lines for its walls.
export function hexTex(base, line, repeat = [1, 1]) {
  return toTex(canvas(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    const R = s / 8, h = Math.sqrt(3) * R / 2;
    g.strokeStyle = line; g.shadowColor = line; g.shadowBlur = 6; g.lineWidth = 2; g.globalAlpha = .75;
    for (let row = -1; row < 10; row++) for (let col = -1; col < 7; col++) {
      const cx = col * R * 1.5, cy = row * h * 2 + (col % 2 ? h : 0);
      g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3; g.lineTo(cx + Math.cos(a) * R * .96, cy + Math.sin(a) * R * .96); } g.stroke();
    }
    g.globalAlpha = 1; g.shadowBlur = 0;
  }), repeat);
}
export function panelTex(base, line, seed = 13, repeat = [1, 1]) {
  const r = rng(seed);
  return toTex(canvas(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s); speckle(g, s, r, .05);
    g.strokeStyle = line; g.lineWidth = 2;
    for (let k = 0; k < 14; k++) { const x = r() * s, y = r() * s, w = 40 + r() * 160, hh = 30 + r() * 120; g.globalAlpha = .18 + r() * .25; g.strokeRect(x, y, w, hh); }
    g.globalAlpha = .6; for (let k = 0; k < 30; k++) { g.fillStyle = line; g.fillRect(r() * s, r() * s, 3, 3); }
    g.globalAlpha = 1;
  }), repeat);
}
// Glyphs that are not any language: arcs, ticks and rings on a scan grid.
export function glyphTex(ink, seed = 17) {
  const r = rng(seed);
  return toTex(canvas(512, (g, s) => {
    g.clearRect(0, 0, s, s); g.strokeStyle = ink; g.fillStyle = ink; g.shadowColor = ink; g.shadowBlur = 8;
    g.globalAlpha = .25; g.lineWidth = 1; for (let i = 0; i < s; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
    g.globalAlpha = .9; g.lineWidth = 3;
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
      if (r() < .25) continue;
      const x = 40 + col * 66, y = 40 + row * 66; g.beginPath();
      const kind = r() * 4 | 0;
      if (kind === 0) g.arc(x, y, 12 + r() * 10, r() * 6, r() * 6 + 3.5);
      else if (kind === 1) { g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14 * r()); g.lineTo(x, y + 14); }
      else if (kind === 2) { g.arc(x, y, 6, 0, 6.28); g.moveTo(x + 16, y - 12); g.lineTo(x + 16, y + 12); }
      else { g.moveTo(x - 12, y + 12); g.lineTo(x, y - 14); g.lineTo(x + 12, y + 12); }
      g.stroke();
    }
    g.globalAlpha = .7; g.beginPath(); g.arc(s / 2, s / 2, s * .44, 0, 6.28); g.stroke();
    g.globalAlpha = 1;
  }));
}
// Chain-link: a lattice mask for alphaTest (Zombie yard fences).
export function fenceTex(repeat = [1, 1]) {
  const t = toTex(canvas(128, (g, s) => {
    g.clearRect(0, 0, s, s); g.strokeStyle = '#b8b39a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(s, s); g.moveTo(s, 0); g.lineTo(0, s);
    g.moveTo(-s / 2, s / 2); g.lineTo(s / 2, s * 1.5); g.moveTo(s / 2, -s / 2); g.lineTo(s * 1.5, s / 2);
    g.moveTo(s / 2, -s / 2); g.lineTo(-s / 2, s / 2); g.moveTo(s * 1.5, s / 2); g.lineTo(s / 2, s * 1.5); g.stroke();
  }), repeat);
  return t;
}
// Soft cloud blotches for ground mist; tiles seamlessly because each puff is drawn 9 times.
export function mistTex(seed = 19) {
  const r = rng(seed);
  return toTex(canvas(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    for (let k = 0; k < 40; k++) {
      const x = r() * s, y = r() * s, rad = 20 + r() * 60, a = .05 + r() * .12;
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        const grd = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        grd.addColorStop(0, `rgba(255,255,255,${a})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
      }
    }
  }));
}
// A bruised night for the yard ceiling.
export function skyTex(top, seed = 23) {
  const r = rng(seed);
  return toTex(canvas(512, (g, s) => {
    g.fillStyle = top; g.fillRect(0, 0, s, s);
    for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(255,250,220,${.2 + r() * .7})`; const z = r() < .92 ? 1 : 2; g.fillRect(r() * s, r() * s, z, z); }
  }));
}

let DOT = null;
function dot() {
  if (DOT) return DOT;
  DOT = new THREE.CanvasTexture(canvas(64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.35, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }));
  return DOT;
}

// Drifting points in a box: spores, dust in a lamp, stars in a hold, ash. One draw call.
// rise > 0 floats up, < 0 falls. step(t) is cheap (≤ 200 points) and only runs for the room you are in.
export function motes({ n, box, color, size = .04, rise = .08, sway = .12, opacity = .85, seed = 29 }) {
  const r = rng(seed), [x0, x1, y0, y1, z0, z1] = box;
  const pos = new Float32Array(n * 3), s = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { s[i * 4] = r(); s[i * 4 + 1] = r(); s[i * 4 + 2] = r(); s[i * 4 + 3] = .5 + r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: dot(), color, size, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false;
  const step = t => {
    for (let i = 0; i < n; i++) {
      const u = (((s[i * 4 + 2] + t * rise * s[i * 4 + 3] / Math.max(.1, y1 - y0)) % 1) + 1) % 1;
      pos[i * 3] = x0 + s[i * 4] * (x1 - x0) + Math.sin(t * .6 + i * 1.7) * sway;
      pos[i * 3 + 1] = y0 + u * (y1 - y0);
      pos[i * 3 + 2] = z0 + s[i * 4 + 1] * (z1 - z0) + Math.cos(t * .45 + i * 2.3) * sway;
    }
    geo.attributes.position.needsUpdate = true;
  };
  step(0);
  return { points, mat, step };
}
