#!/usr/bin/env python3
"""Reviewed model adapters separate catalogue/spec identity from shared viewer code."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
slx={
'frame':{'name':'Speedmax CF SLX frame','weight':1484,'spec':'CF SLX carbon · 12×142 · UDH · published component clearance 28 mm'},
'seatpost':{'name':'SP102 Standard seatpost','weight':133,'spec':'Carbon · standard straight post; no Splitter Plate Pro'},
'saddle':{'name':'Fizik Transiro Aeris LD R5','weight':223,'spec':'Triathlon split nose · steel rails'},
'wheel_front':{'name':'DT Swiss ARC 1600 Spline front','weight':812,'spec':'65 mm carbon · 22 mm internal · 12×100 · Center Lock'},
'wheel_rear':{'name':'DT Swiss ARC 1600 Spline rear','weight':904,'spec':'85 mm carbon · 22 mm internal · 12×142 · Shimano HG · Center Lock'},
'rim_front':{'name':'ARC 1600 rim (front)','spec':'65 mm deep · 22 mm internal'},'rim_rear':{'name':'ARC 1600 rim (rear)','spec':'85 mm deep · 22 mm internal'},
'hub_front':{'name':'DT Swiss Spline hub (front)','spec':'12×100 · Center Lock · hub model unconfirmed; geometry approximate'},'hub_rear':{'name':'DT Swiss Spline hub (rear)','spec':'12×142 · Shimano HG · hub model unconfirmed; geometry approximate'},
'tyre_rear':{'name':'Continental GP5000 S TR','weight':294,'spec':'28 mm · tubeless ready'},
'cassette':{'name':'Shimano CS-R8101','spec':'12-speed · 11–30 T','note':'11-12-13-14-15-16-17-19-21-24-27-30'},
'chain':{'name':'Shimano XT chain','spec':'12-speed · conventional roller chain','note':'Animated on a 52×14 route.'},
'crankset':{'name':'Shimano Ultegra R8100 · 4iiii Precision','spec':'165 mm · 52/36 T · left crank power meter'},
'chainrings':{'name':'Shimano Ultegra 52/36','spec':'Hollowglide-style outer ring · four-arm mounting'},
'powermeter_spider':{'name':'Ultegra four-arm spider','spec':'Asymmetric four-arm design; power sensing on left crank','note':''},
'crank_arm_ds':{'name':'Ultegra right crank','spec':'165 mm · Hollowtech II alloy'},'crank_arm_nds':{'name':'Ultegra 4iiii Precision left crank','spec':'165 mm · inner-side power sensor'},
'spindle':{'name':'Hollowtech II spindle','spec':'24 mm'},'bottom_bracket':{'name':'Shimano Pressfit BB72','weight':65,'spec':'PF86.5 · 24 mm spindle'},
'front_derailleur':{'name':'Shimano Ultegra FD-R8150','weight':111,'spec':'Di2 · braze-on'},'rear_derailleur':{'name':'Shimano Ultegra Di2 rear derailleur','weight':260,'spec':'12-speed · short cage'},
'axs_blips':{'name':'Shimano Dura-Ace R9160 TT buttons','weight':19,'spec':'Wired Di2 extension switches','note':''},
'rotor_front':{'name':'Shimano Ultegra RT-CL800 160','weight':112,'spec':'160 mm · Center Lock · Ice Technologies Freeza'},'rotor_rear':{'name':'Shimano Ultegra RT-CL800 140','weight':95,'spec':'140 mm · Center Lock · Ice Technologies Freeza'},
'brake_lever_left':{'name':'Shimano Dura-Ace TT brake (L)','weight':277,'spec':'Hydraulic · two piston'},'brake_lever_right':{'name':'Shimano Dura-Ace TT brake (R)','weight':278,'spec':'Hydraulic · two piston'},
'caliper_front':{'name':'Shimano Dura-Ace front caliper','spec':'Hydraulic · flat mount'},'caliper_rear':{'name':'Shimano Dura-Ace rear caliper','spec':'Hydraulic · flat mount'},
'di2_battery':{'name':'Shimano BT-DN300 battery','group':'drivetrain','spec':'Internal Di2 battery · hidden inside frame','note':'External dimensions approximate; shown in exploded view.'}}
for key in ['cfr','slx']:
 s=json.loads((R/f'museum/specs-{key}.json').read_text());bike={'id':s['id'],'key':key,'name':s['name'],'year':'2027','size':'M','weight':s['weightKg'],'price':f"from {int(s['priceSEK']):,} SEK",'chainring':50 if key=='cfr' else 52,'cog':14,'source':s['source'],'specs':s}
 profile={'schema_version':1,'bike':bike,'parts':slx if key=='slx' else {},'defaultCfg':{'frame':'#cdc8dd','decal':'#f1efef','finish':'satin','aerofuel':False,'rearBottles':False} if key=='slx' else {},'unavailableOptions':['rearBottles'] if key=='slx' else [],'compatiblePriceParts':['arm_pads','udh_hanger'] if key=='slx' else None}
 (R/f'museum/viewer-{key}.json').write_text(json.dumps(profile,indent=2))
