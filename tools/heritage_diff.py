#!/usr/bin/env python3
"""Review aid: colour frame-zone disagreements (red = photo only, green = model only).
Usage: heritage_diff.py <profile.json> <checks_dir> <out.png> [x0 y0 x1 y1]"""
import json, sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
ROOT = Path(__file__).resolve().parents[1]
p = json.load(open(sys.argv[1])); ph = p['photo']
a = np.asarray(Image.open(ROOT / ph['path']).convert('RGB')).astype(int)
ref = ndi.binary_closing(np.abs(a - np.array(ph['background'])).max(2) > ph.get('tolerance', 8), iterations=1)
pred = np.asarray(Image.open(Path(sys.argv[2]) / 'silhouette.png').convert('RGBA'))[:, :, 3] > 128
img = Image.new('L', ref.shape[::-1], 0); d = ImageDraw.Draw(img)
for n, st in p['traced'].items():
    if p['model']['members'][n].get('part', 'frame') not in ('frame', 'fork'):
        continue
    for q in st:
        r = (q['depth_px'] or 10) / 2 + 6; d.ellipse([q['px'][0] - r, q['px'][1] - r, q['px'][0] + r, q['px'][1] + r], fill=1)
z = np.asarray(img).astype(bool)
o = (a * .35).astype(np.uint8)
o[z & ref & ~pred] = (255, 40, 40); o[z & pred & ~ref] = (40, 255, 80); o[z & pred & ref] = (90, 90, 90)
box = tuple(map(int, sys.argv[4:8])) if len(sys.argv) > 7 else (140, 140, 600, 420)
Image.fromarray(o).crop(box).resize(((box[2] - box[0]) * 3, (box[3] - box[1]) * 3), Image.NEAREST).save(sys.argv[3])
