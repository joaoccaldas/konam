import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('consumer entry actually compiles, including all imported UI modules', async()=>{
 const result=await build({entryPoints:[fileURLToPath(new URL('../src/entry.js',import.meta.url))],bundle:true,write:false,platform:'browser',logLevel:'silent'});
 assert.ok(result.outputFiles[0].contents.length>0);
});
