# Blender generator for reusable NOR // 3 environment assets.
# Run: blender -b --python blender/norwegian_engine_assets.py
# Outputs are intentionally brand-neutral/original studies. Exact athlete gear is not generated here.
import bpy, math, os
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
OUT=os.path.join(ROOT,"assets","rooms","norwegian-engine")
os.makedirs(OUT,exist_ok=True)

def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for d in bpy.data.materials: bpy.data.materials.remove(d)

def mat(name,base,metal=0.0,rough=.5):
    m=bpy.data.materials.new(name); m.diffuse_color=(*base,1)
    m.use_nodes=True; bs=m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*base,1); bs.inputs["Metallic"].default_value=metal; bs.inputs["Roughness"].default_value=rough
    return m

def cube(name,loc,scale,material,bevel=.03):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new("micro-bevel","BEVEL"); b.width=bevel; b.segments=2
    o.data.materials.append(material); return o

def cyl(name,loc,radius,depth,material,rot=(0,0,0),verts=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object;o.name=name;o.data.materials.append(material);return o

def export(name):
    p=os.path.join(OUT,name+".glb")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=p,export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
    print("NOR3_ASSET",p)

def build_trainer():
    reset(); steel=mat("powder steel",(.055,.07,.075),.72,.28); alloy=mat("machined alloy",(.25,.29,.31),.9,.2); rubber=mat("rubber",(.018,.022,.024),0,.92)
    cyl("flywheel",(0,0,.42),.34,.16,alloy,(math.pi/2,0,0))
    cube("spine",(0,0,.12),(.48,.12,.07),steel); cube("foot-a",(-.32,0,.055),(.08,.48,.045),steel); cube("foot-b",(.32,0,.055),(.08,.48,.045),steel)
    cyl("axle",(0,0,.42),.065,.34,steel,(math.pi/2,0,0)); cyl("contact",(0,-.19,.06),.045,.12,rubber,(math.pi/2,0,0))
    export("direct-drive-trainer")

def build_run_deck():
    reset(); rubber=mat("belt",(.018,.022,.024),0,.94); alloy=mat("anodised alloy",(.16,.19,.20),.75,.3)
    cube("deck",(0,0,.08),(.78,.25,.06),rubber,.05); cube("nose",(.69,0,.18),(.10,.27,.15),alloy,.04)
    cyl("roller-a",(-.63,0,.09),.075,.46,alloy,(math.pi/2,0,0)); cyl("roller-b",(.55,0,.09),.075,.46,alloy,(math.pi/2,0,0))
    export("run-deck")

def build_table():
    reset(); oak=mat("smoked oak",(.12,.065,.035),0,.68); steel=mat("brushed steel",(.24,.28,.30),.78,.3)
    cube("top",(0,0,1.02),(1.325,.56,.06),oak,.035)
    for x in (-1.08,1.08): cube("leg", (x,0,.5),(.05,.45,.5),steel,.02)
    export("protocol-table")

def build_analyser():
    reset(); body=mat("dark alloy",(.045,.055,.06),.55,.34); glass=mat("screen glass",(.08,.22,.26),.15,.12)
    cube("body",(0,0,.16),(.31,.23,.14),body,.045); cube("screen",(0,-.236,.20),(.21,.012,.10),glass,.012)
    export("analyser")

def build_vials():
    reset(); glass=mat("lab glass",(.55,.76,.79),.05,.08); steel=mat("rack",(.18,.21,.22),.7,.32)
    cube("rack",(0,0,.04),(.42,.18,.04),steel,.015)
    for row in (-.10,.10):
      for i in range(6): cyl("vial",(-.32+i*.13,row,.15),.025,.20,glass)
    export("vial-rack")

def build_towel_rail():
    reset(); steel=mat("rail",(.22,.25,.26),.8,.25); cloth=mat("linen",(.32,.34,.33),0,.88)
    cyl("bar",(0,0,.72),.018,.65,steel,(math.pi/2,0,0)); cube("towel",(0,.02,.49),(.22,.018,.24),cloth,.015)
    export("towel-rail")

def build_bottles():
    reset(); dark=mat("bottle",(.025,.035,.038),.15,.55); cap=mat("cap",(.95,.28,.03),.15,.4)
    for x in (-.11,.11):
      cyl("bottle",(x,0,.18),.055,.34,dark); cyl("cap",(x,0,.37),.035,.045,cap)
    export("bottle-set")

def build_bay():
    reset(); steel=mat("frame",(.18,.21,.22),.8,.27); glass=mat("low iron glass",(.48,.68,.72),.05,.12)
    for x in (-.86,.86):
      cube("upright",(x,0,1.28),(.035,.035,1.28),steel,.01)
    for z in (0,2.55): cube("cross",(0,0,z),(.9,.035,.035),steel,.01)
    cube("glass",(0,.02,1.28),(.84,.012,1.22),glass,.0)
    export("environment-bay")

def build_fan():
    reset(); steel=mat("fan alloy",(.12,.15,.16),.75,.28)
    bpy.ops.mesh.primitive_torus_add(major_radius=.38,minor_radius=.035,major_segments=48,minor_segments=8,rotation=(math.pi/2,0,0)); bpy.context.object.data.materials.append(steel)
    cyl("hub",(0,0,0),.075,.14,steel,(math.pi/2,0,0))
    for i in range(5):
      a=i*2*math.pi/5; o=cube("blade",(math.cos(a)*.18,0,math.sin(a)*.18),(.035,.025,.16),steel,.02); o.rotation_euler.y=-a
    export("fan")

def build_vault():
    reset()
    mats=[mat("warm alloy",(.43,.29,.09),.82,.25),mat("silver alloy",(.42,.46,.48),.9,.22),mat("dark bronze",(.31,.15,.07),.8,.3)]
    for i,x in enumerate((-.82,0,.82)): cyl("abstract-disc",(x,0,.75),.34,.07,mats[i],(math.pi/2,0,0))
    export("podium-vault")

def build_relief():
    reset(); stone=mat("wet stone",(.045,.055,.058),.1,.82); oak=mat("smoked oak",(.11,.06,.035),0,.72)
    for i in range(17):
      y=-1.3+i*.16; h=.16+.22*(.5+.5*math.sin(i*.93)); x=.45-abs(math.sin(i*.71))*.55
      cube("ridge",(x,y,.25+h),( .035,.065,h),stone,.015)
    cube("base",(0,0,.10),(.40,1.45,.10),oak,.025); export("fjord-relief")

for fn in (build_trainer,build_run_deck,build_table,build_analyser,build_vials,build_towel_rail,build_bottles,build_bay,build_fan,build_vault,build_relief): fn()
