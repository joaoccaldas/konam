"""Build the Canyon Speedmax CFR AXS (MY2027, size M) and export the web master GLB.

blender -b --factory-startup -P blender/build.py -- <out_dir> [--render] [--quick]
"""
import bpy, sys, os, math, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
bpy.ops.wm.read_factory_settings(use_empty=True)
from mathutils import Vector, Matrix
from lib import *
import frame as FR
import components as CO
import cockpit as CK
import decals as DC

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(HERE, '..', 'assets')
RENDER = '--render' in argv
QUICK = '--quick' in argv
PHOTO = '--photo' in argv
SLX = '--slx' in argv
if SLX:
 import slx_adapter
 slx_adapter.install()
if PHOTO:
    import photo_model
    FR.build_frame = photo_model.build_frame
    FR.build_fork_raw = photo_model.build_fork_raw
    FR.fork_steerer = photo_model.fork_steerer
os.makedirs(OUT, exist_ok=True)
t0 = time.time()


def log(*a):
    print('[speedmax %5.1fs]' % (time.time() - t0), *a, flush=True)


# ------------------------------------------------------------------ materials (names are the web contract)
M = {
    'paint': mat('paint_frame', (.90, .89, .92), rough=.28, coat=1.0, coat_rough=.04),
    'decal_dark': mat('decal_dark', (.012, .012, .014), rough=.42),
    'decal_light': mat('decal_light', (.72, .72, .72), rough=.5),
    'carbon': mat('carbon_cockpit', (.018, .018, .02), rough=.36, coat=.5, coat_rough=.12),
    'carbon_crank': mat('carbon_crank', (.03, .03, .033), rough=.3, coat=.8),
    'rim': mat('carbon_rim', (.02, .02, .022), rough=.42, coat=.3),
    'tyre': mat('rubber_tyre', (.025, .025, .025), rough=.62),
    'rubber': mat('rubber_grip', (.03, .03, .03), rough=.8),
    'pad': mat('pad_foam', (.03, .03, .032), rough=.85),
    'steel': mat('steel_cassette', (.78, .78, .8), metal=1, rough=.22),
    'rotor': mat('steel_rotor', (.8, .8, .82), metal=1, rough=.28),
    'chain': mat('steel_chain', (.72, .72, .74), metal=1, rough=.26),
    'alu_black': mat('alu_black', (.03, .03, .035), metal=.9, rough=.38),
    'alu_dark': mat('alu_dark', (.16, .165, .175), metal=1, rough=.34),
    'alu_silver': mat('alu_silver', (.68, .69, .71), metal=1, rough=.24),
    'black': mat('plastic_black', (.02, .02, .02), rough=.5),
    'hub': mat('alu_hub', (.04, .04, .045), metal=.9, rough=.35),
    'spoke': mat('steel_spoke', (.03, .03, .03), metal=.8, rough=.35),
    'bottle': mat('bottle_smoke', (.10, .10, .11), rough=.12, alpha=.55, double=True),
    'led': mat('led_green', (.1, 1, .3), emit=(.2, 1, .35), strength=6),
}

# ------------------------------------------------------------------ frame + fork
VOX = .0022 if QUICK else .0011
log('frame members')
raw = FR.build_frame(M)
me = FR.voxelize(raw, VOX, 28 if PHOTO else 5, .68 if PHOTO else .5, target=None if QUICK else 190000)
frame = bpy.data.objects.new('frame', me)
bpy.context.scene.collection.objects.link(frame)
frame.location = raw.location
WORLD['frame'] = raw.location.copy()
bpy.data.objects.remove(raw)
me.materials.clear(); me.materials.append(M['paint'])
frame['part'] = 'frame'; frame['explode'] = [0, 0, 0]
log('frame tris', sum(len(p.vertices) - 2 for p in me.polygons))

raw = FR.build_fork_raw(M)
st = FR.fork_steerer()
V, F, _ = join_geo([([Vector(raw.matrix_world @ v.co) if False else raw.location + v.co for v in raw.data.vertices],
                     [list(p.vertices) for p in raw.data.polygons]), (st[0], st[1])])
bpy.data.objects.remove(raw)
raw = mesh('fork_raw', V, F, M['paint'])
me = FR.voxelize(raw, VOX * .9, 28 if PHOTO else 5, .68 if PHOTO else .5, target=None if QUICK else 70000)
fork = bpy.data.objects.new('fork', me)
bpy.context.scene.collection.objects.link(fork)
fork.location = raw.location
WORLD['fork'] = raw.location.copy()
bpy.data.objects.remove(raw)
me.materials.clear(); me.materials.append(M['paint'])
fork['part'] = 'fork'; fork['explode'] = [.2, 0, -.16]
log('fork tris', sum(len(p.vertices) - 2 for p in me.polygons))

# ------------------------------------------------------------------ components
log('components')
lid = CK.build_tt_lid(M)
riser = CK.build_riser(M)
bar = CK.build_basebar(M)
levers = CK.build_levers(M)
shield, pads = CK.build_aeroshield(M)
ext, blips = CK.build_extensions(M)
tray, bottle_f = CK.build_aerofuel_front(M)
post = CK.build_seatpost(M)
cages, bottles_r = CK.build_rear_hydration(M)
saddle = CK.build_saddle(M)

wf = CO.build_wheel(M, 'front', None)
wr = CO.build_wheel(M, 'rear', None)
chainE, meta = CO.build_chain(M, render_links=True)
crank = CO.build_crankset(M)
bbp = CO.build_bb(M)
fd = CO.build_fd(M)
rd = CO.build_rd(M, meta)
cals = CO.build_calipers(M)
axles = CO.build_axles(M)

