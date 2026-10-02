#!/usr/bin/env python3
from pathlib import Path
import numpy as np,json,sys
from PIL import Image
from scipy.optimize import least_squares
source=Path(sys.argv[1]);dest=Path(sys.argv[2]);a=np.asarray(Image.open(source).convert('RGBA'));mask=a[:,:,3]>128;fits=[]
for side in [0,1]:
 pts=[];x0,x1=(100,1100) if not side else (1400,2320)
 for y in range(650,1170,2):
  xs=np.flatnonzero(mask[y,x0:x1]);
  if len(xs):pts.append([x0+(xs[0] if not side else xs[-1]),y])
 for x in range(350 if not side else 1550,850 if not side else 2100,2):
  ys=np.flatnonzero(mask[1100:,x]);
  if len(ys):pts.append([x,1100+ys[-1]])
 pts=np.array(pts);initial=[590 if not side else 1810,915,405]
 r=least_squares(lambda p:np.hypot(pts[:,0]-p[0],pts[:,1]-p[1])-p[2],initial,loss='soft_l1',f_scale=1)
 err=np.hypot(pts[:,0]-r.x[0],pts[:,1]-r.x[1])-r.x[2];keep=np.abs(err)<2
 r=least_squares(lambda p:np.hypot(pts[keep,0]-p[0],pts[keep,1]-p[1])-p[2],r.x)
 fits.append({'centre':r.x[:2].tolist(),'radius':float(r.x[2]),'residualRmsPx':float(np.sqrt(np.mean(r.fun**2))),'samples':int(keep.sum())})
scale=1013/np.linalg.norm(np.array(fits[1]['centre'])-fits[0]['centre']);rear=fits[0]['centre'];bb=[rear[0]+np.sqrt(420**2-75**2)/scale,rear[1]+75/scale]
d={'source':str(source),'wheelbaseMm':1013,'wheels':fits,'mm_per_px':scale,'bb_px':bb};dest.parent.mkdir(exist_ok=True,parents=True);dest.write_text(json.dumps(d,indent=2));print(json.dumps(d,indent=2))
