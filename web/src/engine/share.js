// engine/share.js — share what you are looking at.
//
// Captures the 3D view straight after a render (no preserveDrawingBuffer needed), adds a caption
// strip (the exhibit, the room, the museum), and hands the image to the system share sheet (Web Share
// Level 2: Messages, WhatsApp, Mail, Instagram… whatever the device offers). Where files cannot be
// shared, it falls back to sharing the link, then to saving the image.

/** Caption strip layout, pure (tested): returns the lines and the strip height for a width. */
export function captionLayout(width, { title = '', place = '', site = 'KONA · Kailua-Kona' } = {}) {
  const pad = Math.round(width * .035), big = Math.max(18, Math.round(width * .03)), small = Math.max(12, Math.round(width * .018));
  return { pad, big, small, height: pad * 2 + big + small + Math.round(small * .8), lines: [title || place || site, [place && title ? place : '', site].filter(Boolean).join(' · ')] };
}

export async function captureView(renderer, scene, camera, caption = {}) {
  renderer.render(scene, camera);                                    // draw now, read now: same task, buffer still valid
  const src = renderer.domElement;
  const w = src.width, h = src.height, L = captionLayout(w, caption);
  const c = document.createElement('canvas'); c.width = w; c.height = h + L.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.fillStyle = '#fbf9f5'; g.fillRect(0, h, w, L.height);
  g.fillStyle = '#12181d'; g.font = `400 ${L.big}px "Instrument Serif", Georgia, serif`; g.textBaseline = 'top';
  g.fillText(L.lines[0], L.pad, h + L.pad, w - L.pad * 2);
  g.fillStyle = '#5f6a72'; g.font = `600 ${L.small}px Manrope, system-ui, sans-serif`;
  g.fillText(L.lines[1].toUpperCase(), L.pad, h + L.pad + L.big + Math.round(L.small * .6), w - L.pad * 2);
  g.fillStyle = '#e8471c'; g.fillRect(w - L.pad - L.small * 3, h + L.pad, L.small * 3, Math.max(2, L.small * .18));
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', .9));
}

/** Share a blob (or save it). Returns 'shared' | 'link' | 'saved' | 'cancelled'. */
export async function shareImage(blob, { title = 'KONA', text = '', url = location.href, filename = 'kona-share.jpg' } = {}) {
  const file = new File([blob], filename, { type: 'image/jpeg' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title, text: [text, url].filter(Boolean).join('\n') }); return 'shared'; }
    if (navigator.share) { await navigator.share({ title, text, url }); return 'link'; }
  } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
