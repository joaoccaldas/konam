let installPrompt = null;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function initInstallExperience({ button, toast }) {
  if (!button) return;
  if (isStandalone) {
    button.hidden = true;
    return;
  }

  button.hidden = false;
  button.textContent = 'Install';

  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });

  addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
    toast?.('Canyon Museum installed');
  });

  button.addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => null);
      installPrompt = null;
      return;
    }
    if (isIOS) {
      toast?.('On iPhone: Share → Add to Home Screen');
      return;
    }
    toast?.('Use your browser menu → Install app / Add to Home screen');
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const localDev = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
    addEventListener('load', async () => {
      if (localDev) {
        // Local development must fail honestly when the server stops. A cached localhost app
        // hides connection failures and makes stale bundles look current.
        const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
        await Promise.all(regs.map(reg => reg.unregister().catch(() => false)));
        return;
      }
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) toast?.('Museum updated — reopen to see what is new'); });
      }).catch(err => console.warn('service worker', err));
    });
  }
}
