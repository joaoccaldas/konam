#!/usr/bin/env python3
"""Elevation-only terrain for the Norseman training room's two windows.

Adapted from bellagio/tools/build_geo_world.py (the St. George terrain viewer), minus the satellite imagery: the room
shades terrain in code, so no photograph of any place is shipped. Output per site, into assets/rooms/norseman-training/:
  <id>.bin   little-endian uint16 heights in decimetres above sea level, row-major, north row first, grid x grid
  <id>.json  bbox, grid, metres per cell, min/max, attribution
Downloaded tiles are cached in --cache (default: a temp dir) and never committed.

usage: python3 -I tools/build_norseman_terrain.py [--cache DIR]
"""
import argparse, io, json, math, struct, tempfile, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/rooms/norseman-training'
UA = {'User-Agent': 'konam-norseman-terrain/1.0'}
ATTRIBUTION = 'Elevation: Terrain Tiles (Mapzen/Tilezen, AWS Open Data). Norway terrain data © Kartverket, CC BY 4.0.'
SITES = [
    # The swim end of the course: the head of the Hardangerfjord at Eidfjord, where the swim lands.
    {'id': 'eidfjord', 'label': 'Eidfjord, head of the Hardangerfjord', 'bbox': {'west': 6.78, 'east': 7.22, 'south': 60.33, 'north': 60.53}, 'anchor': {'lat': 60.4665, 'lon': 7.0712}},
    # The finish: Gaustatoppen and the valley below it.
    {'id': 'gaustatoppen', 'label': 'Gaustatoppen', 'bbox': {'west': 8.43, 'east': 8.87, 'south': 59.75, 'north': 59.96}, 'anchor': {'lat': 59.8539, 'lon': 8.6489}},
]
ZOOM, GRID = 13, 385

def lon2x(lon, z): return (lon + 180.0) / 360.0 * 2 ** z
def lat2y(lat, z): return (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2 ** z

def tile(cache, z, x, y):
    p = cache / f'{z}-{x}-{y}.png'
    if not p.exists():
        req = urllib.request.Request(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png', headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r: p.write_bytes(r.read())
    return Image.open(io.BytesIO(p.read_bytes())).convert('RGB')

def build(site, cache):
    b, z = site['bbox'], ZOOM
    x0, x1 = math.floor(lon2x(b['west'], z)), math.floor(lon2x(b['east'], z))
    y0, y1 = math.floor(lat2y(b['north'], z)), math.floor(lat2y(b['south'], z))
    tiles = {(tx, ty): tile(cache, z, tx, ty) for ty in range(y0, y1 + 1) for tx in range(x0, x1 + 1)}
    def elev(lat, lon):                                      # bilinear in tile pixel space
        xf, yf = lon2x(lon, z) * 256, lat2y(lat, z) * 256
        def px(ix, iy):
            tx, ty = min(x1, max(x0, ix // 256)), min(y1, max(y0, iy // 256))
            r, g, bl = tiles[(tx, ty)].getpixel((min(255, max(0, ix - tx * 256)), min(255, max(0, iy - ty * 256))))
            return r * 256.0 + g + bl / 256.0 - 32768.0
        ix, iy = math.floor(xf), math.floor(yf); fx, fy = xf - ix, yf - iy
        return (px(ix, iy) * (1 - fx) + px(ix + 1, iy) * fx) * (1 - fy) + (px(ix, iy + 1) * (1 - fx) + px(ix + 1, iy + 1) * fx) * fy
    hs = []
    for gy in range(GRID):
        lat = b['north'] + (b['south'] - b['north']) * gy / (GRID - 1)
        for gx in range(GRID):
            hs.append(max(0.0, elev(lat, b['west'] + (b['east'] - b['west']) * gx / (GRID - 1))))
    lat_mid = math.radians((b['north'] + b['south']) / 2)
    ew = (b['east'] - b['west']) * 111320 * math.cos(lat_mid); ns = (b['north'] - b['south']) * 110574
    a = site['anchor']; ax = (a['lon'] - b['west']) / (b['east'] - b['west']); ay = (b['north'] - a['lat']) / (b['north'] - b['south'])
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{site['id']}.bin").write_bytes(struct.pack(f'<{len(hs)}H', *[min(65535, round(h * 10)) for h in hs]))
    meta = {'schema': 'konam.norseman-terrain/v1', 'id': site['id'], 'label': site['label'], 'bbox': b, 'zoom': z, 'grid': GRID,
            'width_m': round(ew), 'height_m': round(ns), 'anchor': a, 'anchor_uv': [round(ax, 5), round(ay, 5)],
            'min_m': round(min(hs), 1), 'max_m': round(max(hs), 1), 'encoding': 'uint16 LE decimetres, row-major, north row first',
            'attribution': ATTRIBUTION, 'source': 'https://registry.opendata.aws/terrain-tiles/', 'built_by': 'tools/build_norseman_terrain.py'}
    (OUT / f"{site['id']}.json").write_text(json.dumps(meta, indent=2) + '\n')
    print(site['id'], f"{len(tiles)} tiles", meta['width_m'], 'x', meta['height_m'], 'm', meta['min_m'], '–', meta['max_m'], 'm')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--cache', default=None); args = ap.parse_args()
    cache = Path(args.cache or tempfile.mkdtemp(prefix='norseman-tiles-')); cache.mkdir(parents=True, exist_ok=True)
    for s in SITES: build(s, cache)
