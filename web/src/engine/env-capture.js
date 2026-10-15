// engine/env-capture.js — one local reflection capture for a room, shared by the review rooms.
// A CubeCamera on layer 2 sees only the room's own group (plus scene-level lights), PMREM-filters the result and
// assigns it to the given materials. Capture once after the room's assets land; re-capture only when the room changes.
import * as THREE from 'three';

const LAYER = 2;

export function localEnvCapture({ renderer, scene, group, at, lite = false, mats = [], hidePoints = false, far = 60 }) {
  let rt = null, cam = null, pmrem = null, tex = null;
  return {
    get texture() { return tex; },
    capture() {
      if (!renderer) return null;
      rt ||= new THREE.WebGLCubeRenderTarget(lite ? 128 : 256, { type: THREE.HalfFloatType });
      if (!cam) { cam = new THREE.CubeCamera(.1, far, rt); cam.position.copy(at); cam.children.forEach(c => c.layers.set(LAYER)); scene.add(cam); }
      group.traverse(o => o.layers.enable(LAYER)); scene.traverse(o => { if (o.isLight && !o.parent?.isGroup) o.layers.enable(LAYER); });   // the capture sees only this room
      const hidden = []; if (hidePoints) scene.traverse(o => { if (o.isPoints) { hidden.push([o, o.visible]); o.visible = false; } });   // particles would smear into the probe
      cam.update(renderer, scene);
      hidden.forEach(([o, v]) => o.visible = v);
      pmrem ||= new THREE.PMREMGenerator(renderer);
      const next = pmrem.fromCubemap(rt.texture).texture; tex?.dispose(); tex = next;
      for (const m of mats) { m.envMap = tex; m.needsUpdate = true; }
      return tex;
    },
  };
}
