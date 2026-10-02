// Builds Studio.html. Models are fetched at runtime.
// Shared catalogs: app/museum-data.js. Studio products: app/studio-catalog.js. App: app/studio.js.
//   node web/build_studio.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { assembleMuseumData, writeMuseumData, writeStudioCatalog } from './museum_data.mjs';

const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..');
writeMuseumData(await assembleMuseumData());
const catalogBytes = writeStudioCatalog();
const outfile = path.join(root, 'app/studio.js');
await build({
  entryPoints: [path.join(here, 'src/studio/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile,
  target: 'es2020',
  legalComments: 'none',
});
const bundled = fs.readFileSync(outfile, 'utf8').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(outfile, `/* Studio app. Edit web/src/studio/main.js. Catalogs: app/museum-data.js then app/studio-catalog.js */\n${bundled}`);
const html = fs.readFileSync(path.join(here, 'studio.template.html'), 'utf8');
fs.writeFileSync(path.join(root, 'Studio.html'), html);
console.log('wrote Studio.html ·', (html.length / 1e3).toFixed(0), 'kB · catalog', (catalogBytes / 1e3).toFixed(0), 'kB · app', (bundled.length / 1e3).toFixed(0), 'kB');
