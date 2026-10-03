// world/room-dock.js — the bottom room dock of the museum world.
// Rooms are resolved against the same area list the map navigates (landing.js liveAreas),
// so a chip's id, name and floor can never drift from the room it opens.
import { esc } from '../engine/dom.js';

export const DOCK_GROUPS = [['ground', 'Ground floor'], ['upper', 'Upper floor'], ['bikes', 'Bikes']];

// rooms:  [{ area, swatch, glyph?, img?, color?, sub }] in display order
// areas:  the map's areas [{ id, name, floor }]
// pieces: collection pieces [{ name, years, thumb, glb }]
// access: id => { unlocked, requiredLevel }
export function dockEntries({ rooms = [], areas = [], pieces = [], access = () => ({ unlocked: true }) }) {
  const byId = new Map(areas.map(a => [a.id, a]));
  const entries = [];
  for (const r of rooms) {
    const a = byId.get(r.area);
    if (!a) continue;                                   // a chip must open a real, mapped room
    const gate = access(a.id) || { unlocked: true };
    entries.push({
      key: 'room:' + a.id, room: a.id, group: a.floor === 'upper' ? 'upper' : 'ground',
      name: a.name, sub: gate.unlocked ? r.sub : `Unlocks at level ${gate.requiredLevel}`,
      swatch: r.swatch, glyph: r.glyph || a.name.slice(0, 1), img: r.img, color: r.color, locked: !gate.unlocked,
    });
  }
  pieces.forEach((p, i) => entries.push({
    key: 'piece:' + i, piece: i, group: 'bikes', name: p.name.replace(/^Speed[Mm]ax /, ''), sub: p.years,
    swatch: p.glb ? '' : 'ghost', glyph: String(i + 1), img: p.thumb, locked: false,
  }));
  return entries;
}

const chip = (e, active) => `<button type="button" class="chip${e.swatch ? ' ' + esc(e.swatch) : ''}${e.locked ? ' locked' : ''}${e.key === active ? ' on' : ''}" `
  + (e.room ? `data-room="${esc(e.room)}"` : `data-i="${e.piece}"`)
  + ` aria-label="${esc(e.name)}, ${esc(e.sub)}"${e.key === active ? ' aria-current="true"' : ''}>`
  + `<span class="n" aria-hidden="true"${e.color ? ` style="--swatch:${esc(e.color)}"` : ''}>${e.img ? `<img src="${esc(e.img)}" alt="" loading="lazy">` : esc(e.glyph)}</span>`
  + `<span><b>${esc(e.name)}</b><small>${esc(e.sub)}</small></span></button>`;

export function mountRoomDock({ rail, inner, entries }) {
  const groups = DOCK_GROUPS.filter(([g]) => entries.some(e => e.group === g));
  const tabs = document.createElement('div');
  tabs.className = 'dock-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Museum rooms');
  tabs.innerHTML = groups.map(([g, label]) => `<button type="button" role="tab" data-group="${g}" aria-controls="railInner">${esc(label)}<i>${entries.filter(e => e.group === g).length}</i></button>`).join('');
  rail.classList.add('dock'); rail.setAttribute('aria-label', 'Museum rooms and bikes');
  rail.insertBefore(tabs, inner);
  inner.setAttribute('role', 'tabpanel');
  let group = null, active = null;
  const show = g => {
    group = g;
    inner.innerHTML = entries.filter(e => e.group === g).map(e => chip(e, active)).join('');
    tabs.querySelectorAll('[role=tab]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.group === g)));
  };
  tabs.addEventListener('click', e => { const t = e.target.closest('[role=tab]'); if (t && t.dataset.group !== group) { show(t.dataset.group); inner.scrollLeft = 0; } });
  // Mark the room or piece the visitor is now in, switching to its tab.
  const setActive = key => {
    active = key;
    const e = entries.find(x => x.key === key);
    if (e && e.group !== group) show(e.group);
    else inner.querySelectorAll('.chip').forEach(c => { const on = (c.dataset.room ? 'room:' + c.dataset.room : 'piece:' + c.dataset.i) === key; c.classList.toggle('on', on); on ? c.setAttribute('aria-current', 'true') : c.removeAttribute('aria-current'); });
    return inner.querySelector('.chip.on');
  };
  show(groups[0]?.[0]);
  return { show, setActive, get group() { return group; } };
}
