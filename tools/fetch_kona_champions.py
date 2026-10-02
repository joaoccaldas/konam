#!/usr/bin/env python3
"""Resolve credits for the Kona Champions room from Wikimedia Commons.

Facts (years, times, splits) are hand-verified against the Wikipedia race pages
listed in `sources`; this script only fills in each photo's author, licence and
image URL from the Commons API so every credit is exact. Writes
museum/kona_champions.json. Run from the repo root: python3 tools/fetch_kona_champions.py
"""
import json, re, pathlib, time, urllib.error, urllib.parse, urllib.request, html

ROOT = pathlib.Path(__file__).resolve().parents[1]
UA = {'User-Agent': 'canyonmuseum/1.0 (github.com/joaoccaldas/canyonmuseum)'}

def get(url):                                                      # polite: paced, retries on 429
    for attempt in range(6):
        try:
            time.sleep(1.2)
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA)))
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5: raise
            time.sleep(5 * (attempt + 1))

def commons(title, width=1400):
    q = urllib.parse.urlencode({'action': 'query', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size',
                                'iiurlwidth': width, 'format': 'json'})
    d = get('https://commons.wikimedia.org/w/api.php?' + q)
    page = next(iter(d['query']['pages'].values()))
    if 'imageinfo' not in page: raise SystemExit(f'missing on Commons: {title}')
    ii = page['imageinfo'][0]; m = ii['extmetadata']
    text = lambda k: re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', '', m.get(k, {}).get('value', '')))).strip()
    return {'file': title, 'src': ii['thumburl'], 'w': ii['thumbwidth'], 'h': ii['thumbheight'], 'page': ii['descriptionurl'],
            'author': text('Artist') or 'unknown', 'license': text('LicenseShortName'), 'licenseUrl': m.get('LicenseUrl', {}).get('value')}

TITLES = [
  dict(year=2015, athlete='Jan Frodeno', country='GER', time='8:14:40', splits='50:50 · 4:27:27 · 2:52:21',
       bike='Speedmax CF SLX', generation='cfslx-2015', note='His first Kona title, a year after finishing third on debut — the Olympic champion of 2008 became the first man to win both.',
       photo='File:Jan Frodeno 2015 Ironman European Championship Frankfurt.jpeg', photoCaption='Frankfurt, July 2015 — three months before the Kona title',
       source='https://en.wikipedia.org/wiki/2015_Ironman_World_Championship'),
  dict(year=2016, athlete='Jan Frodeno', country='GER', time='8:06:30', splits='48:02 · 4:29:00 · 2:45:34',
       bike='Speedmax CF SLX', generation='cfslx-2015', note='Back-to-back, pulling away from Sebastian Kienle on the run. That July in Roth he had set an iron-distance world best of 7:35:39.',
       photo='File:Jan Frodeno Roth.JPG', photoCaption='Roth, July 2016 — the summer of the 7:35:39 world best',
       source='https://en.wikipedia.org/wiki/2016_Ironman_World_Championship'),
  dict(year=2017, athlete='Patrick Lange', country='GER', time='8:01:40', splits='course record',
       bike='Speedmax CF SLX', generation='cfslx-2015', note="Came from behind on the marathon to break Craig Alexander's 8:03:56 course record.",
       photo='File:2018-07-05 PK Ironman Germany 2018 Patrick Lange – IRONMAN World Champion 2017-4290.jpg', photoCaption='As reigning world champion, Frankfurt 2018',
       source='https://en.wikipedia.org/wiki/Patrick_Lange'),
  dict(year=2018, athlete='Patrick Lange', country='GER', time='7:52:38', splits='first finish under eight hours',
       bike='Speedmax CF SLX', generation='cfslx-2015', note='The first sub-eight-hour Kona in history — and a proposal at the finish line.',
       photo='File:Patrick Lange 2018 Ironman European Championship Frankfurt 2.jpeg', photoCaption='Frankfurt, July 2018',
       source='https://en.wikipedia.org/wiki/2018_Ironman_World_Championship'),
  dict(year=2019, athlete='Jan Frodeno', country='GER', time='7:51:13', splits='course record by 1:26',
       bike='Speedmax CF SLX Disc', generation='cfr-2019', note='A third title on the new disc-brake Speedmax, breaking the course record by a minute and 26 seconds.',
       photo='File:Jan Frodeno 2019 Ironman European Championship Frankfurt.jpeg', photoCaption='Frankfurt, June 2019',
       source='https://en.wikipedia.org/wiki/2019_Ironman_World_Championship'),
  dict(year=2024, athlete='Patrick Lange', country='GER', time='7:35:53', splits='course record · 2:37:34 run',
       bike='Speedmax CFR', generation='cfr-2019', note='A third world title, six years after the second, with the fastest Kona ever run.',
       photo='File:Iron man start Kailua Bay Kona Big island Hawaii (46226568032).jpg', photoCaption='Kailua Bay, the swim start — no openly licensed race photo of 2024 exists',
       source='https://en.wikipedia.org/wiki/Patrick_Lange'),
]
MACHINES = [
  dict(generation='cfslx-2015', name='Speedmax CF SLX · 2015–2019', text='The rim-brake Speedmax that carried four Kona titles: integrated hydration, a hidden front brake and the Trident tube profiles.',
       photo='File:CANYON-speedmax-cf-slx-9-ltd c1329.jpg'),
  dict(generation='cfr-2019', name='Speedmax CFR Disc · 2019–2025', text='The disc-brake generation, raced to course records by Frodeno in 2019 and Lange in 2024.',
       photo='File:Speedmax-cfr-blue-2020.jpg'),
]
SCENERY = ['File:Iron man Kona Hawaii bike course Big island Hawaii (32405173528).jpg', 'File:Kona Iron man Hawaii bike course Big island Hawaii (32405178858).jpg']

# resolve the truncated press-conference title by search
def resolve(title):
    if 'PK Ironman Germany 2018' not in title: return title
    q = urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': 'PK Ironman Germany 2018 Patrick Lange World Champion', 'srnamespace': 6, 'format': 'json'})
    hits = get('https://commons.wikimedia.org/w/api.php?' + q)['query']['search']
    return hits[0]['title']

out = {'schema_version': 1, 'note': 'Canyon Speedmax Kona titles. Anne Haug (2019, Cervélo P5) and Faris Al-Sultan (2005, Cannondale) won on other brands and are excluded.',
       'titles': [], 'machines': [], 'scenery': []}
for t in TITLES: out['titles'].append({**t, 'photo': commons(resolve(t['photo']))})
for m in MACHINES: out['machines'].append({**m, 'photo': commons(m['photo'])})
out['scenery'] = [commons(s, 2000) for s in SCENERY]
(ROOT / 'museum/kona_champions.json').write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n')
for t in out['titles']: print(t['year'], t['athlete'], '·', t['photo']['file'][5:60], '·', t['photo']['license'], '·', t['photo']['author'][:40])
for m in out['machines']: print(m['name'], '·', m['photo']['license'], '·', m['photo']['author'][:40])
