"""Reusable metre-scale exhibition rig. Usage blender -b MODEL -P this.py -- OUT [samples]."""
import bpy,sys,os,math,json
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];out=args[0];os.makedirs(out,exist_ok=True)
samples=int(args[1]) if len(args)>1 else 48
sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc.unit_settings.scale_length=1
sc.render.engine='CYCLES';sc.cycles.samples=samples;sc.cycles.use_denoising=True
try:
 p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.get_devices()
 for d in p.devices: d.use=d.type=='METAL'
 sc.cycles.device='GPU'
except Exception: sc.cycles.device='CPU'
sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast'
sc.render.resolution_x=1800;sc.render.resolution_y=1125;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG';sc.render.film_transparent=False
for o in sc.objects:
 if o.get('template') or o.get('obsolete'): o.hide_render=True
world=bpy.data.worlds.new('Museum ambient');sc.world=world
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.25,.32,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.17
rig=bpy.data.collections.new('EXHIBITION • lighting & cameras');sc.collection.children.link(rig)
def link(o): rig.objects.link(o);return o
def area(name,loc,target,power,size,color=(1,1,1),height=None):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='RECTANGLE';d.size=size;d.size_y=height or size;d.color=color
 o=link(bpy.data.objects.new(name,d));o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Long softbox • key',(0,-2.4,3.1),(.15,0,.5),240,3.5,(1,.95,.87),1.8)
area('Cool edge strip',(.7,1.7,2.1),(.2,0,.6),300,3.2,(.72,.84,1),.6)
area('Front reflection card',(2.4,-.7,1.3),(.2,0,.6),80,1.5,(1,1,1),2.5)
area('Rear fill',(-2,-.4,1.1),(-.2,0,.5),65,1.8,(.82,.89,1),2)
area('Ceiling ribbon',(0,0,3.6),(0,0,.5),170,4,(1,.96,.91),.55)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.0012));floor=bpy.context.object;floor.name='Gallery floor'
m=bpy.data.materials.new('Polished charcoal');bs=m.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.016,.021,.027,1);bs.inputs['Roughness'].default_value=.30;bs.inputs['Metallic'].default_value=.15
floor.data.materials.append(m)
views={
 'hero':((1.48,-3.35,1.30),(.10,0,.54),62),
 'side':((.094,-4,.53),(.094,0,.53),64),
 'cockpit':((1.36,-1.30,1.50),(.54,0,.91),70),
 'drivetrain':((.12,-1.52,.66),(-.18,0,.30),68),
 'rear':((-1.42,2.60,1.18),(.05,0,.53),56),
}
for name,(pos,tgt,lens) in views.items():
 d=bpy.data.cameras.new('Camera • '+name);o=link(bpy.data.objects.new('Camera • '+name,d));o.location=pos;o.rotation_euler=(Vector(tgt)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens
 if name=='side': d.type='ORTHO';d.ortho_scale=2.08
sc.camera=bpy.data.objects['Camera • hero']
# Embedded reference sheet remains hidden from export/render; useful for future hand edits.
ref=bpy.data.objects.new('REFERENCE • calibrated side photograph',None);rig.objects.link(ref);ref.empty_display_type='IMAGE'
ref.data=bpy.data.images.load(os.environ.get('BIKE_REFERENCE',os.path.abspath(os.path.join(out,'../reference/p02.png'))));ref.data.pack();ref.empty_display_size=1.999;ref.color[3]=.30;ref.hide_render=True;ref.hide_viewport=True
sc['accuracy']='Photo-aligned 2D study; unmeasured lateral widths and mechanisms remain estimates.'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'speedmax_museum.blend'))
for name in ([] if len(args)>2 and args[2]=='none' else args[2].split(',') if len(args)>2 else ['hero','side','cockpit','drivetrain','rear']):
 sc.camera=bpy.data.objects['Camera • '+name];sc.render.filepath=os.path.join(out,'museum_'+name+'.png');bpy.ops.render.render(write_still=True)
