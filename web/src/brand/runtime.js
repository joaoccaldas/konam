// brand/runtime.js — one runtime contract for Light, Dark and Random presentation.
// Random is stable for the current browser session to avoid visual flicker and screenshot drift.

export const RANDOM_FAMILIES = ['lava','ocean','hibiscus','lilac','lime'];
const SESSION_KEY = 'kona.brand.random-family.v1';

const safeSession = () => {
  try { return window.sessionStorage; } catch (_) { return null; }
};

export function randomFamily(store = safeSession()) {
  try {
    const existing = store?.getItem?.(SESSION_KEY);
    if (RANDOM_FAMILIES.includes(existing)) return existing;
    let n = Date.now();
    try {
      const a = new Uint32Array(1);
      globalThis.crypto?.getRandomValues?.(a);
      if (a[0]) n = a[0];
    } catch (_) {}
    const family = RANDOM_FAMILIES[Math.abs(n) % RANDOM_FAMILIES.length];
    store?.setItem?.(SESSION_KEY, family);
    return family;
  } catch (_) {
    return RANDOM_FAMILIES[0];
  }
}

export function applyBrandMode(value = 'auto', root = document.documentElement) {
  const appearance = ['auto','light','dark','random'].includes(value) ? value : 'auto';
  if (appearance === 'auto') {
    root.removeAttribute('data-theme');
    root.removeAttribute('data-random-family');
    return { appearance, family: null };
  }
  if (appearance === 'random') {
    const family = randomFamily();
    root.dataset.theme = 'random';
    root.dataset.randomFamily = family;
    return { appearance, family };
  }
  root.dataset.theme = appearance;
  root.removeAttribute('data-random-family');
  return { appearance, family: null };
}
