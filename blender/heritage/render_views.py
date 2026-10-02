"""Studio renders of a built heritage bike: hero, side, front, drivetrain, cockpit (+ optional none).

blender -b <bike_master.blend> --python-exit-code 1 -P blender/heritage/render_views.py -- <out_dir> <samples> [eevee|cycles] [--scene <path>]
"""
import bpy, sys, os, math, json
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
out, samples = args[0], int(args[1])
engine = args[2] if len(args) > 2 and not args[2].startswith('--') else 'cycles'
scene_path = args[args.index('--scene') + 1] if '--scene' in args else None
os.makedirs(out, exist_ok=True)
sc = bpy.context.scene
meta = json.loads(sc['bike'])

# floor + soft studio lights
bpy.ops.mesh.primitive_plane_add(size=12, location=(0.1, 0, 0))
floor = bpy.context.active_object
floor.name = 'studio_floor'
fm = bpy.data.materials.new('studio_floor')
fm.use_nodes = True
b = fm.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (.82, .82, .83, 1)
b.inputs['Roughness'].default_value = .55
floor.data.materials.append(fm)
floor['studio'] = True
w = bpy.data.worlds.new('studio') if not sc.world else sc.world
sc.world = w
w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (.9, .9, .92, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = .6


def area(name, loc, rot, size, energy):
    L = bpy.data.lights.new(name, 'AREA')
    L.size = size
    L.energy = energy
    o = bpy.data.objects.new(name, L)
    sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o['studio'] = True
    return o


area('key', (1.2, -2.4, 2.4), (math.radians(55), 0, math.radians(25)), 2.5, 900)
area('fill', (-1.5, 2.2, 1.8), (math.radians(-60), 0, math.radians(200)), 3.0, 450)
area('top', (0.1, 0, 3.2), (0, 0, 0), 3.0, 500)

cx = (meta['axles_m']['front'][0] + meta['axles_m']['rear'][0]) / 2
cams = {
    'side': dict(loc=(cx, -4.0, .55), look=(cx, 0, .55), ortho=1.85),
    'hero': dict(loc=(cx + 1.9, -2.6, 1.15), look=(cx + .05, 0, .55), lens=55),
    'front': dict(loc=(cx + 3.2, -.45, .75), look=(cx, 0, .6), lens=85),
    'drivetrain': dict(loc=(-.12, -1.05, .45), look=(-.2, -.03, .33), lens=50),
    'cockpit': dict(loc=(.2, -.9, 1.25), look=(.62, 0, .95), lens=45),
    'nds': dict(loc=(cx, 4.0, .55), look=(cx, 0, .55), ortho=1.85),
}
sc.render.engine = 'BLENDER_EEVEE_NEXT' if engine == 'eevee' else 'CYCLES'
if engine == 'eevee':
    try:
        sc.render.engine = 'BLENDER_EEVEE'
    except Exception:
        pass
else:
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
sc.view_settings.view_transform = 'AgX' if 'AgX' in [v.identifier for v in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
for name, c in cams.items():
    cam = bpy.data.cameras.new('cam_' + name)
    if 'ortho' in c:
        cam.type = 'ORTHO'
        cam.ortho_scale = c['ortho']
    else:
        cam.lens = c['lens']
    o = bpy.data.objects.new('cam_' + name, cam)
    sc.collection.objects.link(o)
    o.location = c['loc']
    d = Vector(c['look']) - Vector(c['loc'])
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    o['studio'] = True
    sc.camera = o
    if samples > 0:
        sc.render.filepath = os.path.join(out, 'museum_' + name + '.png')
        bpy.ops.render.render(write_still=True)
if scene_path:
    bpy.ops.wm.save_as_mainfile(filepath=scene_path)
