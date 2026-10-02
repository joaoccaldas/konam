"""Manifest-driven heritage build. Everything bike-specific comes from the manifest and its adapter.

blender -b --factory-startup --python-exit-code 1 -P blender/heritage/build_heritage.py -- <manifest.json> [--quick]
"""
import bpy, sys, os, json, time, importlib
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
bpy.ops.wm.read_factory_settings(use_empty=True)
from lib import mat, MM
import skeleton as SK

argv = sys.argv[sys.argv.index('--') + 1:]
man = json.load(open(os.path.join(ROOT, argv[0])))
QUICK = '--quick' in argv
pipe = man['pipeline']
spec = json.load(open(os.path.join(ROOT, man['source_geometry'])))
cal = json.load(open(os.path.join(ROOT, pipe['data_dir'], 'calibration.json')))
size = cal['size_match']['size']
if not cal['size_match']['within_1pct']:
    raise SystemExit('Photographed size not identified within 1%; refusing to build.')
adapter = importlib.import_module(pipe['adapter_module'])
if adapter.ADAPTER != man['reconstruction_adapter']:
    raise SystemExit('Adapter module %s does not implement %s' % (pipe['adapter_module'], man['reconstruction_adapter']))
OUT = os.path.join(ROOT, pipe['out_dir'])
os.makedirs(OUT, exist_ok=True)
t0 = time.time()

pal = pipe.get('palette', {})
def col(k, d):
    return tuple(pal.get(k, d))
M = {
    'paint_blue': mat('paint_blue', col('paint_blue', (.035, .09, .52)), metal=.35, rough=.3, coat=1, coat_rough=.05),
    'paint_white': mat('paint_white', col('paint_white', (.86, .87, .9)), rough=.3, coat=1, coat_rough=.05),
    'carbon': mat('carbon_fork', (.02, .02, .022), rough=.3, coat=.8, coat_rough=.08),
    'rim_alu': mat('rim_alu', (.6, .61, .63), metal=1, rough=.3),
    'tyre': mat('rubber_tyre', (.03, .03, .03), rough=.65),
    'hub': mat('alu_hub', (.62, .63, .65), metal=1, rough=.28),
    'spoke': mat('steel_spoke', (.04, .04, .045), metal=.8, rough=.35),
    'steel': mat('steel', (.75, .75, .77), metal=1, rough=.22),
    'chain': mat('steel_chain', (.55, .55, .57), metal=1, rough=.3),
    'alu_silver': mat('alu_silver', (.72, .73, .75), metal=1, rough=.2),
    'alu_dark': mat('alu_dark', (.16, .165, .175), metal=1, rough=.34),
    'alu_black': mat('alu_black', (.03, .03, .035), metal=.8, rough=.38),
    'black': mat('plastic_black', (.02, .02, .02), rough=.5),
    'bar_tape': mat('bar_tape', (.025, .025, .027), rough=.8),
    'pad': mat('pad_foam', (.03, .03, .032), rough=.85),
    'saddle': mat('saddle_leather', (.02, .02, .022), rough=.55),
}
ctx = {'M': M, 'spec': spec, 'size': size, 'cal': cal, 'notes': [],
       'voxel_mm': 2.2 if QUICK else 1.2, 'frame_tris': None if QUICK else 160000, 'fork_tris': None if QUICK else 50000}
sk = adapter.build(ctx)

g = spec['geometry']; i = g['sizes'].index(size)
d = sk['derived']
meta = {
    'bike_id': man['id'], 'model': man['brand'] + ' ' + man['model'], 'model_year': man['model_year'], 'size': size,
    'adapter': adapter.ADAPTER, 'units': 'metres, +X forward, +Z up (Blender); glTF is Y-up',
    'published_mm': {k: g[k][i] for k in ('wheelbase', 'chainstay', 'bb_height', 'head_tube', 'seat_tube',
                                          'effective_top_tube', 'head_tube_angle', 'seat_tube_angle', 'fork_offset')},
    'derived_from_published_mm': {k: round(v, 2) for k, v in d.items()},
    'axles_m': {'front': list(sk['AX_F'] * MM), 'rear': list(sk['AX_R'] * MM), 'bb': list(sk['BB'] * MM)},
    'steer_axis': {'top': list(sk['HT_TOP'] * MM), 'dir': list(sk['STEER_UP'])},
    'notes': ctx['notes'],
}
info = bpy.data.objects.new('bike_info', None)
bpy.context.scene.collection.objects.link(info)
info['bike'] = json.dumps(meta)
bpy.context.scene['bike'] = json.dumps(meta)
tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
print('[heritage %.1fs] objects %d, triangles %d' % (time.time() - t0, len(bpy.context.scene.objects), tri), flush=True)
print(json.dumps(meta, indent=1))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, man['deliverables']['bike']))
for o in bpy.context.scene.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'bike_web_raw.glb'), export_format='GLB', use_selection=True,
                          export_extras=True, export_yup=True, export_apply=True, export_normals=True,
                          export_materials='EXPORT', export_cameras=False, export_lights=False)
json.dump(meta, open(os.path.join(OUT, 'build-meta.json'), 'w'), indent=2)
print('[heritage %.1fs] saved' % (time.time() - t0))
