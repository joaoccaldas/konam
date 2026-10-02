#!/usr/bin/env python3
"""Fail-fast local asset pipeline. No network fetches, shell commands or remote services."""
import argparse,hashlib,json,os,shutil,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--manifest',default='museum/bikes/canyon-speedmax-cfr-axs-my2027-m.json');p.add_argument('--skip-renders',action='store_true');p.add_argument('--samples',type=int,default=64);p.add_argument('--lods',action='store_true');args=p.parse_args()
m=json.loads((ROOT/args.manifest).read_text())
if m['schema_version']!=1 or m['reconstruction_adapter'] not in ['speedmax-4524-photo-v2','speedmax-4520-photo-v1']:
 raise SystemExit('Unsupported adapter. Register and validate a generation-specific adapter before building another bike.')
for ref in m['references']:
 if hashlib.sha256((ROOT/ref['path']).read_bytes()).hexdigest()!=ref['sha256']:raise SystemExit('Reference hash changed: '+ref['path'])
blender=shutil.which('blender') or '/Applications/Blender.app/Contents/MacOS/Blender'
if not Path(blender).exists():raise SystemExit('Blender is required')
SLX=m['product_id']=='4520'
OUT=ROOT/('assets/museum-slx' if SLX else 'assets/museum');OUT.mkdir(exist_ok=True);steps=[]
DATA=ROOT/('blender/data-slx' if SLX else 'blender/data')
REFERENCE=ROOT/('assets/reference/slx/p04.png' if SLX else 'assets/reference/p02.png')
MASTER=ROOT/m['deliverables']['bike']
ENV={'BIKE_PROFILE_DIR':str(DATA),'BIKE_REFERENCE':str(REFERENCE),'BIKE_OUT':str(OUT),'BIKE_VARIANT':'slx' if SLX else 'cfr'}
if SLX:ENV['BIKE_CALIBRATION']=str(DATA/'calibration.json');ENV['BIKE_MM_PER_PX']=str(json.loads((DATA/'calibration.json').read_text())['mm_per_px'])
files=list((ROOT/'blender').glob('*.py'))+list((ROOT/'tools').glob('*.py'))+list((ROOT/'tools').glob('*.mjs'))+list((ROOT/'web/src').glob('*.js'))+list((ROOT/'web/src').glob('*.mjs'))+[ROOT/'web/index.template.html',ROOT/'web/build.mjs',ROOT/args.manifest]+list((ROOT/'web/test').glob('*.mjs'))+[ROOT/'web/smoke.mjs',ROOT/'web/lab-smoke.mjs',ROOT/'web/workshop-smoke.mjs',ROOT/'web/collection.template.html']+list((ROOT/'web/src').glob('*.json'))+list((ROOT/'museum').glob('*.json'))
source_hashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(files)}
def run(name,cmd,cwd=ROOT,extra=None):
 print(name,flush=True);t=time.time();env=os.environ.copy();env.update(ENV);env.update(extra or {})
 with open(OUT/(name+'.log'),'w') as f:
  r=subprocess.run([str(c) for c in cmd],cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
 if r.returncode:raise SystemExit('Failed '+name+'; see '+str(OUT/(name+'.log')))
 if name.startswith(('build','validate','render','lod')):
  tail=(OUT/(name+'.log')).read_text()
  # Blender can return zero for a Python exception without --python-exit-code.
  if 'Traceback (most recent call last)' in tail:raise SystemExit('Blender script failed: '+name)
 steps.append({'step':name,'seconds':round(time.time()-t,2),'exit_code':r.returncode})
def blend(name,file,script,tail):
 run(name,[blender,'-b',file,'--python-exit-code','1','-P',script,'--',*tail])
run('avatar-data',[sys.executable,'tools/build_avatar.py'])
run('avatar-rig',['node','tools/export_avatar.mjs'])
run('fit-data',['node','tools/export_fit.mjs'])
run('photo',[sys.executable,'blender/photo_frame.py',REFERENCE,DATA])
run('graphics',[sys.executable,'blender/extract_graphics.py',*(['--slx'] if SLX else [])])
run('build',[blender,'-b','--factory-startup','--python-exit-code','1','-P','blender/build.py','--',OUT,'--photo',*(['--slx'] if SLX else [])])
blend('validate',MASTER,'blender/validate_asset.py',[OUT/'checks'])
if not SLX and not (OUT/'baseline-checks/silhouette.png').exists():
 blend('validate-baseline',ROOT/'assets/original-2026-09-27/speedmax_cfr_master.blend','blender/validate_asset.py',[OUT/'baseline-checks'])
run('comparison',[sys.executable,'tools/compare_silhouette.py'])
cli=ROOT/'web/node_modules/.bin/gltf-transform'
if not cli.exists():raise SystemExit('Run npm ci in web first')
# sparse=true bakes world transforms incorrectly for parented children with
# shared geometries (rotor/cassette land at 2x world position). Keep sparse off.
run('optimize',[cli,'optimize',OUT/'speedmax_web_raw.glb',OUT/'speedmax_web.glb','--compress','meshopt','--texture-compress','false','--simplify','false','--instance','false','--join','false','--flatten','false','--palette','false','--sparse','false'])
run('viewer',['node','build.mjs'],ROOT/'web',{'GLB':str(OUT/'speedmax_web.glb'),'BIKE_PROFILE':str(ROOT/m['viewer_profile'])})
shutil.copy2(ROOT/'web/dist/index.html',ROOT/m['deliverables']['viewer'])
blend('render',MASTER,'blender/museum_scene.py',[OUT,str(args.samples),*(['none'] if args.skip_renders else [])])
if args.lods:blend('lod',MASTER,'blender/export_game.py',[ROOT/('export/museum-slx' if SLX else 'export/museum')])
if any(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=want for name,want in source_hashes.items()):raise SystemExit('Source changed during the build; rebuild from a stable source state.')
artifacts=[MASTER,OUT/'speedmax_museum.blend',OUT/'speedmax_web.glb',ROOT/m['deliverables']['viewer'],ROOT/'blender/data/rider_pose.json']
receipt={'schema_version':1,'bike':m['id'],'generated_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'steps':steps,'source_sha256':source_hashes,'artifact_sha256':{str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in artifacts},'limitations':m['uncertainties']}
(OUT/'build-receipt.json').write_text(json.dumps(receipt,indent=2));print('Built '+str(ROOT/m['deliverables']['viewer']))
