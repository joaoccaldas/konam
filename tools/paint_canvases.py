#!/usr/bin/env python3
"""
tools/paint_canvases.py — turn openly licensed photographs into oil-painting canvases
for the Kona Pier ("Kona by year") gallery.

For every source photo it bakes two small files, once, at build time (nothing is filtered
on the phone):
  <id>.jpg    the painting: Kuwahara-filtered colour (flat paint patches with crisp edges),
              a warm Kona grade, and brush streaks that follow the picture's own contours
  <id>_n.jpg  a tangent-space normal map of the same brush streaks (impasto), so the
              museum's lights rake across real relief as the visitor walks past

The streaks come from a line-integral convolution of noise along the image's structure
tensor, so strokes wrap around a shoulder or follow a top tube instead of lying in one
direction. The originals stay credited: museum/kona_years.json keeps each file's author,
licence and Commons page, and the wall label marks the canvas as a painted derivative.

  python3 tools/paint_canvases.py [museum/history.json] [ids…]   (repo root; needs Pillow + numpy)
"""
import json
import zlib
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/kona-years/src'
OUT = ROOT / 'assets/kona-years'
LONG = 1024                                   # long edge of the painting
NLONG = 512                                   # long edge of the normal map


def box(a, r):
    """Mean over a (2r+1)^2 window via an integral image (edges clamped)."""
    p = np.pad(a, ((r + 1, r), (r + 1, r)) + ((0, 0),) * (a.ndim - 2), mode='edge')
    c = p.cumsum(0).cumsum(1)
    k = 2 * r + 1
    s = c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    return s / (k * k)


