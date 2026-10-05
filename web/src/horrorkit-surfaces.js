// horrorkit-surfaces.js — seeded, tileable PBR surfaces for rooms that are meant to feel old and wrong.
// Everything is painted on canvases at load (no downloads), identical on every device. A surface is
// { map, bump } (and sometimes a roughness map for wet patches). Tile sizes are in metres so GeoBatch can
// map them at one texel density across every wall, floor and prop in a room.
import * as THREE from 'three';
import { rng } from './roomkit.js';

// ------------------------------------------------------------------ fields
// Tileable value-noise, summed over octaves; the basis of every stain, blotch and patch of mould.
function lattice(cells, r) { const a = new Float32Array(cells * cells); for (let i = 0; i < a.length; i++) a[i] = r(); return a; }
export function fbm(n, seed, base = 4, octs = 4, gain = .5) {
  const r = rng(seed), out = new Float32Array(n * n); let amp = 1, total = 0, cells = base;
  for (let o = 0; o < octs; o++) {
    const L = lattice(cells, r);
    for (let y = 0; y < n; y++) {
      const fy = y / n * cells, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), ya = y0 % cells, yb = (y0 + 1) % cells;
      for (let x = 0; x < n; x++) {
        const fx = x / n * cells, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), xa = x0 % cells, xb = (x0 + 1) % cells;
        out[y * n + x] += ((L[ya * cells + xa] * (1 - sx) + L[ya * cells + xb] * sx) * (1 - sy) + (L[yb * cells + xa] * (1 - sx) + L[yb * cells + xb] * sx) * sy) * amp;
      }
    }
    total += amp; amp *= gain; cells *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1, Math.max(0, (out[i] / total - .5) * 2.3 + .5));   // octave sums bunch around .5; stretch so thresholds mean something
  return out;
}

