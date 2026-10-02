"""Extract only manufacturer markings within reviewed ROIs, never photographic shading."""
from pathlib import Path
import numpy as np,json,sys
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
SLX='--slx' in sys.argv
DATA=ROOT/('blender/data-slx' if SLX else 'blender/data')
a=np.array(Image.open(ROOT/('assets/reference/slx/p01.png' if SLX else 'assets/reference/p02.png')).convert('RGBA')).astype(float)
lum=a[:,:,:3].mean(2)
regions={
 'frame': ('dark', [[(1160,881),(1481,518),(1597,532),(1240,912)],[(747,687),(866,619),(908,638),(795,745)],[(1279,389),(1419,389),(1419,413),(1279,413)]]),
 'fork': ('dark',[[(1747,668),(1781,658),(1835,872),(1804,880)]]),
 'post': ('light',[[(701,247),(854,250),(856,291),(701,283)]]),
 'rim_rear': ('light',[[(457,1228),(816,1228),(816,1290),(457,1290)],[(554,535),(635,535),(635,624),(554,624)]]),
 'rim_front': ('light',[[(1667,1228),(2030,1228),(2030,1290),(1667,1290)],[(1768,535),(1850,535),(1850,624),(1768,624)]]),
}
if SLX:
 regions.pop('fork');regions.pop('post');regions['frame']=('light',regions['frame'][1][:1]+regions['frame'][1][2:])
for name,(kind,polys) in regions.items():
 roi=Image.new('1',(a.shape[1],a.shape[0]));d=ImageDraw.Draw(roi)
 for pts in polys: d.polygon(pts,fill=1)
 mask=np.array(roi)&(a[:,:,3]>128)&((lum<95) if kind=='dark' else (lum>(65 if name.startswith("rim_") else 160 if SLX else 110)))
 ids={};v=[];f=[]
 for y,x in zip(*np.where(mask)):
  face=[]
  for pt in [(int(x),int(y)),(int(x+1),int(y)),(int(x+1),int(y+1)),(int(x),int(y+1))]:
   if pt not in ids: ids[pt]=len(v);v.append(pt)
   face.append(ids[pt])
  f.append(face)
 (DATA/('decal_'+name+'.json')).write_text(json.dumps({'v':v,'f':f},separators=(',',':')))
 print(name,len(f),'pixels')