def kuwahara(img, r):
    """Classic four-quadrant Kuwahara: each pixel takes the mean of its calmest quadrant."""
    lum = img @ np.array([.299, .587, .114])
    h, w = lum.shape
    m = box(img, r // 2)                      # quadrant means are box means offset by r/2
    v = box(lum ** 2, r // 2) - box(lum, r // 2) ** 2
    o = r // 2 + (r % 2)
    best_v = np.full((h, w), np.inf)
    out = np.zeros_like(img)
    for dy in (-o, o):
        for dx in (-o, o):
            vv = np.roll(v, (dy, dx), (0, 1))
            mm = np.roll(m, (dy, dx), (0, 1))
            take = vv < best_v
            best_v = np.where(take, vv, best_v)
            out[take] = mm[take]
    return out


def gblur(a, sigma):
    """Gaussian-ish blur: three box passes (float arrays, any shape HxW[xC])."""
    r = max(1, int(round(sigma * .9)))
    for _ in range(3): a = box(a, r)
    return a


def fresize(a, size):
    """Resize a float HxW array to (w, h) with bilinear sampling."""
    w, h = size
    ys = np.linspace(0, a.shape[0] - 1, h); xs = np.linspace(0, a.shape[1] - 1, w)
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    y1 = np.minimum(y0 + 1, a.shape[0] - 1); x1 = np.minimum(x0 + 1, a.shape[1] - 1)
    fy = (ys - y0)[:, None]; fx = (xs - x0)[None, :]
    top = a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx
    bot = a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx
    return top * (1 - fy) + bot * fy


def structure_dirs(lum, sigma=4):
    gx = np.zeros_like(lum); gy = np.zeros_like(lum)
    gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]
    gy[1:-1] = lum[2:] - lum[:-2]
    exx, eyy, exy = gblur(gx * gx, sigma), gblur(gy * gy, sigma), gblur(gx * gy, sigma)
    ang = .5 * np.arctan2(2 * exy, exx - eyy)  # dominant gradient direction
    return -np.sin(ang), np.cos(ang)           # strokes run along the edge, not across it


def lic(noise, tx, ty, steps=11):
    h, w = noise.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    acc = noise.copy(); n = 1.0
    for sgn in (1, -1):
        px, py = xx.copy(), yy.copy()
        for i in range(steps):
            ix = np.clip(px.astype(int), 0, w - 1); iy = np.clip(py.astype(int), 0, h - 1)
            px += sgn * tx[iy, ix]; py += sgn * ty[iy, ix]
            ix = np.clip(px.astype(int), 0, w - 1); iy = np.clip(py.astype(int), 0, h - 1)
            wgt = 1 - i / steps
            acc += noise[iy, ix] * wgt; n += wgt
    return acc / n


def paint(src, dst_id, crop=None, grade=1.0):
    im = Image.open(src).convert('RGB')
    if crop: im = im.crop(tuple(int(c * s) for c, s in zip(crop, (im.width, im.height, im.width, im.height))))
    s = LONG / max(im.size)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255
    # two passes: broad patches, then finer ones on top, the way a painter blocks in and refines
    p = kuwahara(a, 6)
    p = np.clip(.6 * kuwahara(p, 3) + .4 * p, 0, 1)
    lum = p @ np.array([.299, .587, .114])
    tx, ty = structure_dirs(lum)
    rng = np.random.default_rng(zlib.crc32(dst_id.encode()))
    h, w = lum.shape
    nz = rng.random((h // 2 + 1, w // 2 + 1)).astype(np.float32)          # stroke width ~2 px at 1024
    nz = fresize(nz, (w, h)).astype(np.float32)
    streak = lic(nz, tx, ty)
    streak = (streak - streak.mean()) / (streak.std() + 1e-6)
    # colour: warm Kona grade, gentle saturation lift, strokes modulate value a little
    g = p ** (1 / 1.04)
    mean = g.mean(2, keepdims=True)
    g = mean + (g - mean) * (1.18 * grade)
    g = g * np.array([1.035, 1.0, .955]) + np.array([.012, .006, 0])
    g = g * (1 + .045 * streak[..., None])
    g = np.clip(g, 0, 1)
    # canvas weave where paint is thin (light areas)
    weave = (np.sin(np.arange(w) * 2.1)[None, :] * np.sin(np.arange(h) * 2.1)[:, None]) * .012
    g = np.clip(g + weave[..., None] * (lum[..., None] > .75), 0, 1)
    Image.fromarray((g * 255 + .5).astype(np.uint8)).save(OUT / f'{dst_id}.jpg', quality=84, optimize=True, progressive=True)
    # relief: streaks plus paint thickness (darker, busier passages carry more paint)
    edge = np.abs(lum - gblur(lum, 3))
    height = streak * .6 + edge * 14 + (1 - lum) * .5
    hs = NLONG / max(w, h)
    hh = fresize(gblur(height, 1), (round(w * hs), round(h * hs)))
    dx = np.zeros_like(hh); dy = np.zeros_like(hh)
    dx[:, 1:-1] = hh[:, 2:] - hh[:, :-2]; dy[1:-1] = hh[2:] - hh[:-2]
    k = .55
    n = np.stack([-dx * k, dy * k, np.ones_like(hh)], -1)                  # +Y up in texture space
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    Image.fromarray(((n * .5 + .5) * 255 + .5).astype(np.uint8)).save(OUT / f'{dst_id}_n.jpg', quality=88, optimize=True)
    return {'w': int(w), 'h': int(h)}


def main():
    global SRC, OUT
    args = sys.argv[1:]
    data_file = ROOT / 'museum/kona_years.json'
    if args and args[0].endswith('.json'):                      # another collection, e.g. museum/history.json
        data_file = ROOT / args.pop(0)
    data = json.loads(data_file.read_text())
    OUT = ROOT / data.get('dir', 'assets/kona-years'); SRC = OUT / 'src'
    jobs = {}
    for c in data['canvases']:
        jobs[c['id']] = c
    only = set(args)
    for cid, c in jobs.items():
        if only and cid not in only: continue
        src = SRC / c['local']
        if not src.exists():
            print('missing source', src); continue
        size = paint(src, cid, c.get('crop'), c.get('grade', 1.0))
        c['aspect'] = round(size['w'] / size['h'], 4)
        print(f"painted {cid:22s} {size['w']}x{size['h']}")
    data_file.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
