"""Dimension gate for the Speed Concept drivetrain and wheels. Run with Blender:

blender -b --factory-startup --python-exit-code 1 -P tools/heritage/test_modern_parts.py
"""
import math, os, sys
import numpy as np
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'blender', 'heritage'), os.path.join(ROOT, 'blender')]
bpy.ops.wm.read_factory_settings(use_empty=True)
from lib import mat
import skeleton as SK
import modern_parts as MP

FAILS = []


def check(name, ok, detail):
    print(('ok  ' if ok else 'FAIL') + ' ' + name + '  ' + detail)
    if not ok:
        FAILS.append(name)


def world_co(obj):
    bpy.context.view_layer.update()
    n = len(obj.data.vertices)
    co = np.empty(n * 3, np.float64)
    obj.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    mw = np.array(obj.matrix_world)
    hom = np.c_[co, np.ones(len(co))]
    return (mw @ hom.T).T[:, :3]


def xz_radius(pts, origin):
    d = pts - origin
    return np.hypot(d[:, 0], d[:, 2])


M = {
    'tyre': mat('tyre', (.04, .04, .04), rough=.6),
    'tyre_tan': mat('tyre_tan', (.62, .48, .30), rough=.7),
    'rim': mat('rim', (.02, .02, .022), rough=.3, coat=.6),
    'hub': mat('hub', (.6, .6, .62), metal=1, rough=.3),
    'spoke': mat('spoke', (.05, .05, .05), metal=.8, rough=.4),
    'rotor': mat('rotor', (.55, .55, .57), metal=1, rough=.25),
    'alu_black': mat('alu_black', (.04, .04, .045), metal=.7, rough=.4),
    'alu_dark': mat('alu_dark', (.15, .15, .16), metal=1, rough=.35),
    'alu_silver': mat('alu_silver', (.7, .7, .72), metal=1, rough=.22),
    'steel': mat('steel', (.72, .72, .74), metal=1, rough=.25),
    'black': mat('black', (.02, .02, .02), rough=.5),
    'carbon_crank': mat('carbon_crank', (.03, .03, .033), rough=.3, coat=.7),
    'led': mat('led', (.1, .35, .9), emit=(.2, .5, 1), strength=2),
    'chain': mat('chain', (.5, .5, .52), metal=1, rough=.3),
}

spec = {'geometry': {}}
# skeleton.build only needs the geometry lists. Load the real record.
import json
spec = json.load(open(os.path.join(ROOT, 'museum/current/specs-speed-concept-slr-gen3.json')))
sk = SK.build(spec, 'M', MP.TYRE_OD, headset_lower=12, headset_upper=16, axle_crown=370)
BB, AX_R, AX_F = sk['BB'], sk['AX_R'], sk['AX_F']
check('bb height', abs(BB.z - (336 - 80)) < 0.1, 'BB.z %.1f mm' % BB.z)

# Front derailleur must follow the BB. A BB at z=100 mm must not leave the body at Canyon's z=398.
BB_TEST = Vector((0, 0, 100))
fd = MP.build_fd(M, BB_TEST)
fd_z = world_co(fd)[:, 2].mean() * 1000
check('fd follows BB', 180 < fd_z < 280, 'mean z %.1f mm (BB at 100, Canyon absolute would be ~398)' % fd_z)

arm = MP.CRANK_LEN['M']
ang = MP.CRANK_ANG
MP.build_crankset(M, BB, arm_len=arm, angle=ang)
eye = np.array([BB.x + arm * math.cos(ang), 0, BB.z + arm * math.sin(ang)]) * MP.MM
ds = bpy.data.objects['crank_arm_ds']
delta = world_co(ds) - eye
delta[:, 1] = 0  # the pedal eye sits outboard; length is the side-view radius
d = np.linalg.norm(delta, axis=1).min() * 1000
check('crank length 170', d < 12, 'nearest side-view vertex to the 170 mm eye is %.2f mm away' % d)
rings = bpy.data.objects['chainrings']
rmax = xz_radius(world_co(rings), np.array(BB) * MP.MM).max() * 1000
check('48T big ring', 99 < rmax < 102.5, 'chainring outer radius %.1f mm' % rmax)

g = MP.build_wheel(M, AX_F, 'front')
MP.build_wheel(M, AX_R, 'rear')
for which, axle in (('front', AX_F), ('rear', AX_R)):
    origin = np.array(axle) * MP.MM
    rotor = xz_radius(world_co(bpy.data.objects['rotor_' + which]), origin).max() * 1000
    check(which + ' rotor 160', rotor > 76, 'outer radius %.1f mm' % rotor)
ty = bpy.data.objects['tyre_front']
check('tan sidewall material', len(ty.data.materials) == 2, 'materials %d' % len(ty.data.materials))
ty_r = xz_radius(world_co(ty), np.array(AX_F) * MP.MM).max() * 1000
check('700x25 outer', 330 < ty_r < 342, 'tyre radius %.1f mm' % ty_r)
rim = bpy.data.objects['rim_front']
rr = xz_radius(world_co(rim), np.array(AX_F) * MP.MM)
depth = (rr.max() - rr.min()) * 1000
check('rim depth 51', 47 < depth < 55, 'radial span %.1f mm' % depth)

meta = MP.chain_path(BB, AX_R)[1]
rd = MP.build_rd(M, AX_R, meta)
rd_r = xz_radius(world_co(rd), np.array(AX_R) * MP.MM).min() * 1000
check('rd on rear axle', rd_r < 20, 'nearest side-view radius %.1f mm (UDH mount)' % rd_r)
cass = bpy.data.objects['cassette']
cmax = xz_radius(world_co(cass), np.array(AX_R) * MP.MM).max() * 1000
check('33T cog present', cmax > 65, 'cassette outer radius %.1f mm' % cmax)

if FAILS:
    raise SystemExit('modern parts gate failed: ' + ', '.join(FAILS))
print('modern parts gate passed')
