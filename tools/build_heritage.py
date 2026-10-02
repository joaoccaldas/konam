#!/usr/bin/env python3
"""Fail-fast build for one heritage exhibit, driven entirely by its manifest.

Usage: build_heritage.py museum/bikes/<id>.json [--skip-renders] [--samples N]

Stages: reference hashes -> Blender build (profile) -> asset checks + registered silhouette
-> photo comparison gate -> meshopt GLB -> viewer HTML -> Cycles stills -> receipt.
No network access, no shell strings. The manifest's `pipeline` block names every path.
"""
import argparse, hashlib, json, os, shutil, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument('manifest'); ap.add_argument('--skip-renders', action='store_true'); ap.add_argument('--samples', type=int, default=48)
args = ap.parse_args()
m = json.loads((ROOT / args.manifest).read_text())
if m['schema_version'] != 1 or not m['reconstruction_adapter'].startswith('heritage-'):
    raise SystemExit('Not a heritage manifest')
pl = m['pipeline']
if pl['adapter_module'] != 'blender/heritage_build.py':
    raise SystemExit('Unregistered adapter module: ' + pl['adapter_module'])
for ref in m['references']:
    if hashlib.sha256((ROOT / ref['path']).read_bytes()).hexdigest() != ref['sha256']:
        raise SystemExit('Reference hash changed: ' + ref['path'])
blender = shutil.which('blender') or '/Applications/Blender.app/Contents/MacOS/Blender'
if not Path(blender).exists():
    raise SystemExit('Blender is required')
OUT = ROOT / pl['out_dir']; OUT.mkdir(parents=True, exist_ok=True)
PROFILE = ROOT / pl['profile']; MASTER = ROOT / m['deliverables']['bike']
REFERENCE = ROOT / json.loads(PROFILE.read_text())['photo']['path']
steps = []
watched = [PROFILE, ROOT / args.manifest, ROOT / m['viewer_profile']] + [ROOT / p for p in (
    'blender/heritage_build.py', 'blender/heritage_validate.py', 'blender/lib.py', 'blender/frame.py', 'blender/decals.py',
    'blender/museum_scene.py', 'tools/heritage_compare.py', 'tools/build_heritage.py', 'web/build_heritage.mjs',
    'web/src/heritage.js', 'web/heritage.template.html')]
source_hashes = {str(f.relative_to(ROOT)): hashlib.sha256(f.read_bytes()).hexdigest() for f in watched}


def run(name, cmd, cwd=ROOT, env=None):
    print(name, flush=True); t = time.time(); e = os.environ.copy(); e.update(env or {})
    with open(OUT / (name + '.log'), 'w') as f:
        r = subprocess.run([str(c) for c in cmd], cwd=cwd, env=e, stdout=f, stderr=subprocess.STDOUT)
    log = (OUT / (name + '.log')).read_text()
    if r.returncode or 'Traceback (most recent call last)' in log:
        raise SystemExit('Failed ' + name + '; see ' + str(OUT / (name + '.log')))
    steps.append({'step': name, 'seconds': round(time.time() - t, 2), 'exit_code': r.returncode})


run('build', [blender, '-b', '--factory-startup', '--python-exit-code', '1', '-P', 'blender/heritage_build.py', '--', PROFILE, OUT, MASTER])
run('validate', [blender, '-b', MASTER, '--python-exit-code', '1', '-P', 'blender/heritage_validate.py', '--', PROFILE, OUT / 'checks'])
run('comparison', [sys.executable, 'tools/heritage_compare.py', PROFILE, OUT / 'checks'])
cli = ROOT / 'web/node_modules/.bin/gltf-transform'
if not cli.exists():
    raise SystemExit('Run npm ci in web first')
run('optimize', [cli, 'optimize', OUT / 'speedmax_web_raw.glb', OUT / 'speedmax_web.glb', '--compress', 'meshopt', '--texture-compress', 'false',
                 '--simplify', 'false', '--instance', 'false', '--join', 'false', '--flatten', 'false', '--palette', 'false', '--sparse', 'false'])
viewer = ROOT / m['deliverables']['viewer']
run('viewer', ['node', 'build_heritage.mjs'], ROOT / 'web', {'GLB': str(OUT / 'speedmax_web.glb'), 'BIKE_PROFILE': str(ROOT / m['viewer_profile']),
                                                             'OUT_HTML': str(viewer),
                                                             'CHECKS_DIR': str(OUT / 'checks'), 'HERITAGE_PROFILE': str(PROFILE)})
run('render', [blender, '-b', MASTER, '--python-exit-code', '1', '-P', 'blender/museum_scene.py', '--', OUT, str(args.samples),
               'none' if args.skip_renders else 'hero,side,cockpit,drivetrain,rear'], env={'BIKE_REFERENCE': str(REFERENCE)})
if any(hashlib.sha256((ROOT / n).read_bytes()).hexdigest() != h for n, h in source_hashes.items()):
    raise SystemExit('Source changed during the build; rebuild from a stable source state.')
artifacts = [MASTER, OUT / 'speedmax_museum.blend', OUT / 'speedmax_web.glb', viewer]
receipt = {'schema_version': 1, 'bike': m['id'], 'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'steps': steps,
           'source_sha256': source_hashes,
           'artifact_sha256': {str(f.relative_to(ROOT)): hashlib.sha256(f.read_bytes()).hexdigest() for f in artifacts},
           'checks': json.loads((OUT / 'checks/geometry-checks.json').read_text()),
           'silhouette': json.loads((OUT / 'checks/silhouette-report.json').read_text()),
           'limitations': m['uncertainties']}
(OUT / 'build-receipt.json').write_text(json.dumps(receipt, indent=2))
print('Built ' + str(viewer))
