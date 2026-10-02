import * as THREE from 'three';

// Profiles mirrored from blender/components.py so the decal bands land on the right wall.
const RIM_PROF = [[316, 13.8], [313.5, 14.3], [300, 14.6], [285, 14.5], [270, 14.0], [255, 12.8], [243, 11.0], [234, 8.4],
  [228.5, 5.0], [226, 0], [228.5, -5.0], [234, -8.4], [243, -11], [255, -12.8], [270, -14], [285, -14.5], [300, -14.6],
  [313.5, -14.3], [316, -13.8], [316, -11.2], [312, -11], [310.5, -8], [309, -3], [309, 3], [310.5, 8], [312, 11], [316, 11.2]];

function cumV(prof) {
  const L = [0];
  for (let i = 1; i < prof.length; i++) L.push(L[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const tot = L[L.length - 1] + Math.hypot(prof[0][0] - prof[prof.length - 1][0], prof[0][1] - prof[prof.length - 1][1]);
  return { L, tot };
}
function vAtRadius(prof, side, r) {
  // find v where the wall on `side` (+1 = +Y/NDS, -1 = -Y/drive) passes radius r
  const { L, tot } = cumV(prof);
  for (let i = 0; i < prof.length - 1; i++) {
    const a = prof[i], b = prof[i + 1];
    if (Math.sign(a[1] + b[1]) !== side) continue;
    if ((a[0] - r) * (b[0] - r) <= 0 && a[0] !== b[0]) {
      const t = (r - a[0]) / (b[0] - a[0]);
      return (L[i] + (L[i + 1] - L[i]) * t) / tot;
    }
  }
  return side > 0 ? .2 : .7;
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Text around a wheel. u = angle/2π (counter-clockwise seen from the drive side), v = profile coordinate.
function paintBand(ctx, W, H, v0, v1, items, color, driveSide) {
  const y0 = (1 - v1) * H, y1 = (1 - v0) * H, hh = y1 - y0;
  ctx.fillStyle = color;
  for (const it of items) {
    ctx.save();
    const x = it.u * W;
    ctx.translate(x, (y0 + y1) / 2);
    // drive side reads clockwise -> mirror u; letters' tops point outward (towards larger radius)
    const outwardIsUp = it.outwardUp;
    ctx.scale(driveSide ? -1 : 1, outwardIsUp ? 1 : -1);
    ctx.font = `${it.weight || 800} ${Math.round(hh * it.size)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (it.spacing) ctx.letterSpacing = it.spacing + 'px';
    ctx.fillText(it.text, 0, 0);
    ctx.restore();
  }
}

export function rimTexture(color = '#d9d9d9', base = '#0b0b0c', labels = true) {
  const W = 4096, H = 512, c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  let seed = 4524; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  // subtle UD carbon streaks
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${rand() * .025})`; x.fillRect(rand() * W, 0, 1 + rand() * 3, H); }
  for (const side of labels ? [-1, 1] : []) {
    const vHi = vAtRadius(RIM_PROF, side, 300), vLo = vAtRadius(RIM_PROF, side, 244);
    const a = Math.min(vHi, vLo), b = Math.max(vHi, vLo);
    // in the profile the +Y wall runs outer->inner (v grows as r shrinks): outward = smaller v = lower canvas y? handled by flag
    const outwardUp = side > 0 ? true : false;
    const items = [];
    for (let k = 0; k < 3; k++) {
      items.push({ u: (k + .08) / 3, text: 'DT SWISS', size: .62, spacing: 18 });
      items.push({ u: (k + .30) / 3, text: 'ARC 1100 DICUT', size: .30, weight: 600, spacing: 10 });
    }
    paintBand(x, W, H, a, b, items, color, side < 0 ? !outwardUp : outwardUp);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function tyreTexture(label, sub, color = '#6b6b6b') {
  const W = 4096, H = 256, c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
  // tread (v ~ 0 and 1 wrap) slightly lighter & finer
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#171717'); g.addColorStop(.12, '#0d0d0d'); g.addColorStop(.88, '#0d0d0d'); g.addColorStop(1, '#171717');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (const [v0, v1, drive] of [[.19, .27, false], [.73, .81, true]]) {
    const items = [];
    for (let k = 0; k < 2; k++) {
      items.push({ u: (k + .1) / 2, text: 'CONTINENTAL', size: .8, spacing: 14 });
      items.push({ u: (k + .32) / 2, text: sub, size: .55, weight: 600, spacing: 8 });
    }
    paintBand(x, W, H, v0, v1, items, color, drive);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function groundTexture() {
  const c = canvas(1024, 1024), x = c.getContext('2d');
  const g = x.createRadialGradient(512, 512, 0, 512, 512, 512);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(c); return t;
}

// Micro-variation for glossy surfaces: real paint has orange peel, not a perfect mirror.
// Injects a tiny world-space noise into roughness so highlights break up — no textures,
// no UVs needed, and it chains with any existing onBeforeCompile (artwork, wyld, …).
export function microNoise(material, freq = 480, amt = .28) {
  const prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMicroP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMicroP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMicroP;\nfloat mnH(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }\nfloat mnN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);\n  float a = mnH(i), b = mnH(i + vec3(1.0, 0.0, 0.0)), c = mnH(i + vec3(0.0, 1.0, 0.0)), d = mnH(i + vec3(1.0, 1.0, 0.0));\n  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) + (mnH(i + vec3(0.0, 0.0, 1.0)) - a) * f.z * .5; }')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor * (1.0 - ${(amt * .5).toFixed(3)} + ${amt.toFixed(3)} * mnN(vMicroP * ${freq.toFixed(1)})), 0.02, 1.0);`);
  };
  material.customProgramCacheKey = () => 'micro-noise-v1|' + (prevKey ? prevKey.call(material) : '');
  material.needsUpdate = true;
  return material;
}
