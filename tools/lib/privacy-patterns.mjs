// Single authority for privacy/secret patterns used by both scanners:
//   tools/scan_private_data.mjs   (every tracked file in the public repository)
//   tools/scan_public_surface.mjs (the staged GitHub Pages site)
// Extend this file; do not fork patterns into either scanner.
import fs from 'node:fs';
import path from 'node:path';

// Decode the ways an address or path can be hidden from a naive regex:
// HTML numeric/named entities and percent-encoding. Scanners match the decoded text,
// so obfuscation (e.g. `name&#64;gmail.com`) is treated exactly like the plain value.
export function decodeForScan(text) {
  return String(text)
    .replace(/&#(\d{1,6});/g, (m, n) => safeCodePoint(+n) ?? m)
    .replace(/&#x([0-9a-f]{1,6});/gi, (m, n) => safeCodePoint(parseInt(n, 16)) ?? m)
    .replace(/&(commat|period|sol|tilde);/gi, (_, n) => ({ commat: '@', period: '.', sol: '/', tilde: '~' }[n.toLowerCase()]))
    .replace(/%40/gi, '@').replace(/%2F/gi, '/').replace(/%7E/gi, '~');
}
const safeCodePoint = n => (n <= 0x10FFFF ? String.fromCodePoint(n) : null);

export const SECRET_PATTERNS = [
  ['private-key', /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/],
  ['github-token', /(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/],
  ['cloud-key', /(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|sk-(?:ant-)?[A-Za-z0-9_-]{20,})/],
  ['supabase-secret', /\bsb_secret_[A-Za-z0-9_-]{10,}|service_role["']?\s*[:=]\s*["']eyJ/],
  ['bearer-token', /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{15,}/i],
];

export const PERSONAL_PATTERNS = [
  ['personal-email', /[A-Za-z0-9._%+-]+@(?:gmail|googlemail|hotmail|outlook|live|icloud|me|yahoo|proton|protonmail)\.(?:com|me)\b/i],
  ['local-machine-path', /\/(?:Users|home)\/[^/\s]+\//],
  // Home-relative workstation paths reveal private project layout (other repos, agent workspaces).
  ['workstation-path', /~\/(?:Developer|Projects|Desktop|Documents|Downloads|Library|\.openclaw|\.gemini|\.claude|\.codex)\b/],
  ['agent-workspace', /\.gemini\/antigravity|antigravity-ide\/(?:brain|scratch)/i],
  ['private-knowledge-ref', /knowledge[- ]hub evidence\s+`?[0-9a-f]{16,}/i],
];

// Declared, owner-approved exceptions. An exception must name the file, the finding kind,
// the exact value it permits and the reason. Anything not declared fails the scan.
export function loadExceptions(root = process.cwd()) {
  const file = path.join(root, 'config/privacy-exceptions.json');
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const e of data.exceptions || []) {
    if (!e.file || !e.kind || !e.value || !e.reason || !e.approved_by) throw new Error('privacy exception missing file/kind/value/reason/approved_by: ' + JSON.stringify(e));
  }
  return data.exceptions || [];
}

// An exception permits a line only when every match of the pattern on that line is the declared value.
export function isExcepted(exceptions, { file, kind, line, re }) {
  return exceptions.some(e => {
    if (e.kind !== kind || !(e.file === file || (e.file.endsWith('/*') && file.startsWith(e.file.slice(0, -1))))) return false;
    if (!re) return line.includes(e.value);
    const all = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    return [...line.matchAll(all)].every(m => m[0] === e.value);
  });
}
