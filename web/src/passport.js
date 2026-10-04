import { readPassportState, savePassportState } from './engine/passport-state.js';
import { applyStoredEvent, ensureProgression } from './engine/progression.js';
// The Museum Passport: a reason to come back.
// Stamps for every bike, Kona year, room and night experience you visit; XP and levels; a daily
// streak with a Kona fact of the day; badges for finishing collections; hidden collectibles in the
// night experiences. Registration is on-device (a name, an avatar, a home country) — nothing is
// sent anywhere. A passport code moves it to another device.
const LEVELS = [[0, 'Age-grouper'], [120, 'Kona qualifier'], [320, 'Pro'], [650, 'Podium'], [1000, 'World Champion']];
export const BADGES = [
  { id: 'first-steps', icon: '👣', name: 'First steps', hint: 'Enter the museum', test: s => has(s, 'room:hall') },
  { id: 'queen-k', icon: '🛣️', name: 'The Queen K', hint: 'Visit six bikes in the hall', test: s => count(s, 'bike:') >= 6 },
  { id: 'twelve-octobers', icon: '🌊', name: 'Twelve Octobers', hint: 'Every year on the Kona Pier', test: s => count(s, 'kona:') >= 12 },
  { id: 'night-shift', icon: '🌙', name: 'Night shift', hint: 'All three night experiences', test: s => ['night:lava', 'night:camp13', 'night:tunnel'].every(k => has(s, k)) },
  { id: 'collector', icon: '🗝️', name: 'Collector', hint: 'Find all nine hidden objects', test: s => count(s, 'find:') >= 9 },
  { id: 'historian', icon: '📜', name: 'Historian', hint: 'Walk History Lane from 1985 to today', test: s => count(s, 'history:') >= 10 },
  { id: 'mechanic', icon: '🔧', name: 'Mechanic', hint: 'Open ten parts in exploded views', test: s => count(s, 'part:') >= 10 },
  { id: 'streak-3', icon: '🔥', name: 'Three-day streak', hint: 'Visit three days in a row', test: s => s.best >= 3 },
  { id: 'streak-7', icon: '🏅', name: 'Race week', hint: 'Visit seven days in a row', test: s => s.best >= 7 },
];
const FACTS = [
  'The Kona bike course runs 180 km on the Queen Ka‘ahumanu Highway to Hawi and back.',
  'Jan Frodeno won Kona on a Speedmax in 2015, 2016 and 2019.',
  'Patrick Lange’s 2024 win, 7:35:53, is the Kona course record.',
  'In 2024 Sam Laidlow became the first man under four hours for Kona’s 180 km: 3:57:22.',
  'Canyon began in 1985 as Radsport Arnold, a bike-parts business in Koblenz.',
  'The first Speedmax, sold by Rad Sport Arnold, was reviewed by TRIATHLET in 1999.',
  'The name Canyon replaced Radsport Arnold in 2002; online direct sales followed in 2003.',
  'Kona’s swim starts beside Kailua Pier: 3.8 km out and back in the bay.',
  'In 2025 Kat Matthews set the women’s Kona run record, 2:47:23, on the way to second.',
  'The 2022 championship was Kona’s first held over two days.',
];

const has = (s, k) => !!s.stamps[k];
const count = (s, prefix) => Object.keys(s.stamps).filter(k => k.startsWith(prefix)).length;
const today = () => new Date().toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

function load() {
  return readPassportState();
}
function save(s) { try { Object.assign(s, savePassportState(s)); } catch (_) { } }
export const levelOf = xp => { let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++; return { i, name: LEVELS[i][1], from: LEVELS[i][0], to: LEVELS[i + 1]?.[0] ?? null }; };

