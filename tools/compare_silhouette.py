"""Reference-space 2D QA. This is not a claim of metrology or hidden 3D accuracy."""
from pathlib import Path
import json,os,numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as ndi
ROOT=Path(__file__).resolve().parents[1]; OUT=Path(os.environ.get('BIKE_OUT',ROOT/'assets/museum'))
photo=Image.open(Path(os.environ.get('BIKE_REFERENCE',ROOT/'assets/reference/p02.png'))).convert('RGBA');a=np.array(photo).astype(float)
paint=(a[:,:,:3].mean(2)>=145)&(a[:,:,3]>128)
filled=ndi.binary_fill_holes(paint)&(a[:,:,3]>128)
# Visible upper main triangle; excludes derailleur, BB, stays, fork and accessories.
roi=np.zeros(paint.shape,bool);roi[385:785,890:1580]=True
ref=filled & roi
# Interior transparent frame window is retained. Logos enclosed by paint are filled.
results={}
base=Image.new('RGBA',photo.size,(236,237,237,255));base.alpha_composite(photo)
for name,folder,color in ([('revised','checks',(11,168,187))] if os.environ.get('BIKE_VARIANT')=='slx' else [('baseline','baseline-checks',(247,143,62)),('revised','checks',(11,168,187))]):
 p=np.array(Image.open(OUT/folder/'silhouette.png').convert('RGBA'))[:,:,3]>128
 pred=p&roi;union=(pred|ref).sum();iou=(pred&ref).sum()/union
 er=ref&~ndi.binary_erosion(ref);ep=pred&~ndi.binary_erosion(pred)
 # Exclude the artificial rectangle crop edges from boundary statistics.
 safe=ndi.binary_erosion(roi,iterations=4);er &=safe;ep &=safe
 dist=np.r_[ndi.distance_transform_edt(~er)[ep],ndi.distance_transform_edt(~ep)[er]]*float(os.environ.get('BIKE_MM_PER_PX','.83379'))
 results[name]={'visible_upper_frame_iou':round(float(iou),5),'boundary_median_mm':round(float(np.median(dist)),3),'boundary_p95_mm':round(float(np.percentile(dist,95)),3),'boundary_max_mm':round(float(dist.max()),3)}
 edge=ndi.binary_dilation(p&~ndi.binary_erosion(p),iterations=1)
 lay=np.zeros((*edge.shape,4),np.uint8);lay[edge]=(*color,255)
 overlay=base.copy();overlay.alpha_composite(Image.fromarray(lay));overlay.convert('RGB').save(OUT/('overlay_'+name+'.png'))
results['scope']='Visible upper main triangle only: photo ROI x890:1580, y385:785 at 2400x1350. Threshold-derived segmentation, not independent measurements. Occluded/lateral geometry is not scored.'
results['projection']='Fixed independently calibrated wheelbase, orthographic; no post-render alignment.'
results['pass']=results['revised']['visible_upper_frame_iou']>.95 and results['revised']['boundary_p95_mm']<5
(OUT/'silhouette-report.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
if not results['pass']:raise SystemExit('Photo alignment gate failed')
