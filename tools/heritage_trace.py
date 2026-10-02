#!/usr/bin/env python3
"""Snap hand-placed tube guides to the reference photo.

Usage: heritage_trace.py <profile.json> [overlay.png]

For every member in profile['members'] the guide polyline (photo px) is resampled.
At each station the tracer scans perpendicular to the guide in the chosen mask,
keeps the run that contains (or is nearest to) the guide, and records the two
edges. Centres and side-view depths are then median-smoothed. Guides are human
input; edges are measured from pixels. Members with "measure": false keep the
guide and the stated depth_mm (used where parts overlap, e.g. a fork crown).
Writes profile['traced'] and optionally an overlay for visual review.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]


def despeckle(mask, ph):
    """Drop isolated foreground specks (JPEG ringing on a flat backdrop) below ph['despeckle_px']."""
    n_px = ph.get('despeckle_px', 0)
    if not n_px:
        return mask
    lab, n = ndi.label(mask)
    sizes = np.bincount(lab.ravel())
    keep = sizes >= n_px; keep[0] = False
    return keep[lab]


def masks(ph):
    a = np.asarray(Image.open(ROOT / ph['path']).convert('RGB')).astype(int)
    fg = np.abs(a - np.array(ph['background'])).max(2) > ph.get('tolerance', 8)
    fg = despeckle(fg, ph)
    lum = a.mean(2)
    sat = a.max(2) - a.min(2)
    bright = (lum > ph.get('paint_min_lum', 150)) & (sat < 60)
    # Close small decal gaps only. Never fill holes: a frame's main triangle is itself a hole.
    bright = ndi.binary_closing(bright, iterations=2)
    return {'fg': ndi.binary_closing(fg, iterations=1), 'bright': bright, 'rgb': a}


def resample(poly, step):
    P = np.array(poly, float)
    seg = np.hypot(*np.diff(P, axis=0).T)
    L = np.r_[0, np.cumsum(seg)]
    n = max(2, int(L[-1] / step) + 1)
    s = np.linspace(0, L[-1], n)
    x = np.interp(s, L, P[:, 0]); y = np.interp(s, L, P[:, 1])
    pts = np.c_[x, y]
    tan = np.gradient(pts, axis=0)
    tan /= np.linalg.norm(tan, axis=1)[:, None]
    return pts, tan


def scan(mask, p, nrm, half):
    H, W = mask.shape
    ts = np.arange(-half, half + .01, .25)
    xs = p[0] + nrm[0] * ts; ys = p[1] + nrm[1] * ts
    ok = (xs >= 0) & (xs < W - 1) & (ys >= 0) & (ys < H - 1)
    v = np.zeros(len(ts), bool)
    v[ok] = mask[np.round(ys[ok]).astype(int), np.round(xs[ok]).astype(int)]
    lab, n = ndi.label(v)
    if not n:
        return None
    c = len(ts) // 2
    if lab[c]:
        k = lab[c]
    else:
        idx = np.nonzero(v)[0]
        k = lab[idx[np.argmin(np.abs(idx - c))]]
    idx = np.nonzero(lab == k)[0]
    return ts[idx[0]], ts[idx[-1]]


def trace(member, M):
    pts, tan = resample(member['guide'], member.get('step', 3))
    nrm = np.c_[-tan[:, 1], tan[:, 0]]
    if member.get('measure', True) is False:
        return [{'px': [round(float(x), 2), round(float(y), 2)], 'depth_px': None} for x, y in pts]
    mask = M[member.get('mask', 'fg')]
    half = member.get('max_depth_px', 30) / 2 + 4
    lo, hi = [], []
    for p, n in zip(pts, nrm):
        r = scan(mask, p, n, half)
        lo.append(r[0] if r else np.nan); hi.append(r[1] if r else np.nan)
    lo, hi = np.array(lo), np.array(hi)
    # Samples are pixel centres: the run's outer pixels each extend half a pixel further.
    lo, hi = lo - .5, hi + .5
    depth = hi - lo
    cap = member.get('max_depth_px', 30)
    bad = np.isnan(depth) | (depth > cap) | (depth < member.get('min_depth_px', 2))
    off = (lo + hi) / 2
    idx = np.arange(len(off))
    if bad.all():
        raise SystemExit('No usable edges for ' + member['name'])
    off = np.interp(idx, idx[~bad], off[~bad]); depth = np.interp(idx, idx[~bad], depth[~bad])
    k = member.get('smooth', 7)
    off = ndi.median_filter(off, k, mode='nearest'); depth = ndi.median_filter(depth, k, mode='nearest')
    ctr = pts + nrm * off[:, None]
    out = []
    for c, d, b in zip(ctr, depth, bad):
        out.append({'px': [round(float(c[0]), 2), round(float(c[1]), 2)], 'depth_px': round(float(d), 2), 'interpolated': bool(b)})
    return out


def main(path, overlay=None):
    p = json.loads(Path(path).read_text())
    M = masks(p['photo'])
    p['traced'] = {m['name']: trace(m, M) for m in p['members']}
    Path(path).write_text(json.dumps(p, indent=1, ensure_ascii=False))
    for m in p['members']:
        st = p['traced'][m['name']]
        d = [s['depth_px'] for s in st if s['depth_px'] is not None]
        interp = sum(s.get('interpolated', False) for s in st)
        print(f"{m['name']:14s} stations {len(st):3d}  depth px median {np.median(d) if d else 0:6.2f}  interpolated {interp}")
    if overlay:
        im = Image.fromarray(M['rgb'].astype(np.uint8)).convert('RGB')
        k = 3
        im = im.resize((im.width * k, im.height * k), Image.LANCZOS)
        dr = ImageDraw.Draw(im)
        for m in p['members']:
            st = p['traced'][m['name']]
            pts = [(s['px'][0] * k, s['px'][1] * k) for s in st]
            dr.line(pts, fill=(0, 255, 120), width=2)
            if st[0]['depth_px']:
                for a, b in zip(st, st[1:]):
                    t = np.subtract(b['px'], a['px']); t = t / (np.linalg.norm(t) or 1); n = np.array([-t[1], t[0]])
                    for s in (a,):
                        h = s['depth_px'] / 2
                        for sg in (-1, 1):
                            q = np.array(s['px']) + sg * h * n
                            dr.point((q[0] * k, q[1] * k), fill=(255, 40, 200))
            dr.text(pts[0], m['name'], fill=(255, 255, 0))
        im.save(overlay)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
