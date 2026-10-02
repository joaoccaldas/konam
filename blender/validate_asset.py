"""Check physical asset contracts and render a calibrated, unlit silhouette."""
import bpy,bmesh,math,json,sys,os
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];out=args[0];os.makedirs(out,exist_ok=True)
prof=json.load(open(os.path.join(os.environ.get('BIKE_PROFILE_DIR',os.path.join(os.path.dirname(__file__),'data')),'profile.json')))
sc=bpy.context.scene;checks={};issues=[]
for name in ('frame','fork'):
 o=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(o.data)
 d={'vertices':len(bm.verts),'triangles':sum(len(f.verts)-2 for f in bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'dimensions_m':list(o.dimensions)}
 d['finite']=all(math.isfinite(c) for v in bm.verts for c in v.co)
 checks[name]=d;bm.free()
 if not d['finite'] or d['nonmanifold_edges']: issues.append(name+' mesh topology')
front=bpy.data.objects['wheel_front'].location;rear=bpy.data.objects['wheel_rear'].location;bb=bpy.data.objects['crankset'].location
checks['geometry_mm']={'wheelbase':1000*(front.x-rear.x),'chainstay':1000*(bb-rear).length,'bb_drop':1000*(rear.z-bb.z),'axle_lateral_difference':1000*abs(front.y-rear.y)}
for k,want in [('wheelbase',1013),('chainstay',420),('bb_drop',75)]:
 if abs(checks['geometry_mm'][k]-want)>.02: issues.append(k)
# Check actual world-space mesh bounds, not just pivots: replacement geometry can
# otherwise receive a parent's translation twice while every pivot still passes.
bpy.context.view_layer.update()
checks['component_centres_mm']={}
for name,anchor,tolerance in [('chainrings',bb,3),('cassette',rear,3),('rotor_front',front,3),('rotor_rear',rear,3)]:
 o=bpy.data.objects[name];v=[o.matrix_world@v.co for v in o.data.vertices]
 centre=Vector([(min(p[i] for p in v)+max(p[i] for p in v))/2 for i in range(3)])
 error=1000*math.hypot(centre.x-anchor.x,centre.z-anchor.z)
 checks['component_centres_mm'][name]={'radial_error':error,'world_centre':list(centre*1000)}
 if error>tolerance:issues.append(name+' misplaced geometry')
opts=[o for o in sc.objects if o.get('optional_geometry')]
checks['optional_assets']={'count':len(opts),'hidden_in_stock_render':all(o.hide_render for o in opts),'finite':all(math.isfinite(c) for o in opts if o.type=='MESH' for v in o.data.vertices for c in v.co)}
if opts and (not checks['optional_assets']['hidden_in_stock_render'] or not checks['optional_assets']['finite']):issues.append('optional assets')
checks['issues']=issues
with open(os.path.join(out,'geometry-checks.json'),'w') as f:json.dump(checks,f,indent=2)
# Exact reference projection: no perspective fitting tricks, same metres per pixel.
for o in sc.objects: o.hide_render=o.name not in ('frame','fork')
c=bpy.data.cameras.new('Calibration');c.type='ORTHO';c.ortho_scale=2400*prof['mm_per_px']/1000
co=bpy.data.objects.new('Calibration',c);sc.collection.objects.link(co)
co.location=((1200-prof['bb_px'][0])*prof['mm_per_px']/1000,-5,((prof['bb_px'][1]-675)*prof['mm_per_px']+264.5)/1000)
co.rotation_euler=(math.pi/2,0,0);sc.camera=co
sc.render.engine='BLENDER_WORKBENCH';sc.render.film_transparent=True;sc.render.resolution_x=2400;sc.render.resolution_y=1350;sc.render.resolution_percentage=100
sc.display.shading.light='FLAT';sc.display.shading.color_type='SINGLE';sc.display.shading.single_color=(1,1,1);sc.display.shading.show_shadows=False;sc.display.shading.show_cavity=False;sc.display.shading.show_specular_highlight=False
sc.render.filepath=os.path.join(out,'silhouette.png');bpy.ops.render.render(write_still=True)
print(json.dumps(checks,indent=2))
if issues: raise RuntimeError('Asset validation failed: '+str(issues))
