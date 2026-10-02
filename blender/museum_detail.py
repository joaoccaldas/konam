"""Reference-based refinement for the 4524. Preserve semantic parts and viewer pivots."""
import bpy, math, os, json
from mathutils import Vector
from lib import *
from components import PB
import frame as FR
import decals as DC

HERE=os.path.dirname(__file__)
DATA=os.environ.get('BIKE_PROFILE_DIR',os.path.join(HERE,'data'))
P=json.load(open(os.path.join(DATA,'profile.json')))

def px(x,y):
    return Vector(((x-P['bb_px'][0])*P['mm_per_px'],0,(P['bb_px'][1]-y)*P['mm_per_px']+264.5))

def replace_geo(obj, geo):
    # Keep origins/properties so animation, focus and explosion contracts survive.
    V,F=geo[:2]
    me=bpy.data.meshes.new(obj.name+'_photo')
    me.from_pydata([v-WORLD.get(obj.name,obj.location) for v in V],[],F)
    for m in obj.data.materials: me.materials.append(m)
    bm=bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth=True
    obj.data=me
    be=obj.modifiers.new('Manufactured edge radius','BEVEL'); be.width=.0012; be.segments=3
    be.limit_method='ANGLE'
    no=obj.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL'); no.keep_sharp=True

def poly_photo(coords, y0,y1):
    return prism([(px(x,y).x,px(x,y).z) for x,y in coords],y0,y1)

