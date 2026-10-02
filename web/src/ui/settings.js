import { applyBrandMode } from '../brand/runtime.js';
import { exportAppState, eraseAppState, appStateSummary } from '../engine/app-state.js';
// ui/settings.js — profile and settings sheet, and the profile chip in the header.
// Built from engine/profile.js data; the sheet never stores anything itself.
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v === true) n.setAttribute(k, ''); else if (v !== false && v != null) n.setAttribute(k, v); }
  for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
};

export function initSettings({ profile, QUALITY, AVATARS, activeQuality, onQuality, onSound, onMotion, sync }) {
  const chip = document.getElementById('meBtn');
  const paintChip = p => {
    if (!chip) return;
    chip.querySelector('i').style.background = p.avatar;
    chip.querySelector('i').textContent = (p.name || '').trim().slice(0, 1).toUpperCase();
    chip.querySelector('span').textContent = p.name ? p.name.split(' ')[0] : 'Me';
  };
  paintChip(profile.get()); profile.subscribe(paintChip);

  const sheet = el('div', { id: 'settings', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settingsTitle', hidden: true });
  document.body.append(sheet);
  let reloadNeeded = false;

  function draw() {
    const p = profile.get();
    const quality = Object.entries(QUALITY).map(([id, q]) => el('label', { class: 'set-opt' },
      el('input', { type: 'radio', name: 'quality', value: id, checked: p.quality === id, onchange: () => { profile.set({ quality: id }); reloadNeeded = onQuality(id) || reloadNeeded; draw(); } }),
      el('span', {}, el('b', {}, q.label), el('small', {}, q.note))));
    const avatars = AVATARS.map(c => el('button', { type: 'button', class: 'set-ava', 'aria-label': `Avatar colour ${c}`, 'aria-pressed': String(p.avatar === c), style: `background:${c}`, onclick: () => { profile.set({ avatar: c }); draw(); } }));
    const seg = (name, value, opts, on) => el('div', { class: 'set-seg', role: 'radiogroup', 'aria-label': name }, opts.map(([v, label]) =>
      el('button', { type: 'button', role: 'radio', 'aria-checked': String(value === v), onclick: () => { on(v); draw(); } }, label)));
    sheet.replaceChildren(el('div', { class: 'set-card' },
      el('div', { class: 'set-head' },
        el('div', { class: 'set-me', style: `background:${p.avatar}` }, (p.name || '·').slice(0, 1).toUpperCase()),
        el('div', {}, el('small', {}, profile.exists ? 'Your profile' : 'Welcome'), el('h3', { id: 'settingsTitle' }, p.name || 'Create your profile')),
        el('button', { type: 'button', class: 'set-close', 'aria-label': 'Close', onclick: close }, '×')),
      el('section', {}, el('h4', {}, 'Account & profile'),
        el('label', { class: 'set-field' }, el('span', {}, 'Name'),
          el('input', { type: 'text', value: p.name, maxlength: 40, placeholder: 'What should KONA call you?', autocomplete: 'nickname', onchange: e => { profile.set({ name: e.target.value }); draw(); } })),
        el('div', { class: 'set-avas' }, avatars),
        el('p', { class: 'set-note' }, 'Stored on this device only. No account needed, nothing is sent anywhere.')),
      el('section', {}, el('h4', {}, 'Appearance'),
        el('div', { class: 'set-row' }, el('span', {}, 'Theme'), seg('Appearance', p.appearance, [['auto','Auto'],['light','Light'],['dark','Dark'],['random','Random']], v => { profile.set({ appearance:v }); applyBrandMode(v); })),
        el('div', { class: 'set-row' }, el('span', {}, 'Graphics quality'), el('div', { class: 'set-opts' }, quality)),
        reloadNeeded ? el('div', { class: 'set-reload' }, el('span', {}, 'Some changes apply after a reload.'), el('button', { type: 'button', class: 'btn primary', onclick: () => location.reload() }, 'Reload now')) : null,
        el('p', { class: 'set-note' }, `Now rendering: ${QUALITY[activeQuality()]?.label || 'Auto'}. Low keeps phones cool and saves data.`)),
      el('section', {}, el('h4', {}, 'Experience'),
        el('div', { class: 'set-row' }, el('span', {}, 'Ambient sound'), seg('Sound', p.sound ? 'on' : 'off', [['off', 'Off'], ['on', 'On']], v => { profile.set({ sound: v === 'on' }); onSound(v === 'on'); })),
        el('div', { class: 'set-row' }, el('span', {}, '3D movement'), seg('Travel', p.travel, [['teleport', 'Teleport'], ['walk', 'Walk']], v => profile.set({ travel: v }))),
        el('div', { class: 'set-row' }, el('span', {}, 'Motion'), seg('Motion', p.motion, [['auto', 'Auto'], ['full', 'Full'], ['reduced', 'Reduced']], v => { profile.set({ motion: v }); reloadNeeded = onMotion(v) || reloadNeeded; }))),
      el('section', {}, el('h4', {}, 'KONA nudges'),
        el('div', { class: 'set-row' }, el('span', {}, 'Tiny optional reasons to come back'), seg('KONA nudges', p.notifications?.enabled?'on':'off', [['off','Off'],['on','On']], v => profile.set({ notifications:{...p.notifications,enabled:v==='on'} }))),
        el('p', { class: 'set-note' }, 'For now these are in-app nudges only. Opening one can earn a small, one-time XP reward. No push permission is requested yet.')),
      el('section', {}, el('h4', {}, 'Account & sync'),
        sync?.available
          ? el('div', { class: 'set-row' }, el('span', {}, p.sync ? `Signed in as ${p.sync.email}` : 'Sign in to sync your KONA progress across devices.'), el('button', { type: 'button', class: 'btn ghost', onclick: () => sync.start() }, 'Open account'))
          : el('p', { class: 'set-note' }, 'Sign in from Me to sync progress. Your profile stays local-first on this device.')),
      el('section', {}, el('h4', {}, 'Privacy & data'),
        el('div', { class: 'set-row' },
          el('button', { type: 'button', class: 'btn ghost', onclick: () => { const b = new Blob([exportAppState()], { type: 'application/json' }); const u=URL.createObjectURL(b); const a = el('a', { href: u, download: 'kona-app-local-data.json' }); document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),0); } }, 'Export everything'),
          el('button', { type: 'button', class: 'btn ghost danger', onclick: () => { const s=appStateSummary(); if (confirm(`Delete all ${s.records} app records from this device? This includes profile, passport, finds, setup and local preferences.`)) { eraseAppState(); location.reload(); } } }, 'Delete everything'))),
      el('p', { class: 'set-foot' }, 'KONA · local-first beta. No account required, no analytics. Export and delete cover all app-owned browser data.')));
  }
  function open() { draw(); sheet.hidden = false; document.body.classList.add('settings-open'); sheet.querySelector('input,button')?.focus({ preventScroll: true }); }
  function close() { sheet.hidden = true; document.body.classList.remove('settings-open'); }
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
  chip?.addEventListener('click', open);
  document.getElementById('introProfile')?.addEventListener('click', open);
  return { open, close };
}
