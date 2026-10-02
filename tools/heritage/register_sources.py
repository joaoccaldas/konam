#!/usr/bin/env python3
"""(Re)write assets/reference/heritage/sources.json: every saved source with URL, capture and SHA-256.

Originals are never modified. Run after adding files; the build refuses to use a reference whose
hash no longer matches its manifest entry.
"""
import hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
H = ROOT / 'assets/reference/heritage'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    old = {}
    if (H / 'sources.json').exists():
        old = {f['path']: f for f in json.loads((H / 'sources.json').read_text())['files']}
    urls = {u.rsplit('/', 1)[1]: u for u in (H / 'catalogs/urls.txt').read_text().split()}
    web = {w['path']: w for w in json.loads((H / 'web_sources.json').read_text())}
    files = []
    for p in sorted(H.rglob('*')):
        if not p.is_file() or p.name in ('sources.json', 'web_sources.json', '.DS_Store'):
            continue
        rel = str(p.relative_to(H))
        e = {'path': rel, 'sha256': sha(p), 'bytes': p.stat().st_size}
        if rel.startswith('catalogs/') and p.name in urls:
            e.update(kind='manufacturer catalog PDF', url=urls[p.name],
                     retrieved='2026-09-27', listed_on='https://www.trekbikes.com/us/en_US/catalog-archive/')
        elif rel in web:
            w = web[rel]
            e.update(kind='Wayback capture', url=w['url'], capture=w['capture'])
            if 'original_url' in w:
                e['original_url'] = w['original_url']
        elif rel == 'catalog-archive-page.html':
            e.update(kind='manufacturer page', url='https://www.trekbikes.com/us/en_US/catalog-archive/', retrieved='2026-09-27')
        elif rel.startswith('derived/'):
            e.update(old.get(rel, {}), sha256=e['sha256'], bytes=e['bytes'])
            e.setdefault('kind', 'derived crop (see provenance)')
        else:
            e.update({k: v for k, v in old.get(rel, {}).items() if k not in ('sha256', 'bytes')})
        if old.get(rel, {}).get('sha256') not in (None, e['sha256']):
            sys.exit('Hash changed for existing source ' + rel + '; inspect before re-registering.')
        files.append(e)
    doc = {'retrieved': '2026-09-27',
           'note': 'Trek manufacturer catalogs (official catalog archive) and Wayback Machine captures of '
                   'trekbikes.com. Originals unchanged. Files under derived/ are crops with provenance.',
           'files': files}
    (H / 'sources.json').write_text(json.dumps(doc, indent=1))
    print(len(files), 'sources registered')


if __name__ == '__main__':
    main()
