"""Side-view previews of the Atlas bikes (Cycles, CPU) → renders/atlas/<key>.png
  python3 blender/atlas_preview.py [key ...]"""
import bpy, json, os, sys, math
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SPEC = json.load(open(os.path.join(ROOT, 'museum/atlas/bikes.json')))
ONLY = [a for a in sys.argv[1:] if not a.startswith('-')]
OUT = os.path.join(ROOT, 'renders/atlas'); os.makedirs(OUT, exist_ok=True)
for b in SPEC['bikes']:
    if ONLY and b['key'] not in ONLY: continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets/atlas', b['key'], 'bike.glb'))
    sc = bpy.context.scene
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.93, .91, .87, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.25
    cam.location = (0.02, -4, 0.3); cam.rotation_euler = (math.pi / 2, 0, 0)
    for loc, e in (((-2, -3, 3), 900), ((2, 3, 2), 400)):
        L = bpy.data.objects.new('l', bpy.data.lights.new('l', 'AREA')); L.data.energy = e; L.data.size = 3; L.location = loc
        L.rotation_euler = ((math.pi / 2 - .6) if loc[1] < 0 else -(math.pi / 2 - .6), 0, 0); sc.collection.objects.link(L)
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 900, 560
    sc.render.filepath = os.path.join(OUT, b['key'] + '.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', b['key'])
