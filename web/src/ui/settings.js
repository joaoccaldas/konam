import { applyBrandMode } from '../brand/runtime.js';
import { exportAppState, eraseAppState, appStateSummary } from '../engine/app-state.js';
import { PRODUCT_NAME } from '../product-meta.js';
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
  let reloadNeeded = false, returnFocus = null;
  const focusable = () => [...sheet.querySelectorAll('button,input,select,a[href],[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);

  function draw() {
    const oldFocus = document.activeElement;
    const oldIndex = focusable().indexOf(oldFocus);
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
          el('input', { type: 'text', value: p.name, maxlength: 40, placeholder: `What should ${PRODUCT_NAME} call you?`, autocomplete: 'nickname', onchange: e => { profile.set({ name: e.target.value }); draw(); } })),
        el('div', { class: 'set-avas' }, avatars),
        el('p', { class: 'set-note' }, 'Stored on this device by default. Cloud backup sends your profile only when you choose Back up. Fonts, public news and weather contact their providers.')),
      el('section', {}, el('h4', {}, 'Appearance'),
        el('div', { class: 'set-row' }, el('span', {}, 'Theme'), seg('Appearance', p.appearance, [['auto','Auto'],['light','Light'],['dark','Dark'],['random','Random']], v => { profile.set({ appearance:v }); applyBrandMode(v); })),
        el('div', { class: 'set-row' }, el('span', {}, 'Graphics quality'), el('div', { class: 'set-opts' }, quality)),
        reloadNeeded ? el('div', { class: 'set-reload' }, el('span', {}, 'Some changes apply after a reload.'), el('button', { type: 'button', class: 'btn primary', onclick: () => location.reload() }, 'Reload now')) : null,
        el('p', { class: 'set-note' }, `Now rendering: ${QUALITY[activeQuality()]?.label || 'Auto'}. Low keeps phones cool and saves data.`)),
      el('section', {}, el('h4', {}, 'Experience'),
        el('div', { class: 'set-row' }, el('span', {}, 'Ambient sound'), seg('Sound', p.sound ? 'on' : 'off', [['off', 'Off'], ['on', 'On']], v => { profile.set({ sound: v === 'on' }); onSound(v === 'on'); })),
        el('div', { class: 'set-row' }, el('span', {}, '3D movement'), seg('Travel', p.travel, [['teleport', 'Teleport'], ['walk', 'Walk']], v => profile.set({ travel: v }))),
        el('div', { class: 'set-row' }, el('span', {}, 'Motion'), seg('Motion', p.motion, [['auto', 'Auto'], ['full', 'Full'], ['reduced', 'Reduced']], v => { profile.set({ motion: v }); reloadNeeded = onMotion(v) || reloadNeeded; }))),
      el('section', {}, el('h4', {}, PRODUCT_NAME+' nudges'),
        el('div', { class: 'set-row' }, el('span', {}, 'Tiny optional reasons to come back'), seg(PRODUCT_NAME+' nudges', p.notifications?.enabled?'on':'off', [['off','Off'],['on','On']], v => profile.set({ notifications:{...p.notifications,enabled:v==='on'} }))),
        el('p', { class: 'set-note' }, 'For now these are in-app nudges only. Opening one can earn a small, one-time XP reward. No push permission is requested yet.')),
      el('section', {}, el('h4', {}, 'Account & sync'),
        sync?.available
          ? el('div', { class: 'set-row' }, el('span', {}, p.sync ? `Signed in as ${p.sync.email}` : `Sign in to back up your Kona across devices.`), el('button', { type: 'button', class: 'btn ghost', onclick: () => sync.start() }, 'Open account'))
          : el('p', { class: 'set-note' }, 'Your profile stays on this device. Account access is optional.')),
      el('section', {}, el('h4', {}, 'Privacy & data'),
        el('div', { class:'set-row' }, el('span', {}, 'Anonymous usage analytics'), seg('Analytics', p.analytics?'on':'off', [['off','Off'],['on','On']], v=>profile.set({analytics:v==='on'}))),
        el('p', { class:'set-note' }, 'Off by default. When enabled on the public website, session-only usage and coarse error categories help improve Kona.m. Switching off clears the analytics session on this device.'),
        el('p', {class:'set-note'}, 'Device deletion does not remove your cloud backup or account. Manage a saved backup from Progress. ', el('a',{href:'privacy.html'},'Privacy & data notice'), ' · ', el('a',{href:'credits.html'},'Photo credits')),
        el('div', { class: 'set-row' },
          el('button', { type: 'button', class: 'btn ghost', onclick: () => { const b = new Blob([exportAppState()], { type: 'application/json' }); const u=URL.createObjectURL(b); const a = el('a', { href: u, download: 'kona-app-local-data.json' }); document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),0); } }, 'Export device data'),
          el('button', { type: 'button', class: 'btn ghost danger', onclick: () => { const s=appStateSummary(); if (confirm(`Delete all ${s.records} app records from this device? This includes profile, passport, finds, setup and local preferences.`)) { eraseAppState(); location.reload(); } } }, 'Delete device data'))),
      el('p', { class: 'set-foot' }, PRODUCT_NAME+' · local-first beta. No account required. Analytics is optional and off by default. Export and delete cover app-owned device and session data.')));
    if(oldIndex>=0) focusable()[oldIndex]?.focus({preventScroll:true});
  }
  function open() { returnFocus=document.activeElement; draw(); sheet.hidden = false; document.body.classList.add('settings-open'); sheet.querySelector('input,button')?.focus({ preventScroll: true }); }
  function close() { sheet.hidden = true; document.body.classList.remove('settings-open'); if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true}); }
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
  addEventListener('keydown', e => {
    if(sheet.hidden)return;
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key==='Tab'){
      const nodes=focusable(),first=nodes[0],last=nodes.at(-1);
      if(!first){e.preventDefault();return;}
      if(!sheet.contains(document.activeElement)||(e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last)){e.preventDefault();(e.shiftKey?last:first).focus();}
    }
  });
  document.addEventListener('focusin', e=>{if(!sheet.hidden&&!sheet.contains(e.target))focusable()[0]?.focus({preventScroll:true});});
  chip?.addEventListener('click', open);
  document.getElementById('introProfile')?.addEventListener('click', open);
  return { open, close };
}
