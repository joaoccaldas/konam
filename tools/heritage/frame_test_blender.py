"""Frame-and-fork shape check for the Speed Concept SLR pillow mesh.

Writes a workbench side and front render plus the remeshed triangles (millimetres) used by
tools/heritage/compare_frame_silhouette.py. This is a shape gate, not a material render.
"""
import json, math, os, sys, time
import numpy as np
import bpy
from mathutils import Vector

R = os.path.expanduser('~/Developer/trek-tri-museum-3d')
sys.path[:0] = [R + '/blender/heritage', R + '/blender']
bpy.ops.wm.read_factory_settings(use_empty=True)
import pillow_mesh as PM

D = R + '/blender/heritage_data/trek-speed-concept-slr-9-axs-my2027/'
QA = D + 'qa/'
os.makedirs(QA, exist_ok=True)


def bounds(obj):
    co = np.zeros(len(obj.data.vertices) * 3, np.float32)
    obj.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    return co.min(0), co.max(0), len(obj.data.polygons)


t = time.time()
fr = PM.build('frame', D + 'pillows.npz',
              ['main', 'seatstay_L', 'seatstay_R', 'chainstay_L', 'chainstay_R'],
              voxel_mm=1.2, target=200000, meta_path=D + 'pillows.json', photo_size=(4000, 3000))
fk = PM.build('fork', D + 'pillows.npz',
              ['fork_upper', 'fork_blade_L', 'fork_blade_R'],
              voxel_mm=1.0, target=60000, meta_path=D + 'pillows.json', photo_size=(4000, 3000))
print('built_s', round(time.time() - t, 1))
for o in (fr, fk):
    lo, hi, n = bounds(o)
    print(o.name, 'polys', n, 'min_mm', (lo / 0.001).round(1).tolist(), 'max_mm', (hi / 0.001).round(1).tolist())

parts = []
for obj in (fr, fk):
    me = obj.data
    me.calc_loop_triangles()
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    tris = np.empty(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get('vertices', tris)
    parts.append((co.reshape(-1, 3) / 0.001, tris.reshape(-1, 3)))
off = 0
Vs, Fs = [], []
for V, F in parts:
    Vs.append(V)
    Fs.append(F + off)
    off += len(V)
np.savez_compressed(QA + 'frame_tris.npz', V=np.concatenate(Vs).astype(np.float32), F=np.concatenate(Fs).astype(np.int32))

m = bpy.data.materials.new('clay')
m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.62, 0.64, 0.66, 1)
m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.55
for o in (fr, fk):
    o.data.materials.append(m)

sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'MATERIAL'
sc.render.resolution_x, sc.render.resolution_y = 1400, 900
sc.render.film_transparent = False
w = bpy.data.worlds.new('w')
sc.world = w
lo = np.minimum(bounds(fr)[0], bounds(fk)[0])
hi = np.maximum(bounds(fr)[1], bounds(fk)[1])
mid = Vector(((lo + hi) / 2).tolist())
span = float(np.max(hi - lo))
for name, loc, ortho in (
        ('side', (mid.x, mid.y - span * 3, mid.z), span * 1.25),
        ('front', (float(hi[0]) + span, mid.y, mid.z), span * 0.85)):
    cam = bpy.data.cameras.new(name)
    cam.type = 'ORTHO'
    cam.ortho_scale = ortho
    co = bpy.data.objects.new(name, cam)
    sc.collection.objects.link(co)
    co.location = loc
    co.rotation_euler = (Vector(mid) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    sc.render.filepath = QA + name + '.png'
    bpy.ops.render.render(write_still=True)
print('qa', QA)
