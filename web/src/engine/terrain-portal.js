// engine/terrain-portal.js — windows onto real terrain, for rooms whose walls cannot simply open (the host world has
// neighbours behind them).
//
// A portal is a second, small THREE.Scene (terrain, water, sky) laid out in host-world coordinates beyond a room's
// glazing. It is rendered from the host camera into one render target, Reflector-style, just before the first window
// is drawn; every window samples that target in screen space, so parallax and depth are exact and nothing from the
// host world shows through. During `capture(fn)` (the room's env capture) every camera gets its own portal render, so
// reflections in floors and water show the real view; any other camera sees a soft fallback gradient.
//
// Terrain comes from tools/build_norseman_terrain.py (the St. George elevation pipeline without imagery): uint16
// decimetre heights on a grid, shaded here by altitude, slope and noise — no photograph of any place.
import * as THREE from 'three';

export function createTerrainPortal({ renderer, lite = false, far = 6000, scale = lite ? .85 : .8 }) {
  const scene = new THREE.Scene();
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: lite ? 0 : 4 });
  const size = new THREE.Vector2(), res = { value: new THREE.Vector2(1, 1) };
  let cam = null, dirty = true, shadowFrames = 0, capturing = false, lastCam = null;
  const isHostCamera = c => c.isPerspectiveCamera && (window.__museum?.camera ? c === window.__museum.camera : c.fov !== 90);

  function render(camera) {
    if (!renderer || (capturing ? camera === lastCam : !dirty)) return;
    dirty = false; lastCam = camera;
    const target = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    if (target) size.set(target.width, target.height); else renderer.getDrawingBufferSize(size);
    res.value.copy(size);
    const w = Math.max(4, Math.round(size.x * scale)), h = Math.max(4, Math.round(size.y * scale));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    if (!cam) { cam = camera.clone(); cam.matrixAutoUpdate = false; cam.matrixWorldAutoUpdate = false; }
    cam.copy(camera, false); cam.matrixAutoUpdate = false; cam.matrixWorldAutoUpdate = false; cam.far = far; cam.updateProjectionMatrix();
    cam.layers.enableAll();                    // landscape layers (e.g. terrain kept out of a water mirror) all count here
    cam.matrixWorld.copy(camera.matrixWorld); cam.matrixWorldInverse.copy(camera.matrixWorldInverse);
    const xr = renderer.xr.enabled, auto = renderer.shadowMap.autoUpdate, clip = renderer.localClippingEnabled;
    renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false; renderer.localClippingEnabled = true;
    if (shadowFrames > 0) { renderer.shadowMap.needsUpdate = true; shadowFrames--; }   // the landscape is static: shadow it twice, then reuse
    renderer.setRenderTarget(rt); renderer.state.buffers.depth.setMask(true); if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, cam);
    renderer.xr.enabled = xr; renderer.shadowMap.autoUpdate = auto; renderer.localClippingEnabled = clip;
    renderer.setRenderTarget(target, face, mip);
    if (camera.viewport !== undefined) renderer.state.viewport(camera.viewport);
  }

  // One material per window: screen-space sample of the portal; a sky-to-ground gradient for any other camera.
  function windowMaterial({ top = '#7f9ab8', mid = '#3a4652', bottom = '#1d2a33' } = {}) {
    const live = { value: 0 }, cols = [top, mid, bottom].map(c => new THREE.Color(c));
    const m = new THREE.MeshBasicMaterial({ map: rt.texture, fog: false });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uRes: res, uLive: live, uTop: { value: cols[0] }, uMid: { value: cols[1] }, uBot: { value: cols[2] } });
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 uRes; uniform float uLive; uniform vec3 uTop, uMid, uBot;')
        .replace('#include <map_fragment>', `
          vec3 fb = mix(mix(uBot, uMid, smoothstep(.0, .45, vMapUv.y)), uTop, smoothstep(.45, 1., vMapUv.y));
          diffuseColor.rgb *= uLive > .5 ? texture2D(map, gl_FragCoord.xy / uRes).rgb : fb;`);
    };
    m.customProgramCacheKey = () => 'terrain-portal-window';
    const attach = mesh => { mesh.onBeforeRender = (r, s, camera) => { const ok = capturing || isHostCamera(camera); live.value = ok ? 1 : 0; if (ok) render(camera); }; return mesh; };
    return { material: m, attach };
  }

  return {
    scene, texture: rt.texture,
    frame() { dirty = true; },                 // call once per host frame (room update)
    capture(fn) { capturing = true; lastCam = null; try { fn(); } finally { capturing = false; lastCam = null; dirty = true; } },
    shadows(n = 2) { shadowFrames = n; },
    windowMaterial,
    dispose() { rt.dispose(); },
  };
}

