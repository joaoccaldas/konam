"""Studio renders of the master scene (Cycles). Also usable standalone:
blender -b assets/speedmax_cfr_master.blend -P blender/render.py -- <out_dir> [views] [samples]"""
import bpy, math, os, sys
from mathutils import Vector


def setup(samples=96, res=(1600, 1000), engine='CYCLES'):
    sc = bpy.context.scene
    sc.render.engine = engine
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = 'GPU'
    except Exception as e:
        print('GPU setup failed', e)
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    w = bpy.data.worlds.new('studio')
    sc.world = w
    nt = w.node_tree
    bg = nt.nodes['Background']
    bg.inputs['Color'].default_value = (.62, .63, .66, 1)
    bg.inputs['Strength'].default_value = .35
    # hide instancing templates
    for o in sc.objects:
        if o.get('template'):
            o.hide_render = True
    # floor
    if 'floor' not in bpy.data.objects:
        bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
        fl = bpy.context.active_object
        fl.name = 'floor'
        m = bpy.data.materials.new('floor')
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (.58, .59, .61, 1)
        b.inputs['Roughness'].default_value = .45
        fl.data.materials.append(m)
    for nm, loc, rot, size, e in (('key', (1.2, -2.4, 2.6), (.9, 0, .45), 2.6, 380),
                                  ('fill', (-2.6, -1.2, 1.6), (1.1, 0, -1.1), 3.0, 120),
                                  ('rim', (0.2, 2.8, 2.2), (-.95, 0, 3.1), 2.2, 300),
                                  ('top', (0.1, 0, 3.4), (0, 0, 0), 3.0, 150)):
        if nm in bpy.data.objects:
            continue
        L = bpy.data.lights.new(nm, 'AREA')
        L.size = size
        L.energy = e
        o = bpy.data.objects.new(nm, L)
        o.location = loc
        o.rotation_euler = rot
        sc.collection.objects.link(o)


VIEWS = {
    'hero': ((1.55, -2.55, 1.05), (0.06, 0, .56), 34),
    'side': ((0.09, -4.2, .56), (0.09, 0, .56), 30),
    'nds': ((0.09, 4.2, .56), (0.09, 0, .56), 30),
    'front': ((3.2, -.9, .9), (0.1, 0, .6), 34),
    'cockpit': ((1.25, -.95, 1.35), (0.5, 0, .9), 38),
    'drivetrain': ((-.1, -1.25, .55), (-.2, 0, .36), 40),
}


def shoot(out_dir, name, samples):
    sc = bpy.context.scene
    loc, tgt, lens = VIEWS[name]
    cam = bpy.data.objects.get('cam') or bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    cam.data.lens = lens
    cam.location = loc
    d = Vector(tgt) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    if sc.render.engine == 'CYCLES':
        sc.cycles.samples = samples
    sc.render.filepath = os.path.join(out_dir, 'render_%s.png' % name)
    bpy.ops.render.render(write_still=True)


def hero(out_dir, M=None, views=('hero', 'side'), samples=96):
    setup(samples)
    for v in views:
        shoot(out_dir, v, samples)


if __name__ == '__main__' and '--' in sys.argv:
    a = sys.argv[sys.argv.index('--') + 1:]
    out = a[0]
    views = a[1].split(',') if len(a) > 1 else ['hero', 'side']
    samples = int(a[2]) if len(a) > 2 else 96
    res = (1600, 1000) if len(a) <= 3 else tuple(int(x) for x in a[3].split('x'))
    eng = 'BLENDER_EEVEE' if (len(a) > 4 and a[4] == 'eevee') else 'CYCLES'
    setup(samples, res, eng)
    for v in views:
        shoot(out, v, samples)
