import { initInstall } from './ui/install.js';
// The museum as an installable app.
//  - Web (Android Chrome, desktop, iOS Safari): a service worker (sw.js) keeps the museum offline and
//    installs updates only after verifying every file's SHA-256 against the release manifest. When a
//    verified update is waiting, a pill offers "Reload"; nothing changes under the visitor mid-walk.
//  - Android app (Capacitor build, see app/native): the museum ships inside the APK. On launch it asks
//    the museum's HTTPS site for app/android-version.json and offers the newer APK when there is one;
//    Android only installs it over this one if it carries the same signing key.
const SITE = 'https://joaoccaldas.github.io/canyonmuseum/';
const $ = id => document.getElementById(id);
function ensureUpdateBar(){
 let el=$('updateBar');if(el)return el;
 el=document.createElement('div');el.id='updateBar';el.hidden=true;el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 el.innerHTML='<span></span><button type="button"></button><button type="button" class="later" aria-label="Later">×</button>';
 document.body.append(el);return el;
}

function pill(text, action, onAction) {
  const el = ensureUpdateBar();
  el.querySelector('span').textContent = text;
  const b = el.querySelector('button, a.go'); b.textContent = action;
  if (typeof onAction === 'string') { b.outerHTML = `<a class="go" href="${onAction}" rel="noopener">${action}</a>`; }
  else b.onclick = onAction;
  el.hidden = false;
  el.querySelector('.later').onclick = () => { el.hidden = true; };
}

async function nativeUpdateCheck() {
  const mine = window.__NATIVE?.versionCode | 0;
  try {
    const res = await fetch(SITE + 'app/android-version.json', { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) return;
    const v = await res.json();
    if ((v.versionCode | 0) > mine && typeof v.apk === 'string' && !/^[a-z]+:/i.test(v.apk))   // only a path on our own site
      pill(`KONA ${v.versionName} is available`, 'Download', SITE + v.apk);
  } catch (_) { /* offline: try next launch */ }
}

export function initAppShell() {
  if (window.__appShell) return;
  window.__appShell = true;
  if (window.Capacitor?.isNativePlatform?.()) { document.body.classList.add('native'); nativeUpdateCheck(); return; }
  initInstall();

  // --- offline + verified updates
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  let wantReload = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (wantReload) { wantReload = false; location.reload(); } });
  navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(reg => {
    const offer = w => pill('KONA update verified and ready', 'Reload', () => { wantReload = true; w.postMessage('skip-waiting'); });
    const activateOrOffer = w => {
      const inWorld = document.body.classList.contains('museum-open') || document.body.classList.contains('walking');
      if (!inWorld) { wantReload = true; w.postMessage('skip-waiting'); }
      else offer(w);
    };
    if (reg.waiting && navigator.serviceWorker.controller) activateOrOffer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) activateOrOffer(w); });
    });
    const check = () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); };
    setInterval(check, 30 * 60 * 1000); document.addEventListener('visibilitychange', check);
  }).catch(e => console.warn('offline mode unavailable', e));
}
