"""Editable CC0 human mesh with a 16-bone fit rig; optional in stock scenes."""
import bpy,json,os
from mathutils import Matrix,Vector
ROOT=os.path.dirname(os.path.dirname(__file__))
def build(collection):
 data=json.load(open(os.path.join(ROOT,'web/src/avatar-data.json')));pose=json.load(open(os.path.join(ROOT,'blender/data/avatar-rig.json')))
 C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)));ci=C.inverted()
 def xyz(a):return C@Vector(a)
 verts=[xyz(data['position'][i:i+3]) for i in range(0,len(data['position']),3)];faces=[data['index'][i:i+3] for i in range(0,len(data['index']),3)]
 me=bpy.data.meshes.new('Human anatomical surface CC0');me.from_pydata(verts,[],faces);me.update();obj=bpy.data.objects.new('RIDER • articulated human',me);collection.objects.link(obj)
 col=me.color_attributes.new(name='Race suit and skin',type='FLOAT_COLOR',domain='POINT')
 for i,e in enumerate(col.data):e.color=(*pose['colors'][i*3:i*3+3],1)
 material=bpy.data.materials.new('Rider • skin and textile');nodes=material.node_tree.nodes;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.9;attr=nodes.new('ShaderNodeVertexColor');attr.layer_name=col.name;material.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color']);me.materials.append(material)
 for f in me.polygons:f.use_smooth=True
 arm=bpy.data.armatures.new('Contact fit skeleton');rig=bpy.data.objects.new('RIDER • contact rig',arm);collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for name,a,b in data['bones']:
  bone=arm.edit_bones.new(name);bone.head=xyz(a);bone.tail=xyz(b)
 bpy.ops.object.mode_set(mode='OBJECT')
 for i,(name,a,b) in enumerate(data['bones']):
  group=obj.vertex_groups.new(name=name)
  for j in range(len(verts)):
   w=sum(data['skinWeight'][j*4+k] for k in range(4) if data['skinIndex'][j*4+k]==i)
   if w>0:group.add([j],w,'REPLACE')
  array=pose['bones'][i]['matrix'];m=Matrix([array[k:k+4] for k in range(0,16,4)]).transposed();rig.pose.bones[name].matrix=C@m@ci@arm.bones[name].matrix_local
 mod=obj.modifiers.new('Measured-contact skinning','ARMATURE');mod.object=rig;obj.parent=rig
 for o in [obj,rig]:o['optional_geometry']=True;o['optional_accessory']=True;o.hide_render=True;o.hide_set(True)
 obj['license']='MakeHuman base mesh and weights: CC0-1.0';obj['source']='https://github.com/makehumancommunity/makehuman';rig['fit']=json.dumps(pose['fit']);rig['instructions']='Optional generic anatomical surface. Static stock-contact pose; edit pose bones. Not a body scan or manufacturer fit approval.'
 return obj,rig
