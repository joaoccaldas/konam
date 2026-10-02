import * as THREE from 'three';

// WYLD — a procedural frame skin sampled from a hand-dyed pink/aqua jersey:
// hot pink flowing through pale lilac and white into aqua/mint, in soft diagonal waves.
// Works on any bike: the pattern lives in the bike's own 3D space (no UVs needed),
// normalised to the bike's bounding box so it reads the same on every frame.

// Sampled from the reference photo (sRGB).
export const WYLD_PALETTE = {
  pink: '#ff3d8e',     // the saturated fuchsia edges
  blush: '#ff8fbf',
  lilac: '#e9cde8',    // the pale lilac/white seam between the two
  mint: '#8fe7dc',
  aqua: '#5fd8d3',     // the cool aqua centre
};

export const WYLD_DEFAULTS = {
  darkness: 0,    // 0 = as dyed, 1 = deep night version (keeps the hues, drops the value)
  sheer: 0,       // 0 = opaque paint, 1 = candy tint over bare carbon
  opacity: 1,     // true transparency of the frame (1 = solid). Use sparingly.
  angle: 32,      // band direction in degrees (0 = along the top tube)
  scale: 1.5,     // band frequency multiplier
  flow: 1,        // strength of the dye "waves"
};

const lin = hex => { const c = new THREE.Color(hex); return new THREE.Vector3(c.r, c.g, c.b); };

/**
 * Turn a MeshStandard/Physical paint material into Wyld. Idempotent; returns a controller.
 * @param {THREE.Material} material  the frame paint material (e.g. `paint_frame`)
 * @param {THREE.Object3D} bike      the bike root, used for bounds so the pattern scales to the frame
 * @param {object} [params]          see WYLD_DEFAULTS
 */
export function applyWyld(material, bike, params = {}) {
  const p = { ...WYLD_DEFAULTS, ...params };
  const box = new THREE.Box3().setFromObject(bike);
  const size = box.getSize(new THREE.Vector3()).max(new THREE.Vector3(1e-3, 1e-3, 1e-3));
  const u = {
    uWMin: { value: box.min.clone() }, uWSize: { value: size },
    uWPink: { value: lin(WYLD_PALETTE.pink) }, uWBlush: { value: lin(WYLD_PALETTE.blush) },
    uWLilac: { value: lin(WYLD_PALETTE.lilac) }, uWMint: { value: lin(WYLD_PALETTE.mint) }, uWAqua: { value: lin(WYLD_PALETTE.aqua) },
    uWCarbon: { value: lin('#16181b') },
    uWDark: { value: p.darkness }, uWSheer: { value: p.sheer }, uWAlpha: { value: p.opacity },
    uWDir: { value: new THREE.Vector2() }, uWScale: { value: p.scale }, uWFlow: { value: p.flow },
  };
  const setDir = deg => u.uWDir.value.set(Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180));
  setDir(p.angle);
  // Optional five-stop ramp (Bike Porn films). The wave stays the museum dye; only the hues change.
  if (p.stops?.length >= 5) {
    const keys = ['uWPink', 'uWBlush', 'uWLilac', 'uWMint', 'uWAqua'];
    p.stops.slice(0, 5).forEach((hex, i) => u[keys[i]].value.copy(lin(hex)));
  }

  const prev = material.userData.wyld;
  if (prev) prev.detachUniformsOnly = true;
  material.userData.wyldBase = material.userData.wyldBase || { color: material.color.clone(), transparent: material.transparent, opacity: material.opacity };
  material.color.set(0xffffff);
  // Chain onto any shader already on this material (e.g. artwork projection) instead of replacing it.
  const base = prev ? material.userData.wyldPrevOBC : material.onBeforeCompile;
  const baseKey = prev ? material.userData.wyldPrevKey : material.customProgramCacheKey;
  material.userData.wyldPrevOBC = base; material.userData.wyldPrevKey = baseKey;
  material.onBeforeCompile = (shader, renderer) => {
    if (base) base.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWyldPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWyldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWyldPos;
uniform vec3 uWMin, uWSize, uWPink, uWBlush, uWLilac, uWMint, uWAqua, uWCarbon;
uniform float uWDark, uWSheer, uWAlpha, uWScale, uWFlow;
uniform vec2 uWDir;
vec3 wyldRamp(float c) {            // cyclic: pink -> blush -> lilac -> mint -> aqua -> mint -> lilac -> blush -> pink
  c = fract(c) * 8.0;
  vec3 k[9]; k[0]=uWPink; k[1]=uWPink; k[2]=uWBlush; k[3]=uWLilac; k[4]=uWMint; k[5]=uWAqua; k[6]=uWLilac; k[7]=uWBlush; k[8]=uWPink;
  int i = int(floor(c)); float f = smoothstep(0.0, 1.0, fract(c));
  vec3 a = k[0], b = k[1];
  for (int j = 0; j < 8; j++) { if (j == i) { a = k[j]; b = k[j + 1]; } }
  return mix(a, b, f);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 q = (vWyldPos - uWMin) / max(uWSize.x, max(uWSize.y, uWSize.z));
  float along = dot(q.xy, uWDir);
  float wave = 0.10 * sin(q.x * 7.3 + q.y * 3.1) + 0.07 * sin(q.y * 11.0 - q.z * 6.0 + 1.7) + 0.05 * sin((q.x - q.y) * 17.0);
  float c = along * 1.35 * uWScale + wave * uWFlow;
  vec3 dye = wyldRamp(c);
  dye *= mix(1.0, 0.07, pow(uWDark, 0.75));                  // darker: same hues, much lower value
  dye = mix(dye, uWCarbon + dye * 0.22, uWSheer * 0.92);      // sheer: tinted clear coat over bare carbon
  diffuseColor.rgb = dye;
  diffuseColor.a *= uWAlpha;
}`);
  };
  material.customProgramCacheKey = () => 'wyld-v2|' + (baseKey ? baseKey.call(material) : '');
  material.transparent = p.opacity < 1;
  material.depthWrite = p.opacity >= 0.98;
  material.needsUpdate = true;

  const ctl = {
    name: 'Wyld',
    params: p,
    set(next = {}) {
      Object.assign(p, next);
      u.uWDark.value = p.darkness; u.uWSheer.value = p.sheer; u.uWAlpha.value = p.opacity;
      u.uWScale.value = p.scale; u.uWFlow.value = p.flow; setDir(p.angle);
      const wantT = p.opacity < 1;
      if (wantT !== material.transparent) { material.transparent = wantT; material.depthWrite = !wantT; }
      material.needsUpdate = true;
    },
    refit(root = bike) { const b = new THREE.Box3().setFromObject(root); u.uWMin.value.copy(b.min); u.uWSize.value.copy(b.getSize(new THREE.Vector3())); },
    remove() {
      const base = material.userData.wyldBase;
      material.onBeforeCompile = material.userData.wyldPrevOBC || (() => { });
      material.customProgramCacheKey = material.userData.wyldPrevKey || (() => 'plain');
      delete material.userData.wyldPrevOBC; delete material.userData.wyldPrevKey;
      if (base) { material.color.copy(base.color); material.transparent = base.transparent; material.opacity = base.opacity; material.depthWrite = true; }
      delete material.userData.wyld;
      material.needsUpdate = true;
    },
  };
  if (prev) prev.params = p;
  material.userData.wyld = ctl;
  return ctl;
}