# UDH hanger
udh = CO.PB().add(box(FR.AX_R + Vector((-6, -80.5, -14)), (26, 5, 44), 3), M['alu_black']).build(
    'udh_hanger', sharp=40, part='udh_hanger', explode=[-.1, -.12, 0])

# ------------------------------------------------------------------ decals
log('decals')
bvh_frame = DC.bvh_of(frame)
bvh_fork = DC.bvh_of(fork)
d_dt = Vector((0.598, 0, 0.802)).normalized()
dec = []
for n in (Vector((0, -1, 0)), Vector((0, 1, 0))):
    u = n.cross(d_dt)
    dec.append(DC.project_text(bvh_frame, 'CANYON', 50, Vector((216, 0, 512)), d_dt, u, length_mm=400))
    # CFR mark on the top tube flank
    dx = Vector((1, 0, 0)) if n.y < 0 else Vector((-1, 0, 0))
    dec.append(DC.project_text(bvh_frame, 'CFR', 13, Vector((130, 0, 767)), dx, n.cross(dx), spacing=1.6))
    # seatstay double bar
    top = FR.PX(626, 390)
    ss_d = (FR.AX_R - top).normalized()
    c = top.lerp(FR.AX_R, .3)
    c.y = 0
    dec.append(DC.project_text(bvh_frame, 'II', 30, c, ss_d, n.cross(ss_d), spacing=2.2))
V, F, _ = join_geo(dec)
fdec = mesh('frame_decals', V, F, M['decal_dark'], parent=frame, sharp=None, smooth=True, part='frame_decals')

dec = []
leg_top = FR.steer_at_z(610) + Vector((10, 0, -4))
leg_bot = FR.AX_F + Vector((0, 0, -14))
d_fk = (leg_bot - leg_top).normalized()
for n in (Vector((0, -1, 0)), Vector((0, 1, 0))):
    c = leg_top.lerp(leg_bot, .52)
    dec.append(DC.project_text(bvh_fork, 'CANYON', 22, c, d_fk, n.cross(d_fk), length_mm=175))
V, F, _ = join_geo(dec)
kdec = mesh('fork_decals', V, F, M['decal_dark'], parent=fork, sharp=None, part='fork_decals')

bvh = DC.bvh_of(shield)
dec = []
for n in (Vector((0, -1, 0)), Vector((0, 1, 0))):
    d = Vector((1, 0, -.1)).normalized() * (1 if n.y < 0 else -1)
    dec.append(DC.project_text(bvh, 'CANYON', 20, Vector((600, 0, 985)), d, n.cross(d), length_mm=150))
V, F, _ = join_geo(dec)
mesh('aeroshield_decals', V, F, M['decal_light'], parent=shield, part='aeroshield_decals')
bvh = DC.bvh_of(post)
dec = []
for n in (Vector((0, -1, 0)), Vector((0, 1, 0))):
    d = Vector((1, 0, -.16)).normalized() * (1 if n.y < 0 else -1)
    dec.append(DC.project_text(bvh, 'CANYON', 15, Vector((-250, 0, 866)), d, n.cross(d), length_mm=112))
V, F, _ = join_geo(dec)
mesh('seatpost_decals', V, F, M['decal_light'], parent=post, part='seatpost_decals')

if PHOTO:
    import museum_detail
    museum_detail.refine(M, frame, fork)
    if SLX:slx_adapter.refine(M)
    import museum_options
    museum_options.build(M)

# ------------------------------------------------------------------ scene metadata
root_meta = {
    'model': 'Canyon Speedmax CF SLX 8 Di2' if SLX else 'Canyon Speedmax CFR AXS', 'year': '2027', 'size': 'M',
    'geometry_mm': {'stack': 481, 'reach': 440, 'hta': 73, 'sta': 81, 'chainstay': 420, 'wheelbase': 1013,
                    'bb_drop': 75, 'head_tube': 73, 'seat_tube': 513, 'crank': 165},
    'axles_m': {'front': list(FR.W(FR.AX_F)), 'rear': list(FR.W(FR.AX_R)), 'bb': list(FR.W(FR.BB))},
    'steer_axis': {'top': list(FR.W(FR.HT_TOP)), 'dir': list(FR.STEER_UP)},
    'gear': '52x14' if SLX else '50x14', 'units': 'metres, +X forward, +Z up (Blender); glTF is Y-up',
}
bpy.context.scene['speedmax'] = json.dumps(root_meta)
info = bpy.data.objects.new('speedmax_info', None)
bpy.context.scene.collection.objects.link(info)
info['speedmax'] = json.dumps(root_meta)

tri = 0
for o in bpy.context.scene.objects:
    if o.type == 'MESH' and not o.get('baked'):
        tri += sum(len(p.vertices) - 2 for p in o.data.polygons)
log('total web tris', tri)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'speedmax_slx_master.blend' if SLX else 'speedmax_cfr_master.blend'))

# ------------------------------------------------------------------ export web GLB (instanced chain -> exclude baked)
for o in bpy.context.scene.objects:
    o.select_set(not o.get('baked') and not o.get('obsolete') and not o.get('optional_geometry'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'speedmax_web_raw.glb'), export_format='GLB', use_selection=True,
                          export_extras=True, export_yup=True, export_apply=True, export_texcoords=True,
                          export_normals=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
log('exported web glb')

if RENDER:
    import render
    render.hero(OUT, M)
    log('rendered')