def refine(M,frame,fork):
    # Stock studio configuration: no optional bottles obscuring the silhouette.
    for nm in ('bottles_rear','bottle_cages_rear','bottle_front'):
        bpy.data.objects[nm].hide_render=True
        bpy.data.objects[nm]['optional_accessory']=True
    # Integrated Splitter Plate Pro, traced side outline. Lateral thickness is inferred.
    post=bpy.data.objects['seatpost']
    outline=[(578,112),(594,115),(751,201),(823,201),(852,174),(930,164),(953,174),(953,188),
             (927,214),(957,402),(881,404),(866,301),(711,283),(697,275),(615,171)]
    geos=[poly_photo(outline,-13.5,13.5)]
    geos.append(box(px(907,177),(64,40,20),3))
    replace_geo(post,join_geo(geos))
    # AeroShield shell and rear fuel tray follow the high-resolution side profile.
    import cockpit as CK
    rings=[]
    stations=[(1612,239,291,91),(1640,144,281,101),(1680,71,262,101),(1760,73,235,96),(1840,77,203,82),(1918,84,172,57)]
    for x,yt,yb,w in stations:
        q=px(x,yt);zb=px(x,yb).z
        rings.append([Vector((q.x,y,z))*.001 for y,z in CK.shell_section(q.z,zb,w)])
    V,F,U=loft(rings,True,True,True)
    replace_geo(bpy.data.objects['aeroshield'],(V,F))
    traypts=[(1530,87),(1671,71),(1637,249),(1453,242),(1490,155)]
    geos=[poly_photo(traypts,-101,-98),poly_photo(traypts,98,101)]
    geos.append(box(px(1548,243),(155,200,4),1))
    replace_geo(bpy.data.objects['aerofuel_front'],join_geo(geos))
    pads=[]
    for sign in (-1,1): pads.append(box(Vector((555,sign*42,994)),(142,62,13),4))
    replace_geo(bpy.data.objects['arm_pads'],join_geo(pads))
    # Flush top-tube access cover, not a floating plate.
    lid=bpy.data.objects['toptube_storage_lid']
    replace_geo(lid,box(px(1536,385),(86,28,3),1))
    # Fizik Aeris LD R1: manufacturer dimensions 242 x 135, 55 mm split nose, 7x9 rails.
    sa=bpy.data.objects['saddle']
    stations=[(-270,4,1022,3),(-258,80,1017,7),(-235,122,1011,12),(-207,135,1007,17),
              (-168,123,1005,20),(-126,91,1004,24),(-86,65,1004,28),(-49,55,1002,31),
              (-35,55,997,27),(-28,45,990,16)]
    path=[Vector((x,0,z-t/2))*.001 for x,w,z,t in stations]
    body=sweep(path,[superellipse(w,t,2.5,48) for x,w,z,t in stations])
    pb=PB().add(body,M['pad'])
    for side in (-1,1):
        rail=catmull([Vector((x,side*y,z))*.001 for x,y,z in [(-37,20,975),(-80,22,963),(-140,24,957),(-204,30,961),(-245,40,985)]],6)
        pb.add(sweep(rail,[superellipse(7,9,2.4,16)]*len(rail)),M['carbon'])
    temp=pb.build('saddle_refined',origin=sa.location.copy(),sharp=55)
    sa.data=temp.data;bpy.data.objects.remove(temp)
    # Nose split, kept out of the rails. Channel details beyond the photographed side are interpreted.
    cutter_geo=box(Vector((-94,0,1000)),(142,14,80),5)
    cutter=mesh('saddle_channel_cutter',cutter_geo[0],cutter_geo[1],M['black'])
    mod=sa.modifiers.new('Split nose relief','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.context.view_layer.objects.active=sa
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    bev=sa.modifiers.new('Soft upholstery edge','BEVEL');bev.width=.001;bev.segments=3;bev.limit_method='ANGLE'
    # Lower, swept extensions following the studio view instead of vertical ski tips.
    ex=bpy.data.objects['extensions']; geos=[]
    for side in (-1,1):
        pts=[px(x,y)+Vector((0,side*27,0)) for x,y in [(1878,163),(1945,151),(1990,143),(2010,159),(2040,155),(2080,125),(2120,99)]]
        geos.append(polyline_tube(catmull([p*.001 for p in pts],8),11,24))
    replace_geo(ex,join_geo(geos))
    bl=bpy.data.objects['axs_blips']; g=[]
    for side in (-1,1):
        g.append(box(px(2110,104)+Vector((0,side*27,0)),(20,17,12),3))
    replace_geo(bl,join_geo(g))
    # Original text used a widely spaced substitute font. Replace with sampled original decal geometry.
    for name in ('frame_decals','fork_decals','seatpost_decals','aeroshield_decals'):
        bpy.data.objects[name].hide_render=True
        bpy.data.objects[name]['obsolete']=True
    for nm,target,matkey in [('frame',frame,'decal_dark'),('fork',fork,'decal_dark'),('post',post,'decal_light'),('rim_rear',bpy.data.objects['rim_rear'],'decal_light'),('rim_front',bpy.data.objects['rim_front'],'decal_light')]:
        fn=os.path.join(DATA,'decal_'+nm+'.json')
        if not os.path.exists(fn): continue
        data=json.load(open(fn)); bvh=DC.bvh_of(target)
        verts,faces=[],[]
        for sign in (-1,1):
            offset=len(verts); valid=[]
            for x,y in data['v']:
                pt=px(x,y)*.001
                hit=bvh.ray_cast(Vector((pt.x,sign*.3,pt.z)),Vector((0,-sign,0)))
                if hit[0] is None: valid.append(False); verts.append(pt)
                else: valid.append(True); verts.append(hit[0]+Vector((0,sign*.00035,0)))
            for face in data['f']:
                if all(valid[i] for i in face): faces.append([i+offset for i in (face if sign<0 else face[::-1])])
        if faces: mesh(nm+'_graphics',verts,faces,M[matkey],parent=target,smooth=True)
    # Detailed reusable surface shading, physical scale and very low amplitude.
    for key,scale,strength,distance in [('carbon',900,.13,.00005),('rim',1100,.12,.000035),('tyre',1700,.16,.00006),('pad',1100,.25,.00012),('carbon_crank',1000,.12,.00003)]:
        m=M[key]; nt=m.node_tree; bs=nt.nodes.get('Principled BSDF')
        tex=nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=scale; tex.inputs['Detail'].default_value=2
        co=nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(co.outputs['Object'],tex.inputs['Vector'])
        bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=strength; bump.inputs['Distance'].default_value=distance
        nt.links.new(tex.outputs['Fac'],bump.inputs['Height']); nt.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    M['carbon'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.008,.009,.011,1)
    M['pad'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.007,.008,.009,1)
    M['carbon'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.45
    M['rim'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.009,.010,.012,1)
    # Tyre mould seams and valve stems. Geometry survives GLB export.
    for which,C in [('front',FR.AX_F),('rear',FR.AX_R)]:
        parent=bpy.data.objects['wheel_'+which]; pb=PB()
        for sign in (-1,1):
            r=331.0 if which=='front' else 332.0
            pts=[(C+Vector((r*math.cos(i*2*math.pi/256),sign*8,r*math.sin(i*2*math.pi/256))))*.001 for i in range(257)]
            pb.add(polyline_tube(pts,.16,6),M['tyre'])
        pb.build('mould_seams_'+which,parent=parent,origin=C*.001,)
        pv=C+Vector((0,0,228))
        PB().add(tube(pv*.001,(pv+Vector((0,0,-26)))*.001,2.3,2.3,16),M['alu_silver']).add(tube((pv+Vector((0,0,-24)))*.001,(pv+Vector((0,0,-29)))*.001,2.6,2.6,16),M['black']).build('valve_'+which,parent=parent,origin=C*.001,)
