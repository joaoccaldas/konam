import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
from lib import *
import frame as FR

M = {'paint': mat('paint', (.9, .9, .92), rough=.3)}
raw = FR.build_frame(M)
me = FR.voxelize(raw, .002, 4, .5)
fr = bpy.data.objects.new('frame', me); bpy.context.scene.collection.objects.link(fr)
fr.location = raw.location
bpy.data.objects.remove(raw)
fk = FR.build_fork_raw(M)
me = FR.voxelize(fk, .002, 4, .5)
f2 = bpy.data.objects.new('fork', me); bpy.context.scene.collection.objects.link(f2); f2.location = fk.location
bpy.data.objects.remove(fk)
for c, r in ((FR.AX_R, 339.5), (FR.AX_F, 339.5)):
    bpy.ops.mesh.primitive_torus_add(major_radius=(r - 14) * MM, minor_radius=14 * MM, location=c * MM, rotation=(math.pi / 2, 0, 0))

sc = bpy.context.scene
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 1600 * 1.304 * MM
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
co.location = (97.8 * MM, -5, 557.9 * MM); co.rotation_euler = (math.pi / 2, 0, 0)
sc.camera = co
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x, sc.render.resolution_y = 1600, 900
sc.render.film_transparent = True
sc.display.shading.light = 'STUDIO'
sc.render.filepath = sys.argv[-1]
bpy.ops.render.render(write_still=True)
