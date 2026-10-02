import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const here=path.dirname(new URL(import.meta.url).pathname);
const root=path.resolve(here,'..');
const outfile=path.join(root,'app/nor3-review.js');
await build({
  entryPoints:[path.join(here,'src/room-review-norwegian.js')],
  bundle:true,
  format:'iife',
  minify:true,
  outfile,
  target:'es2020',
  legalComments:'none'
});
const bundled=fs.readFileSync(outfile,'utf8').replace(/<\/script/gi,'<\\/script');
fs.writeFileSync(outfile,'/* NOR // 3 review bundle. Edit web/src/room-review-norwegian.js */\n'+bundled);
console.log('built app/nor3-review.js · '+(bundled.length/1024).toFixed(0)+' kB');
