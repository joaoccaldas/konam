import {createHash} from 'node:crypto';

// Authorize only the exact generated inline scripts, including boot profiles.
// Re-run after changing inline content or rebasing a generated viewer URL.
export function sealInlineScripts(html){
  const hashes=new Set();
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/\bsrc\s*=/i.test(match[1]))continue;
    hashes.add("'sha256-"+createHash('sha256').update(match[2]).digest('base64')+"'");
  }
  return html.replace(/(<meta http-equiv="Content-Security-Policy" content=")([^"]+)(">)/i,(_,before,policy,after)=>before+policy.replace(/script-src [^;]+/,"script-src 'self' 'wasm-unsafe-eval'"+(hashes.size?' '+[...hashes].join(' '):''))+after);
}
