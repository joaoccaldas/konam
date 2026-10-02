#!/usr/bin/env python3
"""Refresh fixed, reviewed Canyon Sweden product URLs. Fail closed on wrong currency/name.
Snapshots and price records are written atomically after all pages pass validation.
"""
import json,re,urllib.request,datetime,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PRODUCTS=[
('cassette','SRAM Red XG-1290','gear/bike-parts/drivetrain/cassettes/sram-red-xg-1290-12-speed-cassette/9102271.html','family','Select 10–33 variant; family listing price.'),
('chain','SRAM Red E1','gear/bike-parts/drivetrain/chains/sram-red-e1-12%2F13s-chain-126-links/10016642.html','family','126-link replacement; shorten to required length. Listed coming soon Jan–Feb 2027 when researched.'),
('arm_pads','Canyon x Ergon','gear/bike-parts/aero-bars-and-tri-extensions/canyon-x-ergon-arm-pads-for-aeroshield/9102531.html','family','Choose S/M or L/XL. Standard AeroShield pads, not Pro.'),
('bottom_bracket','SRAM DUB Pressfit 86.5','gear/bike-parts/drivetrain/bottom-brackets/sram-dub-pressfit-86.5-bottom-bracket/10013814.html','exact','Standard PF86.5, not Wide.'),
('udh_hanger','SRAM UDH','sram-udh-derailleur-hanger/10006305.html','exact','UDH replacement; confirm complete hardware with Canyon.'),
('aeroshield_pro_upgrade','Canyon AeroShield Pro','gear/bike-parts/aero-bars-and-tri-extensions/canyon-aeroshield-pro-monocoque-handlebar-extension/9102533.html','upgrade','Optional Pro upgrade; not the price of the stock AeroShield.')]
records={};snapshots={};stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
for part,expected,path,match,note in PRODUCTS:
 url='https://www.canyon.com/en-se/'+path
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Speedmax-local-reference/1.0'}),timeout=30) as response:
  if not response.url.startswith('https://www.canyon.com/en-se/'):raise RuntimeError('Unexpected market redirect')
  raw=response.read();s=raw.decode('utf-8')
 products=[]
 def walk(x):
  if isinstance(x,dict):
   if x.get('@type')=='Product':products.append(x)
   for v in x.values():walk(v)
  elif isinstance(x,list):
   for v in x:walk(v)
 for block in re.findall(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',s,re.S):
  try:d=json.loads(block)
  except ValueError:continue
  walk(d)
 if part=='cassette':products.sort(key=lambda x:'10-33' not in x.get('name',''))
 d=next((x for x in products if expected.lower() in x.get('name','').lower()),None)
 if not d:raise RuntimeError('Product identity not found: '+part)
 offer=d.get('offers',{});price=float(offer.get('price',0))
 if offer.get('priceCurrency')!='SEK' or price<=0:raise RuntimeError('No valid SEK quote: '+part)
 records[part]={'name':d['name'],'price':price,'currency':'SEK','match':match,'note':note,'url':url,'availability':offer.get('availability','').split('/')[-1],'checkedAt':stamp,'snapshotSha256':hashlib.sha256(raw).hexdigest()};snapshots[part]=raw
out=ROOT/'assets/reference/prices-se';out.mkdir(exist_ok=True)
for part,raw in snapshots.items():(out/(part+'.html')).write_bytes(raw)
dest=ROOT/'museum/prices-se.json';tmp=dest.with_suffix('.tmp');tmp.write_text(json.dumps({'market':'Sweden','currency':'SEK','checkedAt':stamp,'tax':'Canyon displays VAT included; shipping excluded. Verify selected variant and current price at Canyon.','items':records},indent=2));tmp.replace(dest)
print(json.dumps({k:[v['price'],v['availability']] for k,v in records.items()},indent=2))
