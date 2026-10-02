import { build } from '../web/node_modules/esbuild/lib/main.js';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');

async function bundle(entry,outfile){
  fs.mkdirSync(path.dirname(outfile),{recursive:true});
  await build({
    entryPoints:[entry],
    outfile,
    bundle:true,
    format:'iife',
    platform:'browser',
    target:['es2020'],
    minify:true,
    sourcemap:false,
    logLevel:'info'
  });
}

await bundle(
  path.join(root,'web/src/rooms/beast-cave-preview.js'),
  path.join(root,'review/beast-cave/beast-cave-review.bundle.js')
);
await bundle(
  path.join(root,'experiences/beast-cave/beast-cave-experience.js'),
  path.join(root,'experiences/beast-cave/beast-cave-experience.bundle.js')
);
