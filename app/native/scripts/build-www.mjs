// Assembles www/ for the Android build from the published museum at the repo root.
//
//   index.html, *_Museum.html, Canyon_Collection.html, manifest, app/icons  -> www/
//   assets/** (bikes, paintings, environment maps)                          -> www/assets/
//
// The service worker is left out: inside the app the museum is already on the phone. Instead the
// page learns its own version (window.__NATIVE) and checks the site's app/android-version.json
// over HTTPS for a newer APK.
//
// Environment (set by CI):  SPEEDMAX_VERSION_CODE, SPEEDMAX_VERSION_NAME
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const www = join(here, '..', 'www');
// Use the same public allowlist and integrity checks as Pages. Stage outside app/native:
// Node refuses to copy an ancestor app/ into app/native/www/app even with a filter.
const staged = join(root, '_site');
rmSync(staged, { recursive: true, force: true });
execFileSync('bash', [join(root, 'tools', 'stage_site.sh')], { cwd: root, stdio: 'inherit' });
rmSync(www, { recursive: true, force: true });
cpSync(staged, www, { recursive: true });
rmSync(join(www, 'sw.js'), { force: true });

const versionCode = Number.parseInt(process.env.SPEEDMAX_VERSION_CODE || '0', 10) || 0;
const versionName = (process.env.SPEEDMAX_VERSION_NAME || 'dev').replace(/[^\w.-]/g, '').slice(0, 20);
const index = join(www, 'index.html');
writeFileSync(index, readFileSync(index, 'utf8').replace('<head>', `<head>\n<script>window.__NATIVE=${JSON.stringify({ versionCode, versionName })};</script>`));
console.log(`www ready · version ${versionName} (${versionCode})`);
