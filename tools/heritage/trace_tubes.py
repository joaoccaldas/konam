#!/usr/bin/env python3
"""Measure side-view tube depths along hand-traced tube axes in one manufacturer photo.

Usage: trace_tubes.py <manifest.json>

The adapter trace file (`pipeline.trace`) lists, per tube, its photo axis end points (px) and
the stations to measure. For each station the tracer walks inward from outside the tube along
the normal, on both sides, until it leaves the studio background. Depth = distance between the
two first non-background pixels. Results (px and mm at the calibrated scale) and an overlay are
written to the bike's data_dir. Stations where either side runs into another part (the walk
starts inside a non-background pixel) are marked `occluded` and are not used.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def main():
    man = json.loads((ROOT / sys.argv[1]).read_text())
    pipe = man['pipeline']
    tr = json.loads((ROOT / pipe['trace']).read_text())
    cal = json.loads((ROOT / pipe['data_dir'] / 'calibration.json').read_text())
    s = cal['mm_per_px']
    img = Image.open(ROOT / pipe['reference']).convert('RGB')
    a = np.asarray(img, float)
    bg_min = tr.get('background_min', 236)
    bg_spread = tr.get('background_spread', 14)
    bg = (a.min(2) >= bg_min) & (a.max(2) - a.min(2) <= bg_spread)
    H, W = bg.shape

    # Optional paint masks: a tube in front of the tyre/chain is traced against its own paint colour.
    R_, G_, B_ = a[..., 0], a[..., 1], a[..., 2]
    masks = {'background': bg,
             'blue': ~((B_ > R_ + 40) & (B_ > G_ + 15)),        # "not blue paint" counts as outside
             }

    def is_bg(x, y, m=bg):
        ix, iy = int(round(x)), int(round(y))
        return 0 <= ix < W and 0 <= iy < H and m[iy, ix]

    out = {'photo': pipe['reference'], 'mm_per_px': s, 'background_rule': f'min(RGB)>={bg_min} and spread<={bg_spread}',
           'tubes': {}}
    ov = img.copy()
    d = ImageDraw.Draw(ov)
    for name, t in tr['tubes'].items():
        p0, p1 = np.array(t['p0'], float), np.array(t['p1'], float)
        L = np.linalg.norm(p1 - p0)
        u = (p1 - p0) / L
        n = np.array([-u[1], u[0]])
        reach = t.get('max_half_px', 40)
        mk = masks[t.get('mask', 'background')]
        rows = []
        for f in t['stations']:
            c = p0 + u * L * f
            edges = []
            for sgn in (1, -1):
                start = c + sgn * n * reach
                if not is_bg(*start, m=mk):
                    edges.append(None)
                    continue
                e = None
                for k in np.arange(reach, -reach, -0.25):
                    q = c + sgn * n * k
                    if not is_bg(*q, m=mk):
                        e = q
                        break
                edges.append(e)
            ok = all(e is not None for e in edges)
            row = {'t': f, 'centre_px': c.tolist(), 'occluded': not ok}
            if ok:
                dpx = float(np.linalg.norm(edges[0] - edges[1]))
                mid = (edges[0] + edges[1]) / 2
                row.update(depth_px=dpx, depth_mm=dpx * s, offset_px=float((mid - c) @ n),
                           edges_px=[edges[0].tolist(), edges[1].tolist()])
                d.line([tuple(edges[0]), tuple(edges[1])], fill=(255, 0, 0))
            rows.append(row)
        d.line([tuple(p0), tuple(p1)], fill=(0, 200, 0))
        out['tubes'][name] = {'p0': t['p0'], 'p1': t['p1'], 'length_px': L, 'mask': t.get('mask', 'background'), 'stations': rows}
    data = ROOT / pipe['data_dir']
    (data / 'tube-trace.json').write_text(json.dumps(out, indent=2))
    ov.save(data / 'tube-trace-overlay.png')
    for name, t in out['tubes'].items():
        print(name, [(r['t'], round(r['depth_mm'], 1) if not r['occluded'] else 'occ') for r in t['stations']])


if __name__ == '__main__':
    main()
