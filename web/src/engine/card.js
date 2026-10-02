// engine/card.js — one card for every exhibit (bike, painting, sculpture, photograph, room).
//
// A card is plain data (a "card model"); adapters turn catalogue records into models, and
// renderCard() draws them into the #card panel. Everything is built with DOM text nodes, so
// catalogue text can never inject markup. Layout and type scale live in CSS (.card-*), sized with
// clamp() so the card reads the same on a phone, a laptop and a 4K screen.
//
// Model:
// { eyebrow, title, kicker, lede,
//   stats:   [{ value, label }],                       // up to 4 key numbers
//   facts:   [{ cls: 'P'|'F'|'I', text }],             // evidence-classed statements
//   swatches:{ label, items:[{ name, note, colors:[a,b], pressed }], onPick(i) },
//   media:   { src, alt, credit, href, tall },         // one image, credited
//   notes:   [{ summary, text }],                      // collapsed detail (method, provenance)
//   actions: [{ label, primary, onClick, href }] }
export const EVIDENCE = { P: 'Published fact', F: 'Read from the photograph', I: 'Inferred for the model', G: 'Generated for the museum' };

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export function renderCard(m, $ = id => document.getElementById(id)) {
  const card = $('card'); if (!card) return;
  $('cYears').textContent = m.eyebrow || '';
  $('cName').textContent = m.title || '';
  $('cMat').textContent = m.kicker || '';
  $('cNote').textContent = m.lede || '';
  const stats = $('cStats'); stats.replaceChildren(); stats.hidden = !m.stats?.length;
  for (const s of m.stats || []) { const d = el('div'); d.append(el('b', null, s.value), el('small', null, s.label)); stats.append(d); }
  stats.style.gridTemplateColumns = `repeat(${Math.min(4, Math.max(1, m.stats?.length || 1))},1fr)`;

  const media = $('cMedia'); media.replaceChildren();
  if (m.swatches?.items?.length) {
    const row = el('div', 'card-swatches'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', m.swatches.label || 'Liveries');
    m.swatches.items.forEach((s, i) => {
      const b = el('button'); b.type = 'button'; b.setAttribute('aria-pressed', !!s.pressed);
      const dot = el('i'); dot.style.background = `linear-gradient(135deg,${s.colors[0]} 58%,${s.colors[1] || s.colors[0]} 58%)`;
      b.append(dot, el('span', null, s.name)); if (s.note) b.append(el('small', null, s.note));
      b.onclick = () => { row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); m.swatches.onPick?.(i); };
      row.append(b);
    });
    media.append(row);
  }
  if (m.media?.src) {
    const f = el('figure', 'card-media' + (m.media.tall ? ' tall' : ''));
    const img = el('img'); img.src = m.media.src; img.alt = m.media.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
    img.onerror = () => f.remove();
    f.append(img);
    if (m.media.credit) {
      const cap = el('figcaption');
      if (m.media.href) { const a = el('a', null, m.media.credit + ' ↗'); a.href = m.media.href; a.target = '_blank'; a.rel = 'noopener'; cap.append(a); }
      else cap.textContent = m.media.credit;
      f.append(cap);
    }
    media.append(f);
  }
  if (m.facts?.length) {
    const ul = el('ul', 'card-facts');
    for (const f of m.facts) { const li = el('li'); const b = el('b', f.cls, f.cls); b.title = EVIDENCE[f.cls] || ''; li.append(b, el('span', null, f.text)); ul.append(li); }
    media.append(ul);
  }
  for (const n of m.notes || []) {
    const d = el('details', 'card-note'); d.append(el('summary', null, n.summary));
    for (const line of [].concat(n.text)) d.append(el('p', null, line));
    media.append(d);
  }
  const act = $('cActions'); act.replaceChildren();
  for (const a of m.actions || []) {
    const b = a.href ? el('a', `btn ${a.primary ? 'primary' : 'ghost'}`, a.label) : el('button', `btn ${a.primary ? 'primary' : 'ghost'}`, a.label);
    if (a.href) { b.href = a.href; if (/^https?:/.test(a.href)) { b.target = '_blank'; b.rel = 'noopener'; } } else { b.type = 'button'; b.onclick = a.onClick; }
    act.append(b);
  }
  card.dataset.kind = m.kind || '';
  card.classList.add('on'); document.body.classList.add('card-open');
  card.scrollTop = 0;
}

