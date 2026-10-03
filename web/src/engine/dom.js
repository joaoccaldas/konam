// engine/dom.js — tiny shared helpers used by every scene module.
// Kept dependency-free and deterministic; identical output on every device.
export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (dt, rate) => 1 - Math.exp(-dt * rate);
// mulberry32 — same sequence everywhere so seeded decor is reproducible.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Legacy linear congruential variant (kept byte-identical to the museum's original look).
export function rnd7() { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// Inline bundles are parsed speculatively by the browser while the page streams.
// A literal `<img src="${...}">` inside an inline <script> can be fetched as a real
// URL before the script runs (404 noise, wasted requests). Templates therefore emit
// `data-kona-src` and call hydrateImages() after insertion.
export const deferredSrc = url => 'data-kona-src="' + esc(url) + '"';
export function hydrateImages(root) {
  root?.querySelectorAll?.('img[data-kona-src]').forEach(img => { img.src = img.dataset.konaSrc; img.removeAttribute('data-kona-src'); });
  return root;
}
