"""Build the Canyon Museum immersive-art asset pack with Blender's bpy API.

Run:
  python3 -m pip install bpy
  python3 blender/artworld_assets.py -- /tmp/artworld

Outputs:
  artworld_assets.blend
  artworld_assets.glb
  artworld_assets.obj

Geometry is intentionally original, procedural, low-to-medium poly, and public-safe.
No personal data is embedded in the assets.
"""
import bpy, math, os, sys

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else 'output/artworld'
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

def material(name, color, metallic=0.0, roughness=0.35, emission=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = 0.7
        bsdf.inputs['Coat Roughness'].default_value = 0.08
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = 1.6
    return m

RED = material('RedRock', (0.42, 0.10, 0.045), .04, .38)
OBSIDIAN = material('Obsidian', (0.025, 0.028, 0.032), .32, .11)
SEA = material('SeaGlass', (0.35, 0.70, 0.78), .08, .20)
NEON = material('NeonPink', (0.35, 0.02, 0.12), .10, .16, (1.0, .05, .25))
LAVA = material('LavaCore', (.30, .03, .01), .08, .20, (1.0, .14, .02))
STONE = material('DarkStone', (.08, .07, .08), .05, .56)
PURPLE = material('MoonGlow', (.16, .04, .23), .08, .20, (.58, .12, .82))
BONE = material('Bone', (.64, .58, .48), 0, .5)
BRONZE = material('Bronze', (.20, .11, .04), .72, .22)

def empty(name):
    o = bpy.data.objects.new(name, None)
    scene.collection.objects.link(o)
    return o

def cube(name, scale, loc, mat, parent=None, bevel=.02, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('Soft edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(mat)
    if parent: o.parent = parent
    return o

def cyl(name, radius, depth, loc, mat, parent=None, verts=24, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rotation)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    if parent: o.parent = parent
    return o

def torus(name, major, minor, loc, mat, parent=None, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=36, minor_segments=8, location=loc, rotation=rotation)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    if parent: o.parent = parent
    return o

def curve(name, points, bevel, mat, parent=None):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = bevel
    cu.bevel_resolution = 2
    spl = cu.splines.new('BEZIER')
    spl.bezier_points.add(len(points)-1)
    for bp, p in zip(spl.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    o.data.materials.append(mat)
    if parent: o.parent = parent
    return o

# St. George: a single canyon silhouette from distance, layered contour fins up close.
g = empty('ART_ST_GEORGE')
for i, h in enumerate([1.0, 1.32, 1.68, 2.02, 1.73, 1.34, 1.02]):
    cube(f'STG_LAYER_{i:02d}', (.065, h/2, .27), ((i-3)*.16, h/2, 0), RED, g, .018)
curve('STG_GLOW_SEAM', [(-.48,.18,.30),(-.23,.72,.31),(.02,1.35,.32),(.34,1.85,.31),(.48,1.1,.30)], .024, LAVA, g)

# Las Vegas: black reflective prisms cut by sparse neon.
g = empty('ART_VEGAS')
for i, h in enumerate([1.05,1.5,1.85,1.36,2.08,1.62,1.12]):
    x = (i-3)*.17
    cube(f'VEGAS_PRISM_{i:02d}', (.07,h/2,.24), (x,h/2,0), OBSIDIAN, g, .016, (0,(i-3)*.055,0))
    if i % 2:
        cube(f'VEGAS_NEON_{i:02d}', (.016,h*.34,.255), (x+.04,h*.52,.018), NEON, g, .006)

# Nice: one ribbon that changes silhouette while walking past it.
g = empty('ART_NICE')
N = 24
verts, faces = [], []
for i in range(N):
    x = -.82 + 1.64*i/(N-1)
    y = .74 + .21*math.sin(i*.6)
    z = .11*math.sin(i*.31)
    verts += [(x,y-.33,z-.10),(x,y+.33,z+.10)]
for i in range(N-1):
    a = 2*i
    faces.append((a,a+1,a+3,a+2))
me = bpy.data.meshes.new('NICE_RIBBON_MESH')
me.from_pydata(verts, [], faces)
me.update()
o = bpy.data.objects.new('NICE_RIBBON', me)
scene.collection.objects.link(o)
o.parent = g
o.data.materials.append(SEA)
sol = o.modifiers.new('Thin glass', 'SOLIDIFY'); sol.thickness = .045
bev = o.modifiers.new('Soft edge', 'BEVEL'); bev.width = .018; bev.segments = 2
bpy.context.view_layer.objects.active = o
bpy.ops.object.modifier_apply(modifier=sol.name)
bpy.ops.object.modifier_apply(modifier=bev.name)

# Kona: glossy obsidian shards around a visible hot core.
g = empty('ART_KONA')
for i in range(7):
    h = 1.12 + .88*(1-abs(i-3)/3)
    o = cube(f'KONA_SHARD_{i:02d}', (.075,h/2,.26), ((i-3)*.18,h/2,0), OBSIDIAN, g, .018)
    o.rotation_euler[1] = (i-3)*.08
    o.rotation_euler[2] = (i-3)*.03
cyl('KONA_CORE', .10, 1.72, (0,.9,.05), LAVA, g, 20)

# Secret-room discoverable portal.
g = empty('PORTAL_ECLIPSE')
torus('PORTAL_RING', .58, .085, (0,1.22,0), PURPLE, g, (math.pi/2,0,0))
for i in range(7):
    cube(f'PORTAL_TOOTH_{i:02d}', (.035,.45,.07), ((i-3)*.14,.52+abs(i-3)*.05,0), OBSIDIAN, g, .012, (0,0,(i-3)*.14))

# Sparse gothic room props.
g = empty('HORROR_ARCH')
cube('ARCH_LEFT', (.12,1.55,.16), (-.74,1.55,0), STONE, g, .03)
cube('ARCH_RIGHT', (.12,1.55,.16), (.74,1.55,0), STONE, g, .03)
for i in range(9):
    a = math.pi*i/8
    x, y = .74*math.cos(a), 3.02 + .74*math.sin(a)
    cube(f'ARCH_TOP_{i:02d}', (.11,.145,.16), (x,y,0), STONE, g, .025, (0,0,a-math.pi/2))

g = empty('HORROR_TOTEM')
cyl('TOTEM_BODY', .21, 2.35, (0,1.175,0), BRONZE, g, 8)
for i in range(5):
    torus(f'TOTEM_RING_{i:02d}', .24, .022, (0,.33+i*.43,0), PURPLE, g, (math.pi/2,0,0))

g = empty('HORROR_CARNIVAL')
torus('CARNIVAL_OUTER', .78, .05, (0,1.0,0), NEON, g, (math.pi/2,0,0))
cyl('CARNIVAL_HUB', .105, .13, (0,1.0,0), BONE, g, 20, (math.pi/2,0,0))
for i in range(10):
    a = i*math.tau/10
    x, y = .38*math.cos(a), 1.0+.38*math.sin(a)
    cube(f'CARNIVAL_SPOKE_{i:02d}', (.03,.38,.03), (x,y,0), BONE, g, .008, (0,0,-a))

scene['asset_pack'] = 'Canyon Museum immersive art world'
scene['provenance'] = 'Original procedural Blender geometry. Public-safe; no personal data.'

blend = os.path.join(OUT, 'artworld_assets.blend')
glb = os.path.join(OUT, 'artworld_assets.glb')
obj = os.path.join(OUT, 'artworld_assets.obj')
bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', export_apply=True)
# OBJ is intentionally emitted as the web-runtime artifact: it is compact, diffable,
# and can be loaded by Three.js while the editable .blend remains reproducible from this script.
bpy.ops.wm.obj_export(filepath=obj, export_materials=False, export_uv=False, export_normals=True)
print(blend)
print(glb)
print(obj)