// ---------------------------------------------------------------- adapters: catalogue record → card model
const yearOf = b => b.year || b.era || '';
export function bikeCard(b, { skin, onSkin, next, onNext, onPaint, method } = {}) {
  const g = b.geometry || {};
  const wheel = d => d >= .66 ? '700c' : d >= .615 ? '650c' : d >= .59 ? '24″' : `${Math.round(d * 1000)} mm`;
  const wheels = g.wheel_front === g.wheel_rear ? wheel(g.wheel_front) : `${wheel(g.wheel_front)} / ${wheel(g.wheel_rear)}`;
  const kindLine = { diamond: 'Double diamond', superbike: 'Triathlon superbike', monocoque: 'Monocoque wing', beam: 'Beam frame', funny: 'Low-profile', pursuit: 'Track pursuit' }[b.arch] || b.arch;
  return {
    kind: 'bike',
    eyebrow: [yearOf(b), b.maker].filter(Boolean).join(' · '),
    title: b.name,
    kicker: b.kind === 'type' ? 'Type study · no maker modelled' : 'Rebuilt from an open-licensed photograph',
    lede: b.text,
    stats: [{ value: kindLine, label: 'Frame' }, { value: wheels, label: 'Wheels' }, { value: g.seat_angle ? `${g.seat_angle}°` : '—', label: 'Seat angle' }],
    swatches: { label: 'Liveries', items: b.skins.map(s => ({ name: s.name, note: s.kind === 'photo' ? 'photo' : s.kind === 'studio' ? 'studio' : s.kind, colors: [s.frame, s.accent], pressed: s === skin })), onPick: i => onSkin?.(b.skins[i]) },
    media: b.ref ? { src: `assets/atlas/ref/${b.ref.file}`, alt: `${b.name}: reference photograph`, credit: `${b.ref.artist} · ${b.ref.license} · Wikimedia Commons`, href: b.ref.page } : null,
    facts: b.facts.map(([cls, text]) => ({ cls, text })),
    notes: method ? [{ summary: 'How this model was made', text: method }] : [],
    actions: [next ? { label: `Next: ${next}`, primary: true, onClick: onNext } : null, onPaint ? { label: 'Paint shop', onClick: onPaint } : null].filter(Boolean),
  };
}
export function paintingCard(p, { room, next, onNext } = {}) {
  const pv = p.provenance || {};
  return {
    kind: 'painting',
    eyebrow: [room, p.medium].filter(Boolean).join(' · '),
    title: p.title,
    kicker: pv.kind === 'ai-generated' ? `Generated for the museum · ${pv.tool}` : (p.artist || ''),
    lede: p.text,
    media: { src: `assets/art/paintings/${p.file}`, alt: p.title, tall: p.height > p.width, credit: pv.kind === 'ai-generated' ? `${pv.tool} · ${pv.model} · ${pv.created?.slice(0, 10)}` : p.credit },
    facts: pv.kind === 'ai-generated' ? [{ cls: 'G', text: 'An AI-generated image, commissioned for this museum. It depicts no real event or person.' }] : [],
    notes: pv.prompt ? [{ summary: 'Provenance', text: [`Job ${pv.job_id}`, `Prompt: “${pv.prompt}”`, `Record: ${pv.source_record}`] }] : [],
    actions: next ? [{ label: `Next: ${next}`, primary: true, onClick: onNext }] : [],
  };
}
export function sculptureCard(s, { room } = {}) {
  const pv = s.provenance || {};
  return {
    kind: 'sculpture',
    eyebrow: [room, s.material].filter(Boolean).join(' · '),
    title: s.title, kicker: pv.kind === 'ai-generated' ? `Generated for the museum · ${pv.tool}` : '',
    lede: s.text,
    stats: s.tris ? [{ value: `${Math.round(s.tris / 1000)}k`, label: 'Triangles' }, { value: `${(s.bytes / 1e6).toFixed(1)} MB`, label: 'Model' }] : [],
    facts: pv.kind === 'ai-generated' ? [{ cls: 'G', text: 'A 3D model generated from a text description for this museum.' }] : [],
    notes: pv.prompt ? [{ summary: 'Provenance', text: [`Job ${pv.job_id} · ${pv.model}`, `Prompt: “${pv.prompt}”`, `Record: ${pv.source_record}`] }] : [],
  };
}
export function photoCard(ref) {
  return {
    kind: 'photo', eyebrow: 'Reference photograph', title: ref.caption, kicker: `${ref.artist} · ${ref.license}`,
    lede: 'The models in this wing are scaled from photographs like this one, with the wheel as the ruler. Photographs are shown under their open licences.',
    media: { src: `assets/atlas/ref/${ref.file}`, alt: ref.caption, credit: `${ref.title} · Wikimedia Commons`, href: ref.page },
  };
}
export function roomCard(r, { next, onNext, onDown } = {}) {
  return {
    kind: 'room', eyebrow: r.sub || 'Upper floor', title: r.title || r.name, kicker: r.kindLabel || '', lede: r.text,
    swatches: r.floor && r.vein ? { label: 'Palette', items: [{ name: 'Floor', colors: [r.floor] }, { name: 'Light', colors: [r.vein] }] } : null,
    actions: [next ? { label: `Next: ${next}`, primary: true, onClick: onNext } : null, onDown ? { label: 'Down to the hall', onClick: onDown } : null].filter(Boolean),
  };
}
