#!/usr/bin/env python3
"""Derive a compact articulated human from MakeHuman's CC0 base mesh/weights.
No MakeHuman application code is copied. Helpers are excluded; retained asset sources are immutable.
"""
from pathlib import Path
import json,numpy as np,hashlib
R=Path(__file__).resolve().parents[1];P=R/'assets/avatar';verts=[];faces=[];group=''
for line in (P/'base.obj').read_text().splitlines():
 if line.startswith('v '):verts.append([float(v) for v in line.split()[1:]])
 elif line.startswith('g '):group=line[2:]
 elif line.startswith('f ') and group=='body':
  f=[int(v.split('/')[0])-1 for v in line.split()[1:]]
  for i in range(1,len(f)-1):faces.append([f[0],f[i],f[i+1]])
v=np.array(verts);sk=json.loads((P/'default.mhskel').read_text());weights=json.loads((P/'default_weights.mhw').read_text())['weights']
def pt(n,end):return v[sk['joints'][sk['bones'][n][end]]].mean(0)
def convert(v):return [round(float(v[2])*.1,6),round(float(v[1])*.1,6),round(float(-v[0])*.1,6)]
hip=(pt('upperleg01.L','head')+pt('upperleg01.R','head'))/2
shoulder=(pt('upperarm01.L','head')+pt('upperarm01.R','head'))/2
bones=[['pelvis',convert(hip),convert(hip+np.array([0,1,0]))],['torso',convert(hip),convert(shoulder)],['neck',convert(shoulder),convert(pt('head','head'))],['head',convert(pt('head','head')),convert(pt('head','tail'))]]
for side in ['R','L']:
 for name,first,last in [('thigh','upperleg01','upperleg02'),('shin','lowerleg01','lowerleg02'),('foot','foot','toe2-3'),('upperarm','upperarm01','upperarm02'),('forearm','lowerarm01','lowerarm02'),('hand','wrist','finger3-3')]:bones.append([name+'.'+side,convert(pt(first+'.'+side,'head')),convert(pt(last+'.'+side,'tail'))])
lookup={b[0]:i for i,b in enumerate(bones)}
def mapped(n):
 side=n[-2:]
 if n.startswith('upperleg'):return 'thigh'+side
 if n.startswith('lowerleg'):return 'shin'+side
 if n.startswith(('foot','toe')):return 'foot'+side
 if n.startswith('upperarm'):return 'upperarm'+side
 if n.startswith('lowerarm'):return 'forearm'+side
 if n.startswith(('wrist','finger','metacarpal')):return 'hand'+side
 if n.startswith(('neck',)):return 'neck'
 if n.startswith(('spine','breast','clavicle','shoulder')):return 'torso'
 if n.startswith(('pelvis','root')):return 'pelvis'
 return 'head'
W=np.zeros((len(v),len(bones)))
for name,ww in weights.items():
 for idx,w in ww:W[idx,lookup[mapped(name)]]+=w
used=sorted(set(i for f in faces for i in f));remap={x:i for i,x in enumerate(used)};si=[];sw=[];colors=[]
for i in used:
 order=np.argsort(W[i])[-4:][::-1];vals=W[i,order];total=sum(vals)
 if total<.001:order=np.array([0,0,0,0]);vals=np.array([1,0,0,0]);total=1
 si.extend(map(int,order));sw.extend(round(float(a/total),6) for a in vals)
 # Blended material regions: textile torso/thigh/upperarm; skin hands/face/forearm/shin.
 clothes=sum(W[i,j] for j,b in enumerate(bones) if b[0] in ['pelvis','torso'] or b[0].startswith(('thigh','upperarm')))/max(W[i].sum(),.001)
 colors.append(round(float(clothes),4))
data={'license':'CC0-1.0','source':'https://github.com/makehumancommunity/makehuman','bones':bones,'position':[n for i in used for n in convert(v[i])],'index':[remap[i] for f in faces for i in f],'skinIndex':si,'skinWeight':sw,'clothing':colors}
(R/'web/src/avatar-data.json').write_text(json.dumps(data,separators=(',',':')))
(P/'provenance.json').write_text(json.dumps({'source':data['source'],'license':'CC0-1.0','derived_vertices':len(used),'triangles':len(faces),'files':{f:hashlib.sha256((P/f).read_bytes()).hexdigest() for f in ['base.obj','default.mhskel','default_weights.mhw','LICENSE.md']},'limitations':'Generic surface with reduced 16-bone skinning. Not measured anatomy or a personal likeness.'},indent=2))
print(len(used),'vertices',len(faces),'triangles')