// Mottle a painted surface with the field: darken, stain, and (optionally) mould it.
function wear(g, n, field, { dark = .45, stain = null, stainAmt = 0, mold = null, moldAmt = 0, lo = .5 } = {}) {
  const img = g.getImageData(0, 0, n, n), d = img.data;
  for (let i = 0, k = 0; i < field.length; i++, k += 4) {
    const f = field[i], m = 1 - dark * Math.max(0, f - lo) * 1.3;
    d[k] *= m; d[k + 1] *= m; d[k + 2] *= m;
    if (stain) { const s = Math.min(1, Math.max(0, f - .72) * stainAmt * 3); d[k] += (stain[0] - d[k]) * s; d[k + 1] += (stain[1] - d[k + 1]) * s; d[k + 2] += (stain[2] - d[k + 2]) * s; }
    if (mold) { const s = Math.min(1, Math.max(0, .2 - f) * moldAmt * 4); d[k] += (mold[0] - d[k]) * s; d[k + 1] += (mold[1] - d[k + 1]) * s; d[k + 2] += (mold[2] - d[k + 2]) * s; }
  }
  g.putImageData(img, 0, 0);
}
const speck = (g, n, r, count, a = .1, size = 2) => { for (let i = 0; i < count; i++) { const v = r() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${a * r()})`; g.fillRect(r() * n, r() * n, 1 + r() * size, 1 + r() * size); } };
const walk = (g, r, x, y, a, steps, step, jitter = .7, branch = 0, depth = 0) => {
  g.beginPath(); g.moveTo(x, y);
  for (let i = 0; i < steps; i++) { a += (r() - .5) * jitter; x += Math.cos(a) * step; y += Math.sin(a) * step; g.lineTo(x, y); if (branch && depth < 2 && r() < branch) { const sx = x, sy = y, sa = a; g.stroke(); walk(g, r, sx, sy, sa + (r() > .5 ? 1 : -1) * (.5 + r() * .7), steps * .5 | 0, step, jitter, branch, depth + 1); g.beginPath(); g.moveTo(sx, sy); } }
  g.stroke();
};

export function createSurfaces({ canvasTex, size = 1024, seed = 1 }) {
  const n = size, K = n / 1024, cache = new Map();
  const mk = (key, build) => cache.get(key) || (cache.set(key, build()), cache.get(key));
  const tex = (draw, w = n, h = n) => canvasTex(w, h, draw, [1, 1]);
  const bumpOf = (draw, w = n, h = n) => { const t = canvasTex(w, h, draw, [1, 1]); t.colorSpace = THREE.NoColorSpace; return t; };
  const field = (s, base, octs) => fbm(n, seed * 977 + s, base, octs);
  const gray = (g, v) => { g.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; };
  const rgb = (r, gg, b) => `rgb(${r | 0},${gg | 0},${b | 0})`;

  // ---------------------------------------------------------------- floorboards: 2 m tile, 8 boards across
  const floorboards = () => mk('boards', () => {
    const rows = 8, bh = n / rows, plan = [];
    { const r = rng(seed + 11); for (let i = 0; i < rows; i++) { const row = []; let x = -r() * n * .5; while (x < n) { const len = n * (.4 + r() * .55); row.push({ x, len, tone: .7 + r() * .6, knot: r() < .35, tint: r() }); x += len; } plan.push(row); } }
    const paint = H => (g, w, h) => {
      const r = rng(seed + 12);
      g.fillStyle = H ? '#000' : '#070504'; g.fillRect(0, 0, w, h);
      plan.forEach((row, i) => row.forEach(b => {
        for (const ox of [0, -n, n]) {
          const x = b.x + ox, y = i * bh; if (x > n || x + b.len < 0) continue;
          if (H) { gray(g, 150 + (b.tint - .5) * 24); g.fillRect(x + 2 * K, y + 2 * K, b.len - 4 * K, bh - 4 * K); }
          else {
            const gr = g.createLinearGradient(0, y, 0, y + bh), t = b.tone;
            gr.addColorStop(0, rgb(62 * t, 41 * t, 28 * t)); gr.addColorStop(.5, rgb(74 * t, 50 * t, 34 * t)); gr.addColorStop(1, rgb(54 * t, 36 * t, 25 * t));
            g.fillStyle = gr; g.fillRect(x + 2 * K, y + 2 * K, b.len - 4 * K, bh - 4 * K);
          }
          const grain = r; g.lineWidth = Math.max(1, K);
          for (let k = 0; k < 46 * K + 10; k++) {                                     // grain: long, slightly wavy strokes
            const gy = y + 4 * K + grain() * (bh - 8 * K), amp = grain() * 2.2 * K, ph = grain() * 6;
            g.strokeStyle = H ? (grain() < .5 ? `rgba(0,0,0,${.12 + grain() * .12})` : `rgba(255,255,255,${.1 + grain() * .1})`) : `rgba(${grain() < .55 ? 12 : 120},${grain() < .55 ? 8 : 86},${grain() < .55 ? 5 : 60},${.07 + grain() * .16})`;
            g.beginPath(); g.moveTo(x + 3 * K, gy);
            for (let s = 0; s <= 10; s++) g.lineTo(x + 3 * K + (b.len - 6 * K) * s / 10, gy + Math.sin(s * .9 + ph) * amp);
            g.stroke();
          }
          if (b.knot) { const kx = x + b.len * (.2 + grain() * .6), ky = y + bh * (.3 + grain() * .4); for (let q = 4; q > 0; q--) { g.strokeStyle = H ? 'rgba(0,0,0,.5)' : `rgba(20,12,7,${.2 + q * .08})`; g.lineWidth = K * 1.4; g.beginPath(); g.ellipse(kx, ky, q * 7 * K, q * 4 * K, 0, 0, 6.3); g.stroke(); } }
          if (H) { gray(g, 235); for (const nx of [x + 10 * K, x + b.len - 10 * K]) for (const ny of [y + bh * .22, y + bh * .78]) { g.beginPath(); g.arc(nx, ny, 1.8 * K, 0, 6.3); g.fill(); } }   // nail heads
          else { g.fillStyle = 'rgba(160,150,140,.35)'; for (const nx of [x + 10 * K, x + b.len - 10 * K]) for (const ny of [y + bh * .22, y + bh * .78]) { g.beginPath(); g.arc(nx, ny, 1.6 * K, 0, 6.3); g.fill(); } }
        }
      }));
      if (!H) {
        const rr = rng(seed + 13);
        for (let k = 0; k < 5; k++) {                                              // old water stains: a dark body with a tide line
          const x = rr() * n, y = rr() * n, rad = (60 + rr() * 140) * K;
          for (const [dx, dy] of [[0, 0], [-n, 0], [n, 0], [0, -n], [0, n]]) {
            const gr = g.createRadialGradient(x + dx, y + dy, rad * .2, x + dx, y + dy, rad); gr.addColorStop(0, 'rgba(8,5,3,.22)'); gr.addColorStop(.86, 'rgba(10,6,4,.14)'); gr.addColorStop(.93, 'rgba(14,9,5,.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
          }
        }
        wear(g, n, field(1, 5, 4), { dark: .5, stain: [18, 14, 10], stainAmt: .5 });
      }
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- cracked black-and-white marble: 1.2 m tile, 2 × 2 squares
  const marble = () => mk('marble', () => {
    const sq = n / 2, cracks = [];
    { const r = rng(seed + 21); for (let k = 0; k < 7; k++) cracks.push([r() * n, r() * n, r() * 6.3]); }
    const paint = H => (g, w, h) => {
      const r = rng(seed + 22);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const black = (i + j) % 2 === 0, x = i * sq, y = j * sq;
        if (H) { gray(g, black ? 170 : 160); g.fillRect(x, y, sq, sq); }
        else { g.fillStyle = black ? '#101014' : '#c9c1ae'; g.fillRect(x, y, sq, sq); }
        if (!H) {
          g.save(); g.beginPath(); g.rect(x, y, sq, sq); g.clip();
          g.strokeStyle = black ? 'rgba(210,210,220,.2)' : 'rgba(90,86,80,.22)'; g.lineCap = 'round';
          for (let v = 0; v < 8; v++) { g.lineWidth = (.5 + r() * 1.8) * K; walk(g, r, x + r() * sq, y + r() * sq, r() * 6.3, 26, 14 * K, .8, .1); }
          g.restore();
        }
      }
      g.strokeStyle = H ? '#000' : '#0b0a09'; g.lineWidth = 5 * K; g.beginPath(); for (let i = 0; i <= 2; i++) { g.moveTo(i * sq, 0); g.lineTo(i * sq, n); g.moveTo(0, i * sq); g.lineTo(n, i * sq); } g.stroke();
      const cr = rng(seed + 23);
      for (const [x, y, a] of cracks) { g.strokeStyle = H ? 'rgba(0,0,0,.9)' : 'rgba(6,5,4,.9)'; g.lineWidth = (1.2 + cr() * 1.8) * K; walk(g, cr, x, y, a, 30, 12 * K, 1.1, .06); }
      if (!H) { speck(g, n, r, 5000 * K, .1); wear(g, n, field(2, 4, 5), { dark: .6, stain: [30, 26, 22], stainAmt: .6, lo: .4 }); }
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });
  // wet patches: low roughness where the roof has been leaking; used as a roughness map, so grey = roughness multiplier
  const wet = (key, s, coverage = .55) => mk('wet' + key, () => {
    const f = field(s, 3, 4);
    return canvasTex(n / 2, n / 2, (g, w, h) => {
      const img = g.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = f[(y * 2) * n + x * 2], p = Math.min(1, Math.max(0, (v - coverage) * 7));   // 1 inside a puddle
        const val = 255 - p * 215;
        const k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = val; d[k + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, [1, 1]);
  });

  // ---------------------------------------------------------------- wallpaper: 1 m tile
  const motif = (g, cx, cy, s, color) => {
    g.save(); g.translate(cx, cy); g.fillStyle = color;
    for (const sx of [-1, 1]) {
      g.save(); g.scale(sx, 1);
      g.beginPath(); g.moveTo(0, -s * .5); g.bezierCurveTo(s * .35, -s * .44, s * .44, -s * .1, s * .12, s * .06); g.bezierCurveTo(s * .3, s * .2, s * .2, s * .42, 0, s * .5); g.bezierCurveTo(s * .08, s * .3, s * .1, s * .16, 0, s * .06); g.closePath(); g.fill();
      g.beginPath(); g.arc(s * .23, -s * .2, s * .07, 0, 6.3); g.fill();
      g.beginPath(); g.moveTo(s * .08, -s * .3); g.bezierCurveTo(s * .22, -s * .36, s * .26, -s * .3, s * .2, -s * .24); g.lineWidth = s * .03; g.strokeStyle = color; g.stroke();
      g.restore();
    }
    g.beginPath(); g.moveTo(0, -s * .56); g.lineTo(s * .05, -s * .46); g.lineTo(0, -s * .38); g.lineTo(-s * .05, -s * .46); g.closePath(); g.fill();
    g.beginPath(); g.arc(0, 0, s * .045, 0, 6.3); g.fill();
    g.restore();
  };
  const age = (g, n_, r, pal, H, amount = 1) => {
    if (!H) wear(g, n_, field(31, 4, 5), { dark: .5 * amount, stain: pal.stain, stainAmt: .45 * amount, mold: pal.mold || [20, 26, 18], moldAmt: .5 * amount });
    for (let k = 0; k < 22 * amount; k++) {                                         // water runs from the ceiling
      const x = r() * n_, len = (90 + r() * 420) * K, wd = (2 + r() * 10) * K;
      if (H) continue;
      const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, `rgba(${pal.stain[0]},${pal.stain[1]},${pal.stain[2]},${.18 + r() * .3})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(0, r() * n_ * .3); g.fillStyle = gr; g.fillRect(x, 0, wd, len); g.restore();
    }
    for (let k = 0; k < 3 * amount; k++) {                                          // peeled patches: bare plaster, a curl, a shadow
      const cx = r() * n_, cy = r() * n_, rad = (26 + r() * 90) * K, pts = [];
      for (let a = 0; a < 6.3; a += .5) pts.push([cx + Math.cos(a) * rad * (.6 + r() * .6), cy + Math.sin(a) * rad * (.5 + r() * .7)]);
      for (const [ox, oy] of [[0, 0], [-n_, 0], [n_, 0], [0, -n_], [0, n_]]) {
        g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy)); g.closePath();
        if (H) { gray(g, 70); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3 * K; g.stroke(); }
        else { g.fillStyle = pal.plaster; g.globalAlpha = .85; g.fill(); g.globalAlpha = 1; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 8 * K; g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2 * K; g.stroke(); g.shadowBlur = 0; }
      }
    }
  };
  const wallpaper = (key, pal, style) => mk('wp' + key, () => {
    const paint = H => (g, w, h) => {
      const r = rng(seed + 31 + key.length * 7);
      if (H) { gray(g, 118); g.fillRect(0, 0, n, n); } else { g.fillStyle = pal.base; g.fillRect(0, 0, n, n); }
      const ink = H ? 'rgb(168,168,168)' : pal.motif;
      if (style === 'damask') {
        for (const [ox, oy] of [[.5, .5], [0, 0], [1, 0], [0, 1], [1, 1]]) motif(g, ox * n, oy * n, n * .62, ink);
        for (const [ox, oy] of [[.5, 0], [.5, 1], [0, .5], [1, .5]]) { g.fillStyle = ink; g.beginPath(); g.arc(ox * n, oy * n, n * .028, 0, 6.3); g.fill(); }
      } else if (style === 'stripe') {
        for (let i = 0; i < 8; i++) { g.fillStyle = ink; g.fillRect(i * n / 8 + n * .02, 0, n * .045, n); if (!H) { g.fillStyle = pal.accent; g.fillRect(i * n / 8 + n * .075, 0, n * .006, n); } }
      } else if (style === 'nursery') {                                            // faded stencilled animals: ears, round bodies, a moon
        g.fillStyle = ink;
        for (let k = 0; k < 6; k++) { const x = (k % 3 + .5) * n / 3 + (k > 2 ? n / 6 : 0), y = (k < 3 ? .3 : .75) * n, s = n * .075;
          g.beginPath(); g.arc(x, y, s, 0, 6.3); g.fill(); g.beginPath(); g.arc(x - s * .6, y - s * .9, s * .38, 0, 6.3); g.fill(); g.beginPath(); g.arc(x + s * .6, y - s * .9, s * .38, 0, 6.3); g.fill();
          g.fillStyle = H ? 'rgb(118,118,118)' : pal.base; g.beginPath(); g.arc(x - s * .3, y - s * .1, s * .09, 0, 6.3); g.arc(x + s * .3, y - s * .1, s * .09, 0, 6.3); g.fill(); g.fillStyle = ink; }
        g.beginPath(); g.arc(n * .5, n * .52, n * .035, 0, 6.3); g.fill(); g.fillStyle = H ? 'rgb(118,118,118)' : pal.base; g.beginPath(); g.arc(n * .52, n * .51, n * .03, 0, 6.3); g.fill();
      } else {                                                                       // plain: faint linen weave
        g.strokeStyle = ink; g.globalAlpha = .08; for (let i = 0; i < n; i += 4 * K) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, n); g.stroke(); } g.globalAlpha = 1;
      }
      speck(g, n, r, 3000 * K, H ? .08 : .07);
      age(g, n, r, pal, H, pal.age ?? 1);
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- wainscot: 1.2 m tile, two raised panels
  const wainscot = (key = 'dark', c = { frame: [78, 52, 34], panel: [58, 38, 25] }) => mk('wain' + key, () => {
    const paint = H => (g, w, h) => {
      const r = rng(seed + 41);
      if (H) { gray(g, 150); g.fillRect(0, 0, n, n); } else { g.fillStyle = rgb(...c.frame); g.fillRect(0, 0, n, n); }
      const pw = n * .4, ph = n * .72, pad = n * .05;
      for (const x of [n * .07, n * .53]) {
        const y = n * .14;
        if (H) { gray(g, 105); g.fillRect(x, y, pw, ph); const gr = g.createLinearGradient(x, y, x + 22 * K, y); gr.addColorStop(0, 'rgb(90,90,90)'); gr.addColorStop(1, 'rgb(135,135,135)'); g.fillStyle = gr; g.fillRect(x, y, 22 * K, ph); g.fillRect(x + pw - 22 * K, y, 22 * K, ph); g.fillStyle = 'rgb(75,75,75)'; g.fillRect(x, y, pw, 14 * K); g.fillStyle = 'rgb(170,170,170)'; g.fillRect(x, y + ph - 14 * K, pw, 14 * K); }
        else { g.fillStyle = rgb(...c.panel); g.fillRect(x, y, pw, ph); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y, pw, 14 * K); g.fillRect(x, y, 14 * K, ph); g.fillStyle = 'rgba(255,230,200,.07)'; g.fillRect(x, y + ph - 14 * K, pw, 14 * K); g.fillRect(x + pw - 14 * K, y, 14 * K, ph); }
      }
      for (let k = 0; k < 90 * K + 20; k++) { g.strokeStyle = H ? `rgba(${r() < .5 ? 0 : 255},0,0,.12)` : `rgba(${r() < .6 ? 10 : 130},${r() < .6 ? 6 : 96},${r() < .6 ? 4 : 70},${.05 + r() * .12})`; g.lineWidth = K; g.beginPath(); const x = r() * n; g.moveTo(x, 0); g.lineTo(x + (r() - .5) * 18 * K, n); g.stroke(); }
      g.strokeStyle = H ? 'rgba(0,0,0,.9)' : 'rgba(210,190,160,.28)'; g.lineWidth = 1.5 * K;
      for (let k = 0; k < 16; k++) { const x = r() * n, y = r() * n; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 80 * K, y + (r() - .5) * 30 * K); g.stroke(); }   // scuffs
      if (!H) { speck(g, n, r, 2500 * K, .08); wear(g, n, field(41, 4, 5), { dark: .55 }); }
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- plaster ceiling: 3 m tile
  const ceiling = () => mk('ceiling', () => {
    const paint = H => (g, w, h) => {
      const r = rng(seed + 51);
      if (H) { gray(g, 128); g.fillRect(0, 0, n, n); } else { g.fillStyle = '#8f8a80'; g.fillRect(0, 0, n, n); }
      if (!H) {
        for (let k = 0; k < 7; k++) { const x = r() * n, y = r() * n, rad = (90 + r() * 220) * K;      // tide-ringed leaks
          for (let q = 3; q > 0; q--) { g.strokeStyle = `rgba(70,52,30,${.1 + q * .06})`; g.lineWidth = (2 + r() * 4) * K; g.beginPath(); g.ellipse(x, y, rad * q / 3, rad * q / 3 * .8, r(), 0, 6.3); g.stroke(); }
          const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(60,44,26,.5)'); gr.addColorStop(1, 'rgba(60,44,26,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      }
      g.strokeStyle = H ? 'rgba(0,0,0,.8)' : 'rgba(18,14,10,.75)'; g.lineWidth = 1.6 * K;
      for (let k = 0; k < 9; k++) walk(g, r, r() * n, r() * n, r() * 6.3, 40, 11 * K, 1, .08);
      speck(g, n, r, 6000 * K, H ? .1 : .08);
      if (!H) wear(g, n, field(51, 3, 5), { dark: .6, stain: [48, 36, 22], stainAmt: .6, mold: [16, 22, 14], moldAmt: .8 });
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- brick: 1.2 m tile, running bond
  const brick = () => mk('brick', () => {
    const rows = 16, bh = n / rows, bw = n / 5;
    const paint = H => (g, w, h) => {
      const r = rng(seed + 61);
      if (H) { gray(g, 60); g.fillRect(0, 0, n, n); } else { g.fillStyle = '#5c564e'; g.fillRect(0, 0, n, n); }
      for (let j = 0; j < rows; j++) for (let i = -1; i < 5; i++) {
        const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh, t = .7 + r() * .6, miss = r() < .015;
        if (miss) { g.fillStyle = H ? '#000' : '#0a0807'; g.fillRect(x + 3 * K, y + 3 * K, bw - 6 * K, bh - 6 * K); continue; }
        for (const ox of [0, n]) {
          if (H) { gray(g, 150 + r() * 40); g.fillRect(x + 3 * K - ox, y + 3 * K, bw - 6 * K, bh - 6 * K); }
          else { g.fillStyle = rgb(112 * t, 52 * t, 40 * t); g.fillRect(x + 3 * K - ox, y + 3 * K, bw - 6 * K, bh - 6 * K); g.fillStyle = `rgba(0,0,0,${r() * .25})`; g.fillRect(x + 3 * K - ox, y + bh * .6, bw - 6 * K, bh * .35); }
        }
      }
      if (!H) {
        for (let k = 0; k < 40; k++) { const x = r() * n, y = r() * n; g.fillStyle = `rgba(220,215,200,${.08 + r() * .14})`; g.beginPath(); g.ellipse(x, y, (6 + r() * 20) * K, (4 + r() * 10) * K, 0, 0, 6.3); g.fill(); }   // salts
        speck(g, n, r, 6000 * K, .12);
        wear(g, n, field(61, 4, 5), { dark: .7, stain: [14, 12, 10], stainAmt: .7, mold: [18, 30, 18], moldAmt: .5 });
      } else speck(g, n, r, 6000 * K, .15);
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- flagstones: 2 m tile, irregular slabs
  const flagstone = () => mk('flags', () => {
    const slabs = []; { const r = rng(seed + 71); let y = 0; while (y < n - 20) { const hh = Math.min(n - y, n * (.22 + r() * .22)); let x = -r() * n * .3; while (x < n) { const ww = n * (.2 + r() * .3); slabs.push({ x, y, w: ww, h: hh, t: .75 + r() * .5 }); x += ww; } y += hh; } }
    const paint = H => (g, w, h) => {
      const r = rng(seed + 72);
      if (H) { gray(g, 40); g.fillRect(0, 0, n, n); } else { g.fillStyle = '#0a0a09'; g.fillRect(0, 0, n, n); }
      for (const s of slabs) for (const ox of [0, -n, n]) {
        const x = s.x + ox, g2 = 5 * K;
        if (x > n || x + s.w < 0) continue;
        if (H) { gray(g, 150 + (s.t - 1) * 60); g.fillRect(x + g2, s.y + g2, s.w - g2 * 2, s.h - g2 * 2); }
        else {
          const t = s.t, gr = g.createLinearGradient(x, s.y, x + s.w, s.y + s.h); gr.addColorStop(0, rgb(70 * t, 74 * t, 70 * t)); gr.addColorStop(1, rgb(52 * t, 56 * t, 52 * t));
          g.fillStyle = gr; g.fillRect(x + g2, s.y + g2, s.w - g2 * 2, s.h - g2 * 2);
          g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3 * K; g.strokeRect(x + g2, s.y + g2, s.w - g2 * 2, s.h - g2 * 2);
        }
      }
      for (let k = 0; k < 8; k++) { g.strokeStyle = H ? 'rgba(0,0,0,.9)' : 'rgba(0,0,0,.8)'; g.lineWidth = 1.8 * K; walk(g, r, r() * n, r() * n, r() * 6.3, 22, 12 * K, 1, .08); }
      if (!H) { speck(g, n, r, 8000 * K, .12); for (let k = 0; k < 160; k++) { const x = r() * n, y = r() * n; g.fillStyle = `rgba(36,60,34,${.12 + r() * .25})`; g.beginPath(); g.arc(x, y, (2 + r() * 7) * K, 0, 6.3); g.fill(); }
        wear(g, n, field(71, 4, 5), { dark: .6, mold: [24, 40, 22], moldAmt: .6 }); } else speck(g, n, r, 8000 * K, .2);
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- stair / hall runner: 1.1 m wide, repeats along its length
  const runner = () => mk('runner', () => {
    const paint = H => (g, w, h) => {
      const r = rng(seed + 81);
      if (H) { gray(g, 120); g.fillRect(0, 0, n, n); } else { g.fillStyle = '#3d0d16'; g.fillRect(0, 0, n, n); }
      const gold = H ? 'rgb(150,150,150)' : '#a8832f', mid = H ? 'rgb(100,100,100)' : '#26070d';
      g.fillStyle = gold; g.fillRect(n * .06, 0, n * .03, n); g.fillRect(n * .91, 0, n * .03, n); g.fillRect(n * .12, 0, n * .008, n); g.fillRect(n * .872, 0, n * .008, n);
      for (let j = 0; j < 2; j++) { const cy = (j + .5) * n / 2, cx = n / 2; g.fillStyle = mid; g.beginPath(); g.moveTo(cx, cy - n * .21); g.lineTo(cx + n * .27, cy); g.lineTo(cx, cy + n * .21); g.lineTo(cx - n * .27, cy); g.closePath(); g.fill();
        g.strokeStyle = gold; g.lineWidth = 4 * K; g.stroke(); g.fillStyle = gold; g.beginPath(); g.arc(cx, cy, n * .035, 0, 6.3); g.fill(); }
      for (let i = 0; i < n; i += 3) { g.fillStyle = `rgba(0,0,0,${r() * .1})`; g.fillRect(0, i, n, 1); }
      if (!H) { speck(g, n, r, 14000 * K, .1);
        const ctr = g.createLinearGradient(n * .25, 0, n * .75, 0); ctr.addColorStop(0, 'rgba(120,100,80,0)'); ctr.addColorStop(.5, 'rgba(120,100,80,.38)'); ctr.addColorStop(1, 'rgba(120,100,80,0)'); g.fillStyle = ctr; g.fillRect(n * .25, 0, n * .5, n);   // the worn path down the middle
        wear(g, n, field(81, 4, 5), { dark: .7, stain: [14, 6, 6], stainAmt: .6 }); }
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- rust and soot: 1 m tile (boiler, pipes, chains, the stove)
  const rust = () => mk('rust', () => {
    const paint = H => (g, w, h) => {
      const r = rng(seed + 91), f = field(91, 5, 5);
      if (H) { gray(g, 130); g.fillRect(0, 0, n, n); } else { g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, n, n); }
      const img = g.getImageData(0, 0, n, n), d = img.data;
      for (let i = 0, k = 0; i < f.length; i++, k += 4) { const v = f[i], p = Math.min(1, Math.max(0, (v - .46) * 6));
        if (H) { const q = 130 + p * 60 + (r() - .5) * 26; d[k] = d[k + 1] = d[k + 2] = q; }
        else { const o = 28 + p * 110, gg = 28 + p * 54, b = 30 + p * 22; d[k] = o + (r() - .5) * 14; d[k + 1] = gg + (r() - .5) * 10; d[k + 2] = b + (r() - .5) * 8; } }
      g.putImageData(img, 0, 0);
      g.strokeStyle = H ? 'rgba(255,255,255,.4)' : 'rgba(180,170,160,.18)'; g.lineWidth = K;
      for (let k = 0; k < 60; k++) { const x = r() * n, y = r() * n; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 120 * K, y + (r() - .5) * 8 * K); g.stroke(); }
      if (!H) for (let k = 0; k < 24; k++) { const x = r() * n, len = (80 + r() * 300) * K, gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(110,50,20,.45)'); gr.addColorStop(1, 'rgba(110,50,20,0)'); g.save(); g.translate(0, r() * n); g.fillStyle = gr; g.fillRect(x, 0, (2 + r() * 5) * K, len); g.restore(); }
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- dust sheet: grey weave, 0.6 m tile
  const sheet = () => mk('sheet', () => {
    const paint = H => (g, w, h) => {
      const r = rng(seed + 101);
      if (H) { gray(g, 128); g.fillRect(0, 0, n, n); } else { g.fillStyle = '#9d998c'; g.fillRect(0, 0, n, n); }
      g.lineWidth = K;
      for (let i = 0; i < n; i += 4 * K) { g.strokeStyle = H ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i, n); g.stroke(); g.strokeStyle = H ? 'rgba(0,0,0,.2)' : 'rgba(0,0,0,.06)'; g.beginPath(); g.moveTo(0, i); g.lineTo(n, i); g.stroke(); }
      speck(g, n, r, 7000 * K, .1);
      if (!H) wear(g, n, field(101, 4, 5), { dark: .45, stain: [92, 78, 52], stainAmt: .5 });
    };
    return { map: tex(paint(false)), bump: bumpOf(paint(true)) };
  });

  // ---------------------------------------------------------------- portraits: dark oil paintings, craquelured, eyes left for the room to fill
  const PORTRAIT = { w: 384, h: 480, eyeL: [.405, .385], eyeR: [.595, .385], eyeR_: .036 };
  const portrait = i => mk('portrait' + i, () => {
    const W = PORTRAIT.w, Hh = PORTRAIT.h, pal = [
      { bg: ['#17110d', '#2b2118'], coat: '#0d0b0b', skin: '#b8a48e', hair: '#1a110c', collar: '#cfc7b6' },
      { bg: ['#0f1512', '#1f2a24'], coat: '#141a18', skin: '#a8a898', hair: '#6b6258', collar: '#bdb8a6' },
      { bg: ['#1a0f12', '#32191e'], coat: '#210f13', skin: '#c0a692', hair: '#0b0807', collar: '#d5cbb8' },
      { bg: ['#10121a', '#1d2433'], coat: '#0a0c14', skin: '#aeb0a8', hair: '#2c2a2e', collar: '#c4c2b6' },
      { bg: ['#17140e', '#2e281a'], coat: '#1a1610', skin: '#b4a187', hair: '#9a9082', collar: '#c9c1ac' },
      { bg: ['#120d12', '#271a28'], coat: '#0c080c', skin: '#b9a8a0', hair: '#140e10', collar: '#d2c8bc' },
    ][i % 6];
    return canvasTex(W, Hh, (g, w, h) => {
      const r = rng(seed + 111 + i * 13);
      const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, pal.bg[1]); bg.addColorStop(1, pal.bg[0]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = pal.coat; g.beginPath(); g.moveTo(0, h); g.bezierCurveTo(w * .02, h * .72, w * .2, h * .66, w * .36, h * .64); g.lineTo(w * .64, h * .64); g.bezierCurveTo(w * .8, h * .66, w * .98, h * .72, w, h); g.closePath(); g.fill();
      g.fillStyle = pal.skin; g.fillRect(w * .445, h * .5, w * .11, h * .16);                                  // neck, a little too long
      g.fillStyle = pal.collar; g.beginPath(); g.moveTo(w * .36, h * .66); g.lineTo(w * .5, h * .74); g.lineTo(w * .64, h * .66); g.lineTo(w * .58, h * .63); g.lineTo(w * .5, h * .67); g.lineTo(w * .42, h * .63); g.closePath(); g.fill();
      const hairBack = i % 2 ? () => { g.beginPath(); g.ellipse(w * .5, h * .34, w * .22, h * .22, 0, 0, 6.3); g.fill(); } : () => { g.beginPath(); g.ellipse(w * .5, h * .3, w * .2, h * .2, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(w * .5, h * .13, w * .09, h * .06, 0, 0, 6.3); g.fill(); };
      g.fillStyle = pal.hair; hairBack();
      const face = g.createRadialGradient(w * .46, h * .35, w * .02, w * .5, h * .4, w * .28); face.addColorStop(0, pal.skin); face.addColorStop(1, '#201812');
      g.fillStyle = face; g.beginPath(); g.ellipse(w * .5, h * .4, w * .165, h * .185, 0, 0, 6.3); g.fill();
      g.fillStyle = pal.hair; g.beginPath(); g.ellipse(w * .5, h * .27, w * .17, h * .09, 0, Math.PI, 6.3); g.fill();
      for (const [ex, ey] of [PORTRAIT.eyeL, PORTRAIT.eyeR]) {                                                   // sockets and sclera; the room adds the pupils
        g.fillStyle = 'rgba(10,6,4,.7)'; g.beginPath(); g.ellipse(w * ex, h * ey, w * .052, h * .028, 0, 0, 6.3); g.fill();
        g.fillStyle = '#d8d0bc'; g.beginPath(); g.ellipse(w * ex, h * ey, w * .04, h * .017, 0, 0, 6.3); g.fill();
        g.strokeStyle = 'rgba(8,5,3,.9)'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(w * ex, h * ey, w * .042, h * .02, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      }
      g.strokeStyle = 'rgba(30,18,12,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * .5, h * .4); g.lineTo(w * .48, h * .47); g.lineTo(w * .52, h * .475); g.stroke();   // nose
      g.strokeStyle = 'rgba(40,14,12,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * .44, h * .53); g.quadraticCurveTo(w * .5, h * (.525 + (i % 3) * .007), w * .56, h * .53); g.stroke();   // a mouth that has been told to keep still
      const vig = g.createRadialGradient(w * .5, h * .42, w * .2, w * .5, h * .5, w * .85); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = vig; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1;                                                        // craquelure
      for (let k = 0; k < 90; k++) walk(g, r, r() * w, r() * h, r() * 6.3, 5 + r() * 9 | 0, 6, 1.4);
      speck(g, w, r, 1800, .12);
    });
  });

  // ---------------------------------------------------------------- night outside the windows: bare trees, a hill, one lit window far off
  const storm = () => mk('storm', () => canvasTex(Math.max(512, n), Math.max(256, n / 2), (g, w, h) => {
    const r = rng(seed + 121);
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#04050a'); sky.addColorStop(.6, '#101428'); sky.addColorStop(1, '#1a2036'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const cx = w * .68, cy = h * .26, glow = g.createRadialGradient(cx, cy, 6, cx, cy, h * .55); glow.addColorStop(0, 'rgba(220,226,255,.55)'); glow.addColorStop(1, 'rgba(220,226,255,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8def2'; g.beginPath(); g.arc(cx, cy, h * .045, 0, 6.3); g.fill();
    for (let k = 0; k < 16; k++) { g.fillStyle = `rgba(8,10,20,${.35 + r() * .35})`; g.beginPath(); g.ellipse(r() * w, h * (.1 + r() * .35), w * (.1 + r() * .18), h * (.03 + r() * .05), 0, 0, 6.3); g.fill(); }   // clouds crossing the moon
    g.fillStyle = '#05060a'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * .72); for (let x = 0; x <= w; x += 12) g.lineTo(x, h * (.72 - .05 * Math.sin(x / 140) - .03 * Math.sin(x / 47))); g.lineTo(w, h); g.closePath(); g.fill();
    g.fillStyle = '#ffcf7a'; g.fillRect(w * .31, h * .7, 5, 6);                                              // someone is still up over there
    g.strokeStyle = '#020204'; g.lineCap = 'round';
    const tree = (x, y, a, len, wd, d) => { g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineTo(x2, y2); g.stroke(); if (d > 0) { tree(x2, y2, a - .35 - r() * .4, len * .72, wd * .68, d - 1); tree(x2, y2, a + .35 + r() * .4, len * .72, wd * .68, d - 1); if (r() < .5) tree(x2, y2, a + (r() - .5) * .3, len * .6, wd * .6, d - 2); } };
    tree(w * .14, h * 1.02, -Math.PI / 2 + .1, h * .26, 12, 7); tree(w * .86, h * 1.02, -Math.PI / 2 - .12, h * .22, 10, 7); tree(w * .5, h * 1.02, -Math.PI / 2, h * .12, 6, 5);
    g.fillStyle = '#020204'; for (let x = 0; x < w; x += 22) g.fillRect(x, h * .88, 3, h * .12);                // fence
  }));
  const rain = () => mk('rain', () => {
    const t = canvasTex(256, 512, (g, w, h) => {
      const r = rng(seed + 131); g.clearRect(0, 0, w, h); g.lineCap = 'round';
      for (let k = 0; k < 150; k++) { const x = r() * w, y = r() * h, len = 20 + r() * 50; g.strokeStyle = `rgba(190,205,255,${.12 + r() * .3})`; g.lineWidth = .8 + r() * 1.2; for (const dy of [0, -h, h]) { g.beginPath(); g.moveTo(x, y + dy); g.lineTo(x - len * .12, y + dy + len); g.stroke(); } }
    }, [1, 1]);
    return t;
  });

  // ---------------------------------------------------------------- stained glass for the stairwell: backlit by the storm
  const stainedGlass = () => mk('glass', () => canvasTex(512, 768, (g, w, h) => {
    const r = rng(seed + 141);
    g.fillStyle = '#04050a'; g.fillRect(0, 0, w, h);
    g.save(); g.beginPath(); g.moveTo(16, h - 16); g.lineTo(16, h * .4); g.quadraticCurveTo(16, 18, w / 2, 8); g.quadraticCurveTo(w - 16, 18, w - 16, h * .4); g.lineTo(w - 16, h - 16); g.closePath(); g.clip();
    const cols = [[24, 58, 120], [30, 112, 134], [76, 42, 122], [40, 92, 74], [150, 96, 28], [110, 32, 46], [44, 66, 150]], D = 72;
    for (let row = -1; row < h / D * 2 + 1; row++) for (let col = -1; col < w / D + 1; col++) {         // a diamond lattice, each quarry its own colour and its own light
      const cx = col * D + (row % 2 ? D / 2 : 0), cy = row * D / 2, c = cols[r() * cols.length | 0], k = .55 + r() * .45;
      const gr = g.createRadialGradient(cx, cy - 6, 2, cx, cy, D * .55); gr.addColorStop(0, `rgb(${c[0] * k * 1.7 | 0},${c[1] * k * 1.7 | 0},${c[2] * k * 1.7 | 0})`); gr.addColorStop(1, `rgb(${c[0] * k * .55 | 0},${c[1] * k * .55 | 0},${c[2] * k * .55 | 0})`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy - D / 2); g.lineTo(cx + D / 2, cy); g.lineTo(cx, cy + D / 2); g.lineTo(cx - D / 2, cy); g.closePath(); g.fill();
    }
    g.strokeStyle = '#05060b'; g.lineWidth = 6; g.lineJoin = 'round';
    for (let row = -1; row < h / D * 2 + 1; row++) for (let col = -1; col < w / D + 1; col++) { const cx = col * D + (row % 2 ? D / 2 : 0), cy = row * D / 2; g.beginPath(); g.moveTo(cx, cy - D / 2); g.lineTo(cx + D / 2, cy); g.lineTo(cx, cy + D / 2); g.lineTo(cx - D / 2, cy); g.closePath(); g.stroke(); }
    const mx = w / 2, my = h * .27, mr = 78;                                                               // the medallion: amber with a leaded cross
    const med = g.createRadialGradient(mx, my - 8, 4, mx, my, mr); med.addColorStop(0, '#ffd27a'); med.addColorStop(.7, '#b8741c'); med.addColorStop(1, '#5a3410'); g.fillStyle = med; g.beginPath(); g.arc(mx, my, mr, 0, 6.3); g.fill();
    g.lineWidth = 8; g.stroke(); g.beginPath(); g.arc(mx, my, mr, 0, 6.3); g.moveTo(mx - mr, my); g.lineTo(mx + mr, my); g.moveTo(mx, my - mr); g.lineTo(mx, my + mr); g.stroke();
    g.fillStyle = '#04050a'; g.beginPath(); g.moveTo(w * .62, h * .56); g.lineTo(w * .7, h * .6); g.lineTo(w * .66, h * .67); g.lineTo(w * .58, h * .63); g.closePath(); g.fill();   // one quarry is gone
    g.strokeStyle = 'rgba(4,5,10,.8)'; g.lineWidth = 2; for (let k = 0; k < 5; k++) walk(g, r, w * .64, h * .6, r() * 6.3, 7, 10, 1);
    g.restore();
    g.strokeStyle = '#05060b'; g.lineWidth = 14; g.beginPath(); g.moveTo(16, h - 16); g.lineTo(16, h * .4); g.quadraticCurveTo(16, 18, w / 2, 8); g.quadraticCurveTo(w - 16, 18, w - 16, h * .4); g.lineTo(w - 16, h - 16); g.closePath(); g.stroke();
  }));

  // ---------------------------------------------------------------- soft shade ramps used as fake ambient occlusion
  const shade = () => mk('shade', () => {
    const t = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.92)'); gr.addColorStop(.35, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  });

  return { floorboards, marble, wet, wallpaper, wainscot, ceiling, brick, flagstone, runner, rust, sheet, portrait, PORTRAIT, storm, rain, stainedGlass, shade, field };
}
