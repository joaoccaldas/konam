#!/usr/bin/env python3
"""Reviewable full Canyon component/geometry snapshots, no prices inferred."""
from pathlib import Path
import json,urllib.request,datetime,hashlib
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
for key,slug,product,weight in [('cfr','cfr/speedmax-cfr-axs',4524,9.1),('slx','cf-slx/speedmax-cf-slx-8-di2',4520,9.56)]:
 url=f'https://www.canyon.com/en-se/road-bikes/triathlon-bikes/speedmax/{slug}/{product}.html'
 raw=urllib.request.urlopen(url,timeout=30).read();s=BeautifulSoup(raw,'html.parser');folder=ROOT/'assets/reference'/('slx' if key=='slx' else 'cfr');folder.mkdir(exist_ok=True);folder.joinpath(f'product-{product}-se.html').write_bytes(raw)
 group=next(json.loads(x.string) for x in s.select('script[type="application/ld+json"]') if x.string and '"@type":"ProductGroup"' in x.string)
 rows=[]
 for item in s.select('.allComponents__sectionSpecListItemInner'):
  title=item.select_one('.allComponents__sectionSpecListItemTitle');name=item.select_one('.allComponents__specItemListItem--name');section=item.find_parent(class_='allComponents__sectionInner');heading=section.find(['h3','h4']) if section else None
  if not title or not name:continue
  features={}
  for row in item.select('.allComponents__specRow'):
   left=row.select_one('.allComponents__specRowLeft');right=row.select_one('.allComponents__specRowRight')
   if left and right:features[left.get_text(' ',strip=True)]=right.get_text(' ',strip=True)
  rows.append({'group':heading.get_text(' ',strip=True) if heading else 'Components','type':title.get_text(' ',strip=True),'name':name.get_text(' ',strip=True),'features':features})
 variants=group['hasVariant'];sizes={}
 for v in variants:
  if v.get('size') not in sizes:sizes[v.get('size')]={a['name']:{'value':a['value'],'unit':a.get('unitText','')} for a in v.get('additionalProperty',[])}
 for values in sizes.values():
  wb=values.get('Wheel Base')
  if wb and isinstance(wb['value'],(int,float)) and wb['value']<10:wb['sourceValue']=wb['value'];wb['value']=round(wb['value']*1000);wb['normalization']='Canyon locale thousands separator: 1.013 means 1013 mm, verified against geometry table.'
 record={'id':f'canyon-speedmax-{key}-'+('axs' if key=='cfr' else '8-di2')+'-my2027-m','key':key,'name':group['name'],'year':2027,'size':'M','weightKg':weight,'priceSEK':min(float(v['offers']['price']) for v in variants if v['offers'].get('priceCurrency')=='SEK'),'source':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'snapshotSha256':hashlib.sha256(raw).hexdigest(),'components':rows,'geometryBySize':sizes,'discrepancies':['Marketing mentions 30 mm tyre clearance, while frame and fork component rows say 28 mm. Confirm with Canyon.']+(['Front wheel component row is 65 mm; generic component-geometry row says 85 mm. Model follows the explicit 65/85 wheelset listing.'] if key=='slx' else [])}
 (ROOT/f'museum/specs-{key}.json').write_text(json.dumps(record,indent=2));print(key,record['priceSEK'],len(rows),'components',sizes.get('M'))
