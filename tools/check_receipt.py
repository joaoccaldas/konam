"""Read-only freshness check of the generated museum receipt."""
import hashlib,json
from pathlib import Path
r=Path(__file__).resolve().parents[1];receipt=json.loads((r/'assets/museum/build-receipt.json').read_text());bad=[]
for group in ('source_sha256','artifact_sha256'):
 for name,want in receipt[group].items():
  p=r/name
  if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=want:bad.append(name)
if bad:raise SystemExit('Rebuild required: '+', '.join(bad))
print('Museum source and artifact fingerprints match.')