// Heights → a mesh in host-world coordinates.
//   view: { x, z, y0, e0, k, bearing, fwd: [fx, fz], right: [rx, rz] } — the map viewpoint (lat/lon) lands on (x, z);
//   map bearing `bearing` points along `fwd`; heights become y = (e - e0) * k + y0.
//   sun (optional, world direction toward the sun): bakes a `sunlit` attribute by marching each vertex toward the sun
//   over the heightfield — real terrain self-shadowing with no runtime shadow pass.
export function terrainGeometry(meta, heights, { lat, lon, view, step = 1, sun = null }) {
  const n = meta.grid, b = meta.bbox, m = Math.floor((n - 1) / step) + 1;
  const vu = (lon - b.west) / (b.east - b.west), vv = (b.north - lat) / (b.north - b.south);
  const s = Math.sin(view.bearing * Math.PI / 180), c = Math.cos(view.bearing * Math.PI / 180), k = view.k;
  const pos = new Float32Array(m * m * 3), elev = new Float32Array(m * m);
  for (let gy = 0; gy < m; gy++) for (let gx = 0; gx < m; gx++) {
    const i = gy * m + gx, e = heights[(gy * step) * n + gx * step] / 10;
    const dE = (gx * step / (n - 1) - vu) * meta.width_m, dN = (vv - gy * step / (n - 1)) * meta.height_m;
    const f = dE * s + dN * c, r = dE * c - dN * s;
    pos[i * 3] = view.x + (view.fwd[0] * f + view.right[0] * r) * k;
    pos[i * 3 + 1] = (e - view.e0) * k + view.y0;
    pos[i * 3 + 2] = view.z + (view.fwd[1] * f + view.right[1] * r) * k;
    elev[i] = e;
  }
  const idx = new (m * m > 65535 ? Uint32Array : Uint16Array)((m - 1) * (m - 1) * 6); let o = 0;
  for (let gy = 0; gy < m - 1; gy++) for (let gx = 0; gx < m - 1; gx++) { const a = gy * m + gx, bb = a + 1, cc = a + m, d = cc + 1; idx.set([a, cc, bb, bb, cc, d], o); o += 6; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('elev', new THREE.BufferAttribute(elev, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  if (sun) {
    // world xz moved by one grid step in gx / gy; solve for the grid step that moves one world unit toward the sun
    const ax = pos[3] - pos[0], az = pos[5] - pos[2], bx = pos[m * 3] - pos[0], bz = pos[m * 3 + 2] - pos[2];
    const h = Math.hypot(sun.x, sun.z), dx = sun.x / h, dz = sun.z / h, det = ax * bz - az * bx;
    const ugx = (dx * bz - dz * bx) / det, ugy = (ax * dz - az * dx) / det, tanE = sun.y / h;   // grid cells per world unit
    const Y = (fx, fy) => { if (fx < 0 || fy < 0 || fx > m - 1 || fy > m - 1) return -1e9; const i = Math.min(m - 2, Math.floor(fx)), j = Math.min(m - 2, Math.floor(fy)), u = fx - i, v = fy - j;
      return (pos[(j * m + i) * 3 + 1] * (1 - u) + pos[(j * m + i + 1) * 3 + 1] * u) * (1 - v) + (pos[((j + 1) * m + i) * 3 + 1] * (1 - u) + pos[((j + 1) * m + i + 1) * 3 + 1] * u) * v; };
    const cell = 1 / Math.hypot(ugx, ugy), lit = new Float32Array(m * m);
    for (let gy = 0; gy < m; gy++) for (let gx = 0; gx < m; gx++) {
      const y0 = pos[(gy * m + gx) * 3 + 1] + .02; let d = cell * .8, clear = 1e9;
      for (let k = 0; k < 140; k++) { const hy = Y(gx + ugx * d, gy + ugy * d); if (hy < -1e8) break; clear = Math.min(clear, (y0 + d * tanE - hy) / (d * .06 + .5)); if (clear < -1) break; d += cell * (1 + d / cell * .06); }
      lit[gy * m + gx] = Math.max(0, Math.min(1, clear * .5 + .5)); }
    g.setAttribute('sunlit', new THREE.BufferAttribute(lit, 1));
  }
  g.computeVertexNormals();
  // the side the camera looks from depends on the mapping's handedness; make the surface face up
  const ny = g.attributes.normal; let up = 0; for (let i = 0; i < ny.count; i += 97) up += ny.getY(i);
  if (up < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
  return g;
}

// Elevation at a lat/lon (bilinear), for placing a viewpoint's ground level.
export function terrainHeightAt(meta, heights, lat, lon) {
  const n = meta.grid, b = meta.bbox, u = (lon - b.west) / (b.east - b.west) * (n - 1), v = (b.north - lat) / (b.north - b.south) * (n - 1);
  const i = Math.max(0, Math.min(n - 2, Math.floor(u))), j = Math.max(0, Math.min(n - 2, Math.floor(v))), fu = u - i, fv = v - j, H = (a, c) => heights[c * n + a] / 10;
  return (H(i, j) * (1 - fu) + H(i + 1, j) * fu) * (1 - fv) + (H(i, j + 1) * (1 - fu) + H(i + 1, j + 1) * fu) * fv;
}

// Alpine shading by real altitude and slope: forest low, heath, rock on steep ground, lichen plateau, late snow high.
export function terrainMaterial({ clippingPlanes = [], snowline = 1450, treeline = 900, time = { value: 0 }, sun = new THREE.Vector3(0, 1, 0), alpen = [snowline - 500, snowline + 200] } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .94, metalness: 0, clippingPlanes });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = time; sh.uniforms.uSun = { value: sun };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float elev; attribute float sunlit; varying float vE; varying float vLit; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvE = elev; vLit = sunlit; vWP = (modelMatrix * vec4(transformed, 1.)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying float vE; varying float vLit; varying vec3 vWP; varying vec3 vWN; uniform float uTime; uniform vec3 uSun;
      float th(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float tn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(th(i),th(i+vec2(1,0)),f.x),mix(th(i+vec2(0,1)),th(i+1.),f.x),f.y);}
      float tf(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*tn(p);p*=2.07;a*=.5;}return s;}`)
      .replace('#include <color_fragment>', `
      { float slope = 1. - clamp(vWN.y, 0., 1.);                     // 0 flat … 1 vertical
        float n1 = tf(vWP.xz * .045), n2 = tf(vWP.xz * .6), n3 = tf(vWP.xz * 3.1);
        float e = vE + (n1 - .5) * 160.;
        vec3 forest = mix(vec3(.025,.055,.049), vec3(.06,.10,.079), n2);
        vec3 heath = mix(vec3(.075,.095,.07), vec3(.13,.14,.10), n2);
        vec3 lichen = mix(vec3(.22,.22,.17), vec3(.30,.29,.23), n3);
        vec3 rock = mix(vec3(.17,.17,.18), vec3(.30,.29,.28), n2 * .7 + n3 * .3);
        vec3 snow = vec3(.86,.89,.93);
        vec3 c = mix(forest, heath, smoothstep(${(treeline - 220).toFixed(1)}, ${treeline.toFixed(1)}, e));
        c = mix(c, lichen, smoothstep(${(treeline + 150).toFixed(1)}, ${(treeline + 450).toFixed(1)}, e));
        c = mix(c, rock, smoothstep(.34, .52, slope + (n2 - .5) * .25));
        float snowAmt = smoothstep(${(snowline - 60).toFixed(1)}, ${(snowline + 120).toFixed(1)}, e + n2 * 140.) * (1. - smoothstep(.35, .55, slope)) * step(.42, n1 + n3 * .3);
        c = mix(c, snow, snowAmt);
        c = mix(c, vec3(.05,.06,.06), smoothstep(6., 0., vE) * .7);    // dark wet rock at the waterline
        // drifting cloud shadows, cast along the sun
        vec2 cs = (vWP.xz - uSun.xz / max(uSun.y, .1) * vWP.y) * .0016 + vec2(uTime * .006, uTime * .0025);
        c *= mix(1., .42, smoothstep(.5, .66, tf(cs)));
        c *= mix(.38, 1., vLit);                                          // baked self-shadow toward the sun
        // dawn colour: rose-gold on sunlit high ground (alpenglow), cool blue where the sun does not reach
        float hi = smoothstep(${alpen[0].toFixed(1)}, ${alpen[1].toFixed(1)}, vE);
        c *= mix(vec3(.78, .86, 1.08), mix(vec3(1.), vec3(1.34, 1.0, .86), hi), vLit);
        diffuseColor.rgb = c; }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { // rock and scree detail the 1:10 grid cannot carry
        vec2 q = vWP.xz * .9; float h0 = tf(q), hx = tf(q + vec2(.15, 0.)), hz = tf(q + vec2(0., .15));
        vec2 q2 = vWP.xz * 4.; float g0 = tn(q2), gx = tn(q2 + vec2(.2, 0.)), gz = tn(q2 + vec2(0., .2));
        vec3 dW = vec3(h0 - hx + (g0 - gx) * .3, 0., h0 - hz + (g0 - gz) * .3) * .9;
        normal = normalize(normal + (viewMatrix * vec4(dW, 0.)).xyz); }`);
  };
  m.customProgramCacheKey = () => `terrain-alpine-${snowline}-${treeline}-${alpen.join('-')}`;
  return m;
}
