import { build } from '../web/node_modules/esbuild/lib/main.js';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'review/beast-cave/beast-cave-review.bundle.js');
fs.mkdirSync(path.dirname(out),{recursive:true});
await build({
  entryPoints:[path.join(root,'web/src/rooms/beast-cave-preview.js')],
  outfile:out,
  bundle:true,
  format:'iife',
  platform:'browser',
  target:['es2020'],
  minify:true,
  sourcemap:false,
  logLevel:'info'
});
