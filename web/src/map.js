import { mapBounds, mapFloors } from './world/map-model.js';
// map.js — the museum map. Two floors drawn from the same rectangles the walls are built from,
// a live "you are here" arrow, and every area one tap away (the walk there is the museum's own route).
// Open with the Map button or M; Esc closes. The list under the plan is the same set of places for
// screen readers and small phones.
const NS = 'http://www.w3.org/2000/svg';

export function initMap({ areas, pose, go, button, access=()=>({unlocked:true,requiredLevel:1}) }) {
  const floors = mapFloors(areas);
  const root = document.createElement('div');
  root.id = 'map'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Museum map');
  const floorName=f=>({ground:'Ground floor',upper:'Upper floor',future:'Future levels'}[f]||f);
  root.innerHTML = `<div class="map-card">
    <div class="map-head"><div><small>KONA · WORLD MAP</small><h3>Explore the museum</h3><p>Rooms now. Future levels next.</p></div>
      <div class="map-tabs" role="tablist">${floors.map(f => `<button role="tab" data-floor="${f}">${floorName(f)}</button>`).join('')}</div>
      <button class="map-close" aria-label="Close map">×</button></div>
    <div class="map-legend"><span><i class="live"></i>Open now</span><span><i class="future"></i>Future level</span><span><i class="you"></i>You are here</span></div>
    <div class="map-plan"><svg aria-hidden="true"></svg></div>
    <ul class="map-list"></ul>
    <p class="map-foot">Tap an open room for its full-room overview. Future districts are intentionally locked. <kbd>M</kbd> opens this map.</p></div>`;
  document.body.appendChild(root);
  const svg = root.querySelector('svg'), list = root.querySelector('.map-list');
  let floor = floors[0], raf = 0;

  function draw() {
    const on = areas.filter(a => a.floor === floor);
    const {minX,maxX,minZ,maxZ}=mapBounds(on,3);
    svg.setAttribute('viewBox', `${minX} ${-maxZ} ${maxX - minX} ${maxZ - minZ}`);            // north (+z) up
    svg.innerHTML = '';
    const unit = Math.max(maxX - minX, maxZ - minZ) / 60;
    for (const a of on.sort((p, q) => (p.layer || 0) - (q.layer || 0))) {
      const gate=a.status==='future'?{unlocked:false,requiredLevel:null}:access(a.id);
      const g = document.createElementNS(NS, 'g'); g.setAttribute('class', `map-area ${a.kind || ''} ${a.status === 'future' ? 'future' : gate.unlocked ? 'live' : 'locked'}`.trim()); g.dataset.id = a.id;
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', Math.min(a.x0, a.x1)); r.setAttribute('y', -Math.max(a.z0, a.z1)); r.setAttribute('width', Math.abs(a.x1 - a.x0)); r.setAttribute('height', Math.abs(a.z1 - a.z0));
      r.setAttribute('rx', unit * .6); r.setAttribute('fill', a.color || '#e9e2d6'); if(a.status==='future'){r.setAttribute('stroke-dasharray',`${unit*1.2} ${unit*.8}`);r.setAttribute('opacity','.72');} g.appendChild(r);
      if (a.label !== false) {
        const t = document.createElementNS(NS, 'text'); const cx = (a.x0 + a.x1) / 2, cz = (a.z0 + a.z1) / 2;
        const w = Math.abs(a.x1 - a.x0), h = Math.abs(a.z1 - a.z0), tall = h > w * 1.6;
        const long = tall ? h : w, short = tall ? w : h, size = Math.min(unit * 1.6, long * .9 / Math.max(4, a.name.length * .6), short * .5);
        t.setAttribute('x', cx); t.setAttribute('y', -cz); t.setAttribute('font-size', size); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('fill', a.ink || '#12181d');
        if (tall) t.setAttribute('transform', `rotate(-90 ${cx} ${-cz})`);
        t.textContent = a.status==='future' ? `FUTURE · ${a.name}` : gate.unlocked ? a.name : `LEVEL ${gate.requiredLevel} · ${a.name}`; g.appendChild(t);
      }
      if (a.go !== false && gate.unlocked) { g.style.cursor = 'pointer'; g.addEventListener('click', () => pick(a)); }
      svg.appendChild(g);
    }
    const me = document.createElementNS(NS, 'g'); me.setAttribute('class', 'map-me');
    const halo = document.createElementNS(NS, 'circle'); halo.setAttribute('r', unit * 2.2); me.appendChild(halo);
    const arrow = document.createElementNS(NS, 'path'); arrow.setAttribute('d', `M0 ${-unit * 1.9} L${unit * 1.2} ${unit * 1.2} L0 ${unit * .5} L${-unit * 1.2} ${unit * 1.2}Z`); me.appendChild(arrow);
    svg.appendChild(me);
    root.querySelectorAll('.map-tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.floor === floor));
    list.innerHTML = on.map(a => {const gate=a.status==='future'?{unlocked:false,requiredLevel:null}:access(a.id);return (a.go===false||!gate.unlocked) ? `<li class="future"><div><i style="background:${a.color || '#5d6870'}"></i><span><b>${a.name}</b><small>${a.status==='future'?(a.sub||'Future level · locked'):`Unlocks at Level ${gate.requiredLevel}`}</small></span></div></li>` : `<li><button data-id="${a.id}"><i style="background:${a.color || '#e9e2d6'}"></i><span><b>${a.name}</b>${a.sub ? `<small>${a.sub}</small>` : ''}</span></button></li>`;}).join('');
    list.querySelectorAll('button').forEach(b => b.addEventListener('click', () => pick(areas.find(a => a.id === b.dataset.id))));
  }
  const inside = (a, p) => a.floor === p.floor && a.go !== false && p.x >= Math.min(a.x0, a.x1) && p.x <= Math.max(a.x0, a.x1) && p.z >= Math.min(a.z0, a.z1) && p.z <= Math.max(a.z0, a.z1);
  function here(p = pose()) { return areas.find(a => inside(a, p) && (a.layer || 0) > 0) || areas.find(a => inside(a, p)) || null; }
  function tick() {
    raf = requestAnimationFrame(tick);
    const p = pose(), me = svg.querySelector('.map-me');
    if (!me) return;
    me.style.display = p.floor === floor ? '' : 'none';
    me.setAttribute('transform', `translate(${p.x} ${-p.z}) rotate(${180 + p.yaw * 180 / Math.PI})`);
    const h = here(p);
    svg.querySelectorAll('.map-area').forEach(g => g.classList.toggle('here', g.dataset.id === h?.id));
  }
  function pick(a) { const gate=access(a.id); if(!gate.unlocked)return; close(); go(a.id); }
  function open() {
    floor = pose().floor || floor; draw(); root.hidden = false; document.body.classList.add('map-open');
    cancelAnimationFrame(raf); tick(); root.querySelector('.map-close').focus({ preventScroll: true });
  }
  function close() { root.hidden = true; document.body.classList.remove('map-open'); cancelAnimationFrame(raf); }
  root.querySelector('.map-close').addEventListener('click', close);
  root.addEventListener('click', e => { if (e.target === root) close(); });
  root.querySelectorAll('.map-tabs button').forEach(b => b.addEventListener('click', () => { floor = b.dataset.floor; draw(); }));
  addEventListener('keydown', e => {
    if (e.target?.closest?.('input,textarea')) return;
    if (e.key === 'Escape' && !root.hidden) close();
    else if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey) root.hidden ? open() : close();
  });
  button?.addEventListener('click', open);
  return { open, close, here, get isOpen() { return !root.hidden; } };
}
