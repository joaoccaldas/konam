// Builds the Kona museum landing.
// Catalogs go to app/museum-data.js. The walkable hall goes to app/hall.js.
// index.html stays the shell: layout, phone-fit, and the script tags.
//   node web/build_landing.mjs
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assembleMuseumData, writeMuseumData } from './museum_data.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
execFileSync(process.execPath,[path.join(root,'tools/build_game_config.mjs')],{cwd:root,stdio:'inherit'});
const data = await assembleMuseumData();
const dataBytes = writeMuseumData(data);
const outfile = path.join(root, 'app/hall.js');
const corefile = path.join(root, 'app/kona-core.js');
const raceselffile = path.join(root, 'app/race-self-stage.js');
const collectiblefile = path.join(root, 'app/collectible-stage.js');
const adminpreviewfile = path.join(root, 'app/admin-asset-preview.js');
const worldshellfile = path.join(root, 'app/world-shell.html');
const viewportfile = path.join(root, 'app/viewport.js');
fs.copyFileSync(path.join(here,'src/runtime/viewport.js'), viewportfile);
await build({
  entryPoints: [path.join(here, 'src/entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: corefile,
  target: 'es2020',
  legalComments: 'none',
});
await build({
  entryPoints: [path.join(here, 'src/race-self-stage-entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: raceselffile,
  target: 'es2020',
  legalComments: 'none',
});
await build({
  entryPoints: [path.join(here, 'src/collectible-stage-entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: collectiblefile,
  target: 'es2020',
  legalComments: 'none',
});
await build({
  entryPoints: [path.join(here, 'src/ui/admin-asset-preview.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: adminpreviewfile,
  target: 'es2020',
  legalComments: 'none',
});
await build({
  entryPoints: [path.join(here, 'src/landing.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile,
  target: 'es2020',
  legalComments: 'none',
});
const coreBundled = fs.readFileSync(corefile, 'utf8').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(corefile, `/* KONA shell. No Three.js. Edit web/src/entry.js */\n${coreBundled}`);
const raceSelfBundled = fs.readFileSync(raceselffile, 'utf8').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(raceselffile, `/* Race Self 3D stage. Edit web/src/ui/race-self-stage.js */\n${raceSelfBundled}`);
const collectibleBundled = fs.readFileSync(collectiblefile, 'utf8').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(collectiblefile, `/* KONA Finds 3D stage. Edit web/src/ui/collectible-stage.js */\n${collectibleBundled}`);
const adminPreviewBundled = fs.readFileSync(adminpreviewfile, 'utf8').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(adminpreviewfile, `/* Admin Asset Portfolio 3D previews. Edit web/src/ui/admin-asset-preview.js */\n${adminPreviewBundled}`);
const bundled = fs.readFileSync(outfile, 'utf8').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(outfile, `/* Hall app. Edit web/src/landing.js. Catalogs: app/museum-data.js */\n${bundled}`);
const html = fs.readFileSync(path.join(here, 'landing.template.html'), 'utf8');
const worldShell = fs.readFileSync(path.join(here, 'world-shell.template.html'), 'utf8');
fs.writeFileSync(worldshellfile, worldShell);
const out = process.env.OUT_HTML || path.join(root, 'index.html');
fs.writeFileSync(out, html);
const pieces = data.pieces;
console.log(`wrote ${path.relative(root, out)} + ${path.relative(root, worldshellfile)} + ${path.relative(root, viewportfile)} · ${pieces.length} pieces (${pieces.filter(p => p.glb).length} modelled) · shell ${(html.length / 1024).toFixed(0)} kB · core ${(coreBundled.length / 1024).toFixed(0)} kB · race-self ${(raceSelfBundled.length / 1024).toFixed(0)} kB · finds-stage ${(collectibleBundled.length / 1024).toFixed(0)} kB · admin-preview ${(adminPreviewBundled.length / 1024).toFixed(0)} kB · data ${(dataBytes / 1024).toFixed(0)} kB · hall ${(bundled.length / 1024).toFixed(0)} kB`);
