#!/usr/bin/env python3
"""Deterministic candidate asset generator for Beast Cave.

Generic original studies only: no third-party marks, copied UI, athlete likeness, or
athlete-specific equipment claims. Outputs remain candidate-authoring assets until promoted.
Usage:
  blender -b --python blender/beast_cave_assets.py -- treadmill fan acoustic-wall
"""
import bpy, math, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"assets/rooms/beast-cave"; OUT.mkdir(parents=True,exist_ok=True)
VALID={"treadmill","fan","acoustic-wall"}
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
if not args:
    print("Available:",", ".join(sorted(VALID))); raise SystemExit(0)
if "all" in args: args=sorted(VALID)
bad=set(args)-VALID
if bad: raise SystemExit("Unknown assets: "+", ".join(sorted(bad)))

def reset():
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
def mat(name,base,metallic=0,rough=.5):
    m=bpy.data.materials.new(name);m.diffuse_color=(*base,1);m.use_nodes=True
    b=m.node_tree.nodes.get("Principled BSDF")
    if b:
        if "Base Color" in b.inputs:b.inputs["Base Color"].default_value=(*base,1)
        if "Metallic" in b.inputs:b.inputs["Metallic"].default_value=metallic
        if "Roughness" in b.inputs:b.inputs["Roughness"].default_value=rough
    return m
def cube(name,loc,scale,material):
    bpy.ops.mesh.primitive_cube_add(location=loc);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);return o
def cyl(name,loc,radius,depth,material,rot=(0,0,0),verts=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object;o.name=name;o.data.materials.append(material);return o
def export(name):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+".glb")),export_format="GLB",use_selection=True,export_yup=True)
    print("BEAST_ASSET",OUT/(name+".glb"))

def treadmill():
    reset();steel=mat("steel",(.12,.13,.14),.78,.34);dark=mat("dark",(.018,.018,.019),.25,.55);rubber=mat("rubber",(.008,.009,.01),0,.94);accent=mat("accent",(.85,.16,.02),.05,.4)
    for i in range(28):
        x=-1.45+i*(2.9/27);y=.17+.23*((abs(x)/1.45)**2)
        s=cube("slat_%02d"%i,(x,0,y),(.052,.39,.035),rubber);s.rotation_euler[1]=-.28*(x/1.45)
    for y in (-.43,.43):
        for x in (-1.25,1.0):
            p=cube("frame",(x,y,.82),(.055,.055,.72),steel);p.rotation_euler[1]=-.18 if x>0 else .12
    cube("console",(.8,0,1.58),(.30,.37,.18),dark);cube("display",(1.11,-.38,1.59),(.018,.26,.12),accent)
    export("curved-treadmill")

def fan():
    reset();steel=mat("steel",(.12,.13,.14),.78,.34);dark=mat("dark",(.018,.018,.019),.25,.55)
    bpy.ops.mesh.primitive_torus_add(major_radius=.62,minor_radius=.055,major_segments=56,minor_segments=10,location=(0,0,1.02),rotation=(math.pi/2,0,0));bpy.context.object.data.materials.append(dark)
    cyl("hub",(0,0,1.02),.11,.18,steel,(math.pi/2,0,0),24)
    for i in range(7):
        a=i*2*math.pi/7;b=cube("blade_%02d"%i,(math.cos(a)*.31,0,1.02+math.sin(a)*.31),(.065,.025,.26),steel);b.rotation_euler[1]=a+.35
    cube("post",(0,0,.47),(.055,.055,.42),steel);cube("base",(0,0,.05),(.72,.32,.05),dark);export("industrial-fan")

def acoustic_wall():
    reset();dark=mat("backing",(.018,.018,.019),.25,.55);foam=mat("foam",(.055,.05,.047),0,.98);accent=mat("accent",(.85,.16,.02),.05,.4)
    cube("back",(0,0,1.10),(1.48,.08,1.08),dark)
    for row in range(4):
        for col in range(5):
            x=-.96+col*.48;z=.38+row*.48;p=cube("foam_%02d_%02d"%(row,col),(x,-.10,z),(.20,.10,.20),foam);p.rotation_euler[1]=(.09 if (row+col)%2 else -.09)
    for i,w in enumerate((1.1,.82,.58)):cube("work_mark_%d"%i,(0,-.19,1.72-i*.20),(w,.018,.035),accent)
    export("acoustic-wall")

for name in args: {"treadmill":treadmill,"fan":fan,"acoustic-wall":acoustic_wall}[name]()
