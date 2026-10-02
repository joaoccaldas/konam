// Coplanar-surface audit: lists same-facing faces that overlap in the same plane (z-fighting = "shaking" as you walk).
// usage: node zfight-audit.mjs [url]
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800 });
const url = process.argv[2] || 'http://127.0.0.1:8746/index.html';
await p.goto(url, { waitUntil: 'load', timeout: 120000 }); await new Promise(r => setTimeout(r, 12000));
const out = await p.evaluate(() => {
  const m = window.__museum, THREE_Box = m.camera.constructor; // not needed
  const items = [];
  m.scene.updateMatrixWorld(true);
  m.scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
    let v = o; while (v) { if (!v.visible) return; v = v.parent; }
    if (o.userData?.wyldBike || o.userData?.piece || o.userData?.champ) return;
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    const mat = [].concat(o.material)[0];
    const po = mat.polygonOffset; const size = bb.getSize(bb.min.clone());
    if (size.x > 60 || size.z > 60) return;
    items.push({ n: (o.name || o.geometry.type) + '|' + (mat.name || mat.type) + (mat.transparent ? '/T' : '') + (po ? '/PO' : ''), min: bb.min.toArray().map(v => +v.toFixed(3)), max: bb.max.toArray().map(v => +v.toFixed(3)), po, dw: mat.depthWrite });
  });
  const hits = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const A = items[i], B = items[j];
    if (A.po || B.po) continue;
    for (let ax = 0; ax < 3; ax++) {
      const o1 = (ax + 1) % 3, o2 = (ax + 2) % 3;
      const ov = (k) => Math.min(A.max[k], B.max[k]) - Math.max(A.min[k], B.min[k]);
      if (ov(o1) <= .02 || ov(o2) <= .02) continue;
      for (const side of ['min', 'max']) { const a = A[side][ax], bb = B[side][ax];
        const thinA = A.max[ax] - A.min[ax] < .002, thinB = B.max[ax] - B.min[ax] < .002;
        if (Math.abs(a - bb) < .004 && ov(o1) * ov(o2) > .05) hits.push(`${'xyz'[ax]}${side}=${a} :: ${A.n}[${A.min}..${A.max}]  <>  ${B.n}[${B.min}..${B.max}]  area~${(ov(o1) * ov(o2)).toFixed(2)}`);
      }
    }
  }
  return { n: items.length, hits: [...new Set(hits)] };
});
console.log(out.n, out.hits.length); out.hits.forEach(h => console.log(h));
await b.close();