export function createPassport() {
  let s = load();
  ensureProgression();
  const listeners = new Set();
  // daily visit: streak and a daily bonus
  const t = today();
  if (s.last !== t) {
    const d = s.last ? dayDiff(s.last, t) : null;
    s.streak = d === 1 ? s.streak + 1 : 1; s.best = Math.max(s.best, s.streak); s.last = t;
    s.xp += 5; s.newDay = true; save(s);
  }
  const toastEl = document.createElement('div'); toastEl.id = 'ppToast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl);
  let tt; const toast = (icon, title, sub) => { toastEl.innerHTML = `<b>${icon}</b><span>${title}<small>${sub || ''}</small></span>`; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 3600); };

  function checkBadges() {
    for (const b of BADGES) if (!s.badges[b.id] && b.test(s)) { s.badges[b.id] = Date.now(); s.xp += 50; setTimeout(() => toast(b.icon, `Badge: ${b.name}`, '+50 XP'), 900); }
  }
  const api = {
    get state() { return s; },
    has: k => has(s, k),
    count: p => count(s, p),
    stamp(id, label, xp = 10) {
      if (s.stamps[id]) return false;
      const before = levelOf(s.xp).i;
      s.stamps[id] = { at: Date.now(), label }; s.xp += xp; checkBadges(); save(s);
      try { applyStoredEvent({ type: id.startsWith('find:') ? 'FIND_DISCOVERED' : 'PRODUCT_VIEWED', subject: id, id: id.startsWith('find:') ? `FIND_DISCOVERED:${id}` : `passport:${id}`, discovery: id }); } catch (_) { }
      const lv = levelOf(s.xp);
      toast(lv.i > before ? '⭐' : '🎟️', lv.i > before ? `Level up: ${lv.name}` : `Stamped: ${label}`, `+${xp} XP · ${s.xp} XP`);
      listeners.forEach(f => f(s)); return true;
    },
    register(profile) { s.profile = { ...profile, created: s.profile?.created || Date.now() }; api.stamp('passport:issued', 'Passport issued', 25); save(s); listeners.forEach(f => f(s)); },
    exportCode: () => btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
    importCode(code) {
      const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (o?.v !== 1 || typeof o.stamps !== 'object') throw new Error('not a passport');
      const clean = { v: 1, profile: o.profile ? { name: String(o.profile.name || '').slice(0, 40), emoji: String(o.profile.emoji || '🚴').slice(0, 4), country: String(o.profile.country || '').slice(0, 40), created: +o.profile.created || Date.now() } : null,
        stamps: {}, xp: Math.max(0, Math.min(1e6, +o.xp || 0)), streak: +o.streak || 0, best: +o.best || 0, last: String(o.last || '').slice(0, 10), badges: {} };
      for (const [k, v] of Object.entries(o.stamps)) if (/^[\w:.-]{1,60}$/.test(k)) clean.stamps[k] = { at: +v.at || 0, label: String(v.label || k).slice(0, 80) };
      for (const k of Object.keys(o.badges || {})) if (BADGES.some(b => b.id === k)) clean.badges[k] = +o.badges[k] || 1;
      s = clean; save(s); listeners.forEach(f => f(s));
    },
    onChange: f => listeners.add(f),
    fact: () => FACTS[Math.floor(Date.parse(today()) / 864e5) % FACTS.length],
    toast,
    open() { render(); sheet.hidden = false; },
  };

  // --- the passport sheet
  const sheet = document.createElement('div'); sheet.id = 'ppSheet'; sheet.hidden = true; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Museum Passport');
  document.body.appendChild(sheet);
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.hidden = true; });
  addEventListener('keydown', e => { if (e.key === 'Escape') sheet.hidden = true; });
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let pick = '🚴';
  function render() {
    const lv = levelOf(s.xp), pct = lv.to ? (s.xp - lv.from) / (lv.to - lv.from) * 100 : 100;
    const reg = !s.profile;
    sheet.innerHTML = `<div class="pp ui-sheet"><button class="x btn-icon" aria-label="Close">×</button>
      <h3>Museum Passport</h3>
      ${reg ? `<p class="note pp-intro-note">Collect stamps for every bike, Kona year and room you visit. Keep a daily streak, earn badges, find the hidden objects in the night experiences.</p>
        <form id="ppForm"><input class="ui-input" name="name" maxlength="40" required placeholder="Your name or nickname" autocomplete="nickname">
        <div class="emo" role="group" aria-label="Avatar">${['🚴', '🏊', '🏃', '🌺', '🌋', '🐢', '🦈', '⚡'].map(e => `<button type="button" data-e="${e}" aria-pressed="${e === pick}">${e}</button>`).join('')}</div>
        <input class="ui-input" name="country" maxlength="40" placeholder="Home country (optional)" autocomplete="country-name">
        <button class="btn-primary pp-go" type="submit">Issue my passport · +25 XP</button></form>
        <p class="note">Your passport lives on this device only — no account, no email, nothing uploaded. Move it with a passport code.</p>`
      : `<div class="who"><span class="av">${esc(s.profile.emoji)}</span><span><small>${esc(lv.name)}${s.profile.country ? ' · ' + esc(s.profile.country) : ''}</small><b>${esc(s.profile.name)}</b></span></div>`}
      <div class="bar"><i style="--pp-progress:${pct.toFixed(1)}%"></i></div>
      <div class="row"><span>${s.xp} XP · ${esc(lv.name)}</span><span>${lv.to ? `${lv.to - s.xp} XP to ${esc(LEVELS[lv.i + 1][1])}` : 'Top level'}</span></div>
      <div class="tiles"><div><b>🔥 ${s.streak}</b><small>day streak</small></div><div><b>${Object.keys(s.stamps).length}</b><small>stamps</small></div><div><b>${Object.keys(s.badges).length}/${BADGES.length}</b><small>badges</small></div></div>
      <div class="fact"><small>Kona fact of the day</small>${esc(api.fact())}</div>
      <h4>Badges</h4><div class="badges">${BADGES.map(b => `<div class="badge${s.badges[b.id] ? '' : ' off'}"><i>${b.icon}</i>${esc(b.name)}<small>${esc(b.hint)}</small></div>`).join('')}</div>
      <h4>Collections</h4><div class="row pp-collections">
        <span>Bikes ${count(s, 'bike:')}/9</span><span>Kona years ${count(s, 'kona:')}/12</span><span>Night experiences ${count(s, 'night:')}/3</span><span>Hidden objects ${count(s, 'find:')}/9</span><span>History ${count(s, 'history:')}/15</span><span>Parts ${count(s, 'part:')}</span></div>
      ${Object.keys(s.stamps).length ? `<h4>Latest stamps</h4><div class="stamps">${Object.entries(s.stamps).sort((a, b) => b[1].at - a[1].at).slice(0, 14).map(([, v]) => `<span>${esc(v.label)}</span>`).join('')}</div>` : ''}
      <details><summary>Passport code — move to another device</summary><p class="note">Copy this code on one device and paste it on another. It contains only what you see here.</p>
        <textarea class="pp-code" id="ppCode" readonly>${api.exportCode()}</textarea><textarea class="pp-code" id="ppIn" placeholder="Paste a passport code"></textarea><button class="btn-secondary pp-go pp-import" id="ppImport">Load this passport</button></details>
    </div>`;
    sheet.querySelector('.x').onclick = () => { sheet.hidden = true; };
    sheet.querySelectorAll('.emo button').forEach(b => b.onclick = () => { pick = b.dataset.e; sheet.querySelectorAll('.emo button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    sheet.querySelector('#ppForm')?.addEventListener('submit', e => { e.preventDefault(); const f = new FormData(e.target); api.register({ name: String(f.get('name')).trim().slice(0, 40), emoji: pick, country: String(f.get('country') || '').trim().slice(0, 40) }); render(); });
    sheet.querySelector('#ppImport').onclick = () => { try { api.importCode(sheet.querySelector('#ppIn').value); render(); toast('🎟️', 'Passport loaded', ''); } catch (_) { toast('⚠️', 'That code is not a passport', ''); } };
  }
  if (s.newDay) { delete s.newDay; save(s); setTimeout(() => toast('🔥', s.streak > 1 ? `${s.streak}-day streak — welcome back` : 'Welcome to the museum', `+5 XP · ${api.fact().slice(0, 70)}…`), 2600); }
  checkBadges(); save(s);
  return api;
}
