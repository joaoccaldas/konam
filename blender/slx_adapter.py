"""4520 MY2027 size-M adapter. Own photo frame and Shimano-specific components.
Unseen widths, machining, cables and internal mechanism geometry remain estimates.
"""
import bpy,math,os,json
from mathutils import Vector
from lib import *
import components as CO,frame as FR,decals as DC
from museum_detail import replace_geo,px,poly_photo

def install():
 CO.CASSETTE=[11,12,13,14,15,16,17,19,21,24,27,30];CO.CHAINRINGS=(52,36)
 original=CO.build_wheel;spokes_original=CO.spokes
 def wheel(M,which,parent):
  old=CO.RIM_PROF
  if which=='front':CO.RIM_PROF=[(r if r>=311 else 311-(311-r)*65/85,y) for r,y in old]
  CO.spokes=lambda c,n,fy,fr,*args,**kwargs:spokes_original(c,24,fy,fr,rim_r=248 if which=='front' else 228)
  try:return original(M,which,parent)
  finally:CO.RIM_PROF=old;CO.spokes=spokes_original
 CO.build_wheel=wheel

def refine(M):
 O=bpy.data.objects;BB=FR.BB;W=FR.W
 M['paint'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.62,.58,.72,1)
 M['decal_dark'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.85,.84,.85,1)
 # SP102 post, separately traced from 4520 photograph (no rear Splitter Plate).
 outline=[(848,170),(934,170),(954,181),(949,197),(929,215),(957,402),(881,404),(849,216),(838,184)]
 replace_geo(O['seatpost'],join_geo([poly_photo(outline,-13,13),box(px(903,180),(60,38,16),3)]))
 for name in ['bottles_rear','bottle_cages_rear','aerofuel_front','bottle_front']:
  O[name].hide_render=True;O[name]['optional_accessory']=True
 # Standard R5 metal rails; body dimensions match Aeris LD family but rail shape is inferred.
 for slot in O['saddle'].material_slots:
  if slot.material and slot.material.name.startswith('carbon'):slot.material=M['alu_dark']
 # Replace the SRAM ring/spider system with four-arm Ultegra architecture.
 rings=CO.PB()
 for teeth,y,inner in [(52,-47.4,82),(36,-40.4,55)]:
  rings.add(CO.cog(BB,teeth,y,thick=2.1,inner=inner,tip=3.2),M['alu_dark'])
  r=CO.cog_r(teeth);rings.add(lathe([(inner,y-2),(r-5,y-2),(r-5,y+1),(inner,y+1)],128,BB,closed_prof=True),M['alu_black'])
 tmp=rings.build('ultegraring',origin=WORLD['chainrings']);O['chainrings'].data=tmp.data;bpy.data.objects.remove(tmp)
 spider=CO.PB()
 for deg in [38,142,225,315]:
  a=math.radians(deg);pts=[W(BB+Vector((r*math.cos(a-.15*t),-43,r*math.sin(a-.15*t)))) for t,r in [(0,20),(.5,50),(1,84)]]
  spider.add(sweep(pts,[superellipse(11,27,3,24),superellipse(9,23,3,24),superellipse(8,20,3,24)]),M['alu_black'])
 spider.add(lathe([(12,-45),(28,-45),(31,-38),(12,-38)],48,BB,closed_prof=True),M['alu_black'])
 tmp=spider.build('ultegra_spider',origin=WORLD['powermeter_spider']);O['powermeter_spider'].data=tmp.data;bpy.data.objects.remove(tmp)
 for side in ['ds','nds']:
  arm=O['crank_arm_'+side];arm.data.materials.clear();arm.data.materials.append(M['alu_black'])
  for f in arm.data.polygons:f.material_index=0
 # Left-arm 4iiii pod, replacing the SRAM spider LED sensor.
 sensor=CO.PB().add(box(BB+Vector((-78,51,17)),(58,11,23),5),M['black']).build('4iiii_precision_sensor',parent=O['crank_arm_nds'],origin=WORLD['crank_arm_nds'])
 sensor['description']='4iiii Precision left-crank power meter, external envelope approximate'
 replace_geo(O['spindle'],lathe([(9,-66),(12,-66),(12,66),(9,66)],40,BB,closed_prof=True))
 # True 11–30 tooth progression; open aluminium carrier instead of Red X-Dome.
 pb=CO.PB()
 for i,n in enumerate(CO.CASSETTE):pb.add(CO.cog(FR.AX_R,n,CO.cassette_y(i),inner=17 if i<5 else CO.cog_r(n)-8.5),M['steel'])
 for deg in range(0,360,72):
  a=math.radians(deg);pb.add(tube(W(FR.AX_R+Vector((18*math.cos(a),-29,18*math.sin(a)))),W(FR.AX_R+Vector((51*math.cos(a+.13),-25,51*math.sin(a+.13)))),4,4,12),M['alu_dark'])
 temp=pb.build('ultegra_cassette',origin=WORLD['cassette']);O['cassette'].data=temp.data;bpy.data.objects.remove(temp)
 # Compact wired front derailleur: no removable AXS battery.
 pb=CO.PB().add(box(Vector((-50,-38,393)),(40,25,39),6),M['black'])
 for y0,y1 in [(-56,-54),(-39,-37)]:pb.add(lathe([(108,y0),(126,y0),(126,y1),(108,y1)],28,BB,closed_prof=True,a0=math.radians(97),a1=math.radians(140)),M['alu_silver'])
 pb.add(box(Vector((-48,-44,371)),(13,18,20),2),M['alu_silver'])
 temp=pb.build('di2_front',origin=WORLD['front_derailleur']);O['front_derailleur'].data=temp.data;bpy.data.objects.remove(temp)
 meta=json.loads(O['chain']['chain_path']);# Chain routing contains the matching 52T path.
 _,route=CO.chain_path();U=Vector((route['U'][0],-48,route['U'][1]));L=Vector((route['L'][0],-48,route['L'][1]));pb=CO.PB()
 for p in [U,L]:pb.add(CO.cog(p,12,-48,thick=2.2,inner=5,tip=2.6),M['black'])
 for side in [-54,-42]:pb.add(tube(W(Vector((U.x,side,U.z))),W(Vector((L.x,side,L.z))),9,8,16),M['alu_dark'])
 knuckle=FR.AX_R+Vector((-17,-76,-29));pb.add(box(knuckle,(49,28,35),8),M['alu_dark']);pb.add(tube(W(knuckle),W(U+Vector((-6,-23,20))),12,10,20),M['alu_black']);pb.add(lathe([(6,-79),(14,-79),(14,-86),(6,-86)],28,FR.AX_R,closed_prof=True),M['alu_dark'])
 temp=pb.build('di2_rear',origin=WORLD['rear_derailleur']);O['rear_derailleur'].data=temp.data;bpy.data.objects.remove(temp)
 # Six heat-radiating arms and a steel brake track, RT-CL800 external interpretation.
 for which,radius,y in [('front',80,44),('rear',70,51)]:
  C=FR.AX_F if which=='front' else FR.AX_R;ring,_=CO.rotor(C,radius,y);pb=CO.PB().add(ring,M['rotor'])
  for k in range(6):
   a=k*math.tau/6;pts=[W(C+Vector((r*math.cos(a+t*.38),y,r*math.sin(a+t*.38)))) for t,r in [(0,17),(.5,radius*.48),(1,radius-12)]]
   pb.add(sweep(pts,[superellipse(2.5,10,2.5,12),superellipse(2.5,23,2.5,12),superellipse(2.5,14,2.5,12)],lat=Vector((0,1,0))),M['alu_silver'])
  pb.add(lathe([(12,y-1),(22,y-1),(22,y+1),(12,y+1)],48,C,closed_prof=True),M['alu_black'])
  temp=pb.build('shimano_rotor',origin=WORLD['rotor_'+which]);O['rotor_'+which].data=temp.data;bpy.data.objects.remove(temp)
 # Internal battery remains inside the frame until exploded.
 CO.PB().add(tube(W(Vector((-113,0,710))),W(Vector((-129,0,810))),8.5,8.5,24),M['black']).build('di2_battery',part='di2_battery',explode=[-.16,.3,.2])
 # Front valve follows the shallower rim.
 if O.get('valve_front'):O['valve_front'].location.z+=.02
 bpy.context.scene['variant']='4520 CF SLX 8 Di2; individually photo-reconstructed frame; interpreted Shimano detail'
