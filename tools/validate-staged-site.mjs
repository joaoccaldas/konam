#!/usr/bin/env node
// Staged-site guard: the Pages deploy copies an explicit allowlist into _site. If a page links a
// stylesheet/script that the allowlist forgot, or the service worker's core manifest names a file
// that is not shipped, the live site 404s and every new SW install fails its integrity check.
// Usage: node tools/validate-staged-site.mjs [_site]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.argv[2] || '_site');
const errors = [];
const exists = rel => fs.existsSync(path.join(root, rel.split(/[?#]/)[0]));

const manifestPath = path.join(root, 'app/app-manifest.json');
if (!fs.existsSync(manifestPath)) errors.push('app/app-manifest.json missing from staged site');
else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const rel of manifest.core || []) {
    if (!manifest.files?.[rel]) errors.push(`SW core checksum missing: ${rel}`);
  }
  for (const [rel, expected] of Object.entries(manifest.files || {})) {
    if (!exists(rel)) { errors.push(`SW release file not staged: ${rel}`); continue; }
    const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('base64');
    if(digest!==expected) errors.push(`SW release integrity mismatch: ${rel}`);
  }
}

// Static <link href> / <script src> / <img src> references in staged HTML (template literals skipped).
const ref = /<(?:link|script|img)\b[^>]*?\b(?:href|src)="([^"]+)"/gi;
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const [, url] of html.matchAll(ref)) {
    if (/^(?:[a-z]+:|\/\/|#|data:)/i.test(url) || url.includes('${')) continue;
    if (!exists(url.replace(/^\.?\//, ''))) errors.push(`${file} references unstaged ${url}`);
  }
}

if (errors.length) {
  for (const e of errors) console.error('::error::' + e);
  process.exit(1);
}
console.log(`staged site PASS · ${root}`);
