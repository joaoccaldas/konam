# blender/beast_cave_assets.py
# Deterministic procedural prop pack for the unwired Beast Cave prototype.
# Run with Blender 4/5:
#   blender -b --factory-startup -P blender/beast_cave_assets.py
#
# Output is intentionally prototype-only until rights/performance review.
# No athlete likeness, copied race photograph, or third-party logo is embedded.

import bpy, math, os
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
OUT=os.path.join(ROOT,'assets','prototypes','beast-cave')
os.makedirs(OUT,exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1.0

def material(name,color,rough=.75,metal=0.0,emit=None):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Metallic'].default_value=metal
    if emit:
        bs.inputs['Emission Color'].default_value=(*emit,1)
        bs.inputs['Emission Strength'].default_value=2.2
    return m

MAT_DARK=material('KONA_DARK',(0.035,0.035,0.035),.58,.18)
MAT_STEEL=material('STEEL',(0.14,0.14,0.14),.32,.72)
MAT_STONE=material('BASALT',(0.20,0.185,0.17),.96,.01)
MAT_PAPER=material('PAPER',(0.78,0.73,0.66),.9,0)
MAT_ORANGE=material('LAVA',(0.10,0.035,0.012),.62,.05,(1.0,.20,.025))
MAT_TEXTILE=material('TEXTILE',(.32,.28,.25),.98,0)

def apply(obj,mat): obj.data.materials.append(mat); return obj

def cube(name,scale,loc,mat=MAT_DARK,rot=(0,0,0),bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc,rotation=rot)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('micro_bevel','BEVEL');mod.width=bevel;mod.segments=2
    apply(o,mat);return o

def cyl(name,radius,depth,loc,mat=MAT_DARK,rot=(0,0,0),verts=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object;o.name=name;apply(o,mat);return o

def torus(name,major,minor,loc,mat=MAT_DARK,rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=48,minor_segments=10,location=loc,rotation=rot)
    o=bpy.context.object;o.name=name;apply(o,mat);return o

def collection(name):
    c=bpy.data.collections.new(name);scene.collection.children.link(c);return c

def move_to(obj,c):
    for old in list(obj.users_collection): old.objects.unlink(obj)
    c.objects.link(obj)

# TREADMILL
c=collection('RUN_LAB_TREADMILL')
parts=[
    cube('TREAD_DECK',(1.45,.09,.42),(0,.15,0),MAT_DARK),
    cube('TREAD_POST_L',(.045,.65,.045),(.86,.82,-.36),MAT_STEEL,rot=(0,0,-.16)),
    cube('TREAD_POST_R',(.045,.65,.045),(.86,.82,.36),MAT_STEEL,rot=(0,0,-.16)),
    cube('TREAD_HANDLE',(.04,.04,.44),(.70,1.42,0),MAT_STEEL),
    cube('TREAD_CONSOLE',(.22,.15,.38),(.64,1.58,0),MAT_DARK,rot=(0,0,-.10)),
]
for x in (-1.18,1.18): parts.append(cyl('TREAD_ROLLER',.16,.70,(x,.20,0),MAT_STEEL,rot=(math.pi/2,0,0),verts=24))
for o in parts:move_to(o,c)

# COOLING FAN
for fan_idx in range(2):
    c=collection(f'COOLING_FAN_{fan_idx+1}')
    parts=[torus('FAN_RIM',.68,.07,(0,1.25,0),MAT_DARK),cyl('FAN_HUB',.12,.18,(0,1.25,0),MAT_STEEL,rot=(math.pi/2,0,0),verts=24),cube('FAN_STAND',(.07,.64,.07),(0,.58,0),MAT_STEEL),cube('FAN_BASE',(.55,.04,.22),(0,.03,0),MAT_DARK)]
    for i in range(6):
        a=i*math.tau/6
        p=cube(f'FAN_BLADE_{i+1}',(.055,.22,.018),(.25*math.cos(a),1.25+.25*math.sin(a),0),MAT_STEEL,rot=(0,0,a))
        parts.append(p)
    for o in parts:move_to(o,c)

# SCULPTURE: THE GAP
c=collection('SCULPTURE_THE_GAP')
parts=[
    cube('GAP_LEFT',(.48,1.55,.43),(-.62,1.55,0),MAT_STONE,rot=(0,0,.09)),
    cube('GAP_RIGHT',(.48,1.55,.43),(.62,1.55,0),MAT_STONE,rot=(0,0,-.09)),
    cube('GAP_LIGHT',(.035,1.35,.025),(0,1.48,-.46),MAT_ORANGE,bevel=0),
]
for o in parts:move_to(o,c)

# SCULPTURE: REPEAT
c=collection('SCULPTURE_REPEAT')
for i,r in enumerate((1.10,.82,.54,.28)):
    o=torus(f'REPEAT_RING_{i+1}',r,.055,(0,1.1,0),MAT_ORANGE if i==3 else MAT_DARK,rot=(math.pi/2,0,0));move_to(o,c)

# SCULPTURE: SILVER LINING
c=collection('SCULPTURE_SILVER_LINING')
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=.70,location=(-.18,.72,0));left=bpy.context.object;left.name='SILVER_LEFT';left.scale.x=.82;apply(left,MAT_DARK);move_to(left,c)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=.70,location=(.18,.72,0));right=bpy.context.object;right.name='SILVER_RIGHT';right.scale.x=.82;apply(right,MAT_DARK);move_to(right,c)
halo=torus('SILVER_HALO',.88,.035,(0,.72,0),MAT_ORANGE,rot=(math.pi/2,0,0));move_to(halo,c)

# TRAINING SMALLS
c=collection('TRAINING_SMALLS')
for i,x in enumerate((-0.34,0,.34)):
    b=cyl(f'BOTTLE_{i+1}',.09,.54,(x,.27,0),MAT_PAPER if i==1 else MAT_DARK,verts=20);move_to(b,c)
roller=cyl('FOAM_ROLLER',.18,.80,(1.1,.18,0),MAT_DARK,rot=(0,math.pi/2,0),verts=24);move_to(roller,c)
bar=cyl('DUMBBELL_BAR',.05,.65,(2.0,.18,0),MAT_STEEL,rot=(0,math.pi/2,0),verts=16);move_to(bar,c)
for x in (1.66,2.34):
    d=cyl('DUMBBELL_PLATE',.18,.12,(x,.18,0),MAT_DARK,rot=(0,math.pi/2,0),verts=18);move_to(d,c)

# GEAR STUDIES
c=collection('GEAR_STUDIES')
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=(0,.50,0));helmet=bpy.context.object;helmet.name='HELMET_PROXY';helmet.scale=(.55,.34,.42);apply(helmet,MAT_DARK);move_to(helmet,c)
for i in range(2):
    s=cube(f'CYCLING_SHOE_{i+1}',(.44,.12,.16),(1.1+i*.95,.15,0),MAT_PAPER,rot=(0,(.10 if i==0 else -.10),0));move_to(s,c)

# Metadata
scene['asset_pack']='Kona.m Beast Cave prototype props v1'
scene['provenance']='Original procedural geometry. No athlete likeness or copied brand artwork.'
scene['public_navigation']=False
scene['prototype_only']=True

# Select all generated objects and export a single GLB with named collections/objects.
bpy.ops.object.select_all(action='SELECT')
blend=os.path.join(OUT,'beast-cave-props-v1.blend')
glb=os.path.join(OUT,'beast-cave-props-v1.glb')
bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.export_scene.gltf(filepath=glb,export_format='GLB',export_apply=True,export_yup=True)
print(blend)
print(glb)
