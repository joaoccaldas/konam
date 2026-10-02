#!/usr/bin/env python3
"""Calibrate one side-on manufacturer photo from its own tyres and published geometry.

Usage: calibrate_photo.py <manifest.json>

Reads the manifest's `pipeline.calibration_input` block (photo path, tyre spec, wheel
search windows) and its spec record (published geometry for every size). Writes
`<pipeline.data_dir>/calibration.json` and an overlay PNG next to it.

What is fitted, not assumed:
  * each tyre's outer circle (least squares on the outer dark boundary), plus an
    ellipse aspect check that flags non-orthogonal photos;
  * scale (mm/px) from the known tyre outer diameter;
  * the photographed frame size, by comparing the axle-to-axle distance with every
    size's published wheelbase (the residual is recorded, no size is assumed);
  * the BB predicted from published chainstay + BB drop, compared with the crank
    spindle found in the photo (chainring circle centre).
Nothing here reads another bike's pixels or thresholds.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, optimize

ROOT = Path(__file__).resolve().parents[2]


def plain(o):
    if isinstance(o, dict):
        return {k: plain(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [plain(v) for v in o]
    if isinstance(o, np.generic):
        return o.item()
    return o


def fit_circle(pts):
    x, y = pts[:, 0], pts[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones_like(x)]
    b = x * x + y * y
    (cx, cy, c), *_ = np.linalg.lstsq(A, b, rcond=None)
    r = math.sqrt(c + cx * cx + cy * cy)
    return cx, cy, r


def refine_circle(pts, cx, cy, r):
    def res(p):
        return np.hypot(pts[:, 0] - p[0], pts[:, 1] - p[1]) - p[2]
    s = optimize.least_squares(res, [cx, cy, r], loss='soft_l1', f_scale=1.0)
    rr = res(s.x)
    return (*s.x, float(np.sqrt(np.mean(rr ** 2))))


def fit_ellipse_axes(pts, cx, cy):
    """Axis-aligned ellipse through outer boundary points; returns (a, b) semi-axes."""
    dx, dy = pts[:, 0] - cx, pts[:, 1] - cy
    A = np.c_[dx * dx, dy * dy]
    (p, q), *_ = np.linalg.lstsq(A, np.ones_like(dx), rcond=None)
    return 1 / math.sqrt(p), 1 / math.sqrt(q)


def outer_boundary(dark, win, guess_c, guess_r, exclude):
    # angles: image coordinates (y down), 0 deg = +x, 90 deg = down
    """Farthest dark pixel along rays from a guessed centre, within a radial band."""
    x0, y0, x1, y1 = win
    pts = []
    for ang in np.linspace(0, 2 * math.pi, 720, endpoint=False):
        if exclude and any(a0 <= math.degrees(ang) % 360 < a1 for a0, a1 in exclude):
            continue
        c, s = math.cos(ang), math.sin(ang)
        best = None
        for rr in np.arange(guess_r * 0.80, guess_r * 1.12, 0.5):
            px, py = guess_c[0] + c * rr, guess_c[1] + s * rr
            ix, iy = int(round(px)), int(round(py))
            if not (x0 <= ix < x1 and y0 <= iy < y1) or iy >= dark.shape[0] or ix >= dark.shape[1] or ix < 0 or iy < 0:
                continue
            if dark[iy, ix]:
                best = (px, py)
        if best is not None:
            pts.append(best)
    return np.array(pts)


def fit_wheel(dark, win, exclude, clipped=None):
    x0, y0, x1, y1 = win
    sub = dark[y0:y1, x0:x1]
    ys, xs = np.nonzero(sub)
    gr = (ys.max() - ys.min()) / 2           # vertical extent is never occluded by the frame
    gy = (ys.min() + ys.max()) / 2 + y0
    gx = (xs.min() + xs.max()) / 2 + x0
    if clipped == 'right':
        gx = xs.min() + x0 + gr
    elif clipped == 'left':
        gx = xs.max() + x0 - gr
    c = (gx, gy)
    r = gr
    for _ in range(4):
        pts = outer_boundary(dark, win, c, r, exclude)
        cx, cy, r = fit_circle(pts)
        c = (cx, cy)
    n_all = len(pts)
    for _ in range(4):  # trimmed refit: tubes/cables crossing the tyre band are outliers
        cx, cy, r, rms = refine_circle(pts, cx, cy, r)
        d = np.abs(np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - r)
        pts = pts[d < 3.0]
    cx, cy, r, rms = refine_circle(pts, cx, cy, r)
    a, b = fit_ellipse_axes(pts, cx, cy)
    return dict(cx=cx, cy=cy, r=r, rms_px=rms, n_inliers=len(pts), n_rays=n_all,
                inlier_fraction=len(pts) / n_all, ellipse_a=a, ellipse_b=b, aspect=b / a), pts


def chainring_centre(img, bb_guess, r_guess, search):
    """Circle fit to bright (polished) chainring outer edge around a guessed BB."""
    g = np.asarray(img.convert('L'), float)
    grad = np.hypot(ndimage.sobel(g, 0), ndimage.sobel(g, 1))
    pts = []
    for ang in np.linspace(0, 2 * math.pi, 360, endpoint=False):
        c, s = math.cos(ang), math.sin(ang)
        best, bv = None, 0
        for rr in np.arange(r_guess * .85, r_guess * 1.15, .5):
            x, y = bb_guess[0] + c * rr, bb_guess[1] + s * rr
            ix, iy = int(round(x)), int(round(y))
            if 0 <= iy < g.shape[0] and 0 <= ix < g.shape[1] and grad[iy, ix] > bv:
                bv, best = grad[iy, ix], (x, y)
        if best and bv > 40:
            pts.append(best)
    pts = np.array(pts)
    if len(pts) < 40:
        return None
    cx, cy, r = fit_circle(pts)
    # iterative trimmed fit: chainring is occluded by crank arm / chain
    for _ in range(3):
        d = np.abs(np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - r)
        keep = d < max(2.0, np.percentile(d, 70))
        cx, cy, r = fit_circle(pts[keep])
    return dict(cx=cx, cy=cy, r=r, n=int(keep.sum()))


def main():
    man_path = ROOT / sys.argv[1]
    man = json.loads(man_path.read_text())
    pipe = man['pipeline']
    ci = pipe['calibration_input']
    spec = json.loads((ROOT / man['source_geometry']).read_text())
    src = Image.open(ROOT / ci['photo']).convert('RGBA')
    bgw = Image.new('RGBA', src.size, (255, 255, 255, 255))
    bgw.alpha_composite(src)
    img = bgw.convert('RGB')   # transparent studio PNGs are composited on white
    arr = np.asarray(img, float)
    lum = arr.mean(2)
    dark = lum < ci.get('tyre_dark_threshold', 70)
    rear, rpts = fit_wheel(dark, ci['rear_window'], ci.get('rear_exclude_deg'), ci.get('rear_clipped'))
    front, fpts = fit_wheel(dark, ci['front_window'], ci.get('front_exclude_deg'), ci.get('front_clipped'))

    tyre_od = ci['tyre_outer_diameter_mm']
    r_px = (rear['r'] + front['r']) / 2
    mm_per_px = tyre_od / (2 * r_px)
    axle_px = math.hypot(front['cx'] - rear['cx'], front['cy'] - rear['cy'])
    wb_mm = axle_px * mm_per_px
    tilt_deg = math.degrees(math.atan2(rear['cy'] - front['cy'], front['cx'] - rear['cx']))

    geo = spec['geometry']
    sizes = geo['sizes']
    wheel_by = spec.get('wheel_by_size') or {s: geo.get('wheel', ci['wheel']) for s in sizes}
    wheel_ok = [i for i, s in enumerate(sizes) if wheel_by[s] == ci['wheel']]
    cands = sorted(((abs(geo['wheelbase'][i] - wb_mm) / geo['wheelbase'][i], sizes[i]) for i in wheel_ok))
    best_rel, best_size = cands[0]
    si = sizes.index(best_size)

    # BB from published chainstay + BB drop (axle radius from tyre OD)
    R = tyre_od / 2
    drop = geo['bb_drop'][si] if 'bb_drop' in geo else R - geo['bb_height'][si]
    cs = geo['chainstay'][si]
    bb_dx = math.sqrt(cs * cs - drop * drop)
    ux = np.array([front['cx'] - rear['cx'], front['cy'] - rear['cy']]) / axle_px   # along axle line (px)
    uz = np.array([ux[1], -ux[0]])                                                   # up in image (px)
    bb_pred = np.array([rear['cx'], rear['cy']]) + (ux * bb_dx + uz * (-drop)) / mm_per_px
    ring = chainring_centre(img, bb_pred, ci['big_ring_outer_mm'] / 2 / mm_per_px, None)
    bb_res = None
    if ring:
        bb_res = dict(dx_px=ring['cx'] - bb_pred[0], dy_px=ring['cy'] - bb_pred[1])
        bb_res['dist_px'] = math.hypot(bb_res['dx_px'], bb_res['dy_px'])
        bb_res['dist_mm'] = bb_res['dist_px'] * mm_per_px

    # Hand-marked chainring bolt centres (recorded in the manifest) give the spindle and an
    # independent scale check: the bolt circle diameter is a published component dimension.
    spindle = None
    if ci.get('chainring_bolts_px'):
        bp = np.array(ci['chainring_bolts_px'], float)
        sx, sy, sr = fit_circle(bp)
        rr = np.hypot(bp[:, 0] - sx, bp[:, 1] - sy) - sr
        bcd_mm = 2 * sr * mm_per_px
        rear_c = np.array([rear['cx'], rear['cy']])
        v = np.array([sx, sy]) - rear_c
        cs_photo = float(np.hypot(*v)) * mm_per_px
        drop_photo = float(-(v @ uz)) * mm_per_px
        spindle = {'centre_px': [sx, sy], 'bolt_circle_px': 2 * sr, 'bolt_fit_rms_px': float(np.sqrt(np.mean(rr ** 2))),
                   'bolt_circle_mm_at_scale': bcd_mm, 'published_bcd_mm': ci['chainring_bcd_mm'],
                   'bcd_relative_residual': bcd_mm / ci['chainring_bcd_mm'] - 1,
                   'residual_vs_predicted_px': [sx - bb_pred[0], sy - bb_pred[1]],
                   'residual_vs_predicted_mm': float(np.hypot(sx - bb_pred[0], sy - bb_pred[1])) * mm_per_px,
                   'photo_chainstay_mm': cs_photo, 'photo_bb_drop_mm': drop_photo,
                   'photo_bb_height_mm': tyre_od / 2 - drop_photo,
                   'basis': ci.get('chainring_bolts_basis', '')}
        if ci.get('pedal_eye_px'):
            pe = np.array(ci['pedal_eye_px'], float)
            spindle['crank_length_mm_at_scale'] = float(np.hypot(*(pe - [sx, sy]))) * mm_per_px

    out = {
        'photo': ci['photo'], 'image_size_px': list(img.size),
        'tyre_outer_diameter_mm': tyre_od, 'tyre_basis': ci['tyre_basis'],
        'rear_tyre_fit': rear, 'front_tyre_fit': front,
        'mm_per_px': mm_per_px,
        'axle_distance_px': axle_px, 'axle_line_tilt_deg': tilt_deg,
        'wheelbase_from_photo_mm': wb_mm,
        'size_match': {'size': best_size, 'published_wheelbase_mm': geo['wheelbase'][si],
                       'relative_residual': best_rel, 'within_1pct': bool(best_rel < 0.01),
                       'all_candidates': [{'size': s, 'relative_residual': r} for r, s in cands]},
        'bb_prediction': {'chainstay_mm': cs, 'bb_drop_mm': drop, 'bb_height_mm': R - drop,
                          'predicted_px': bb_pred.tolist(), 'chainring_edge_fit': ring,
                          'chainring_edge_residual': bb_res, 'spindle_from_bolts': spindle},
        'frame_x_axis_px': ux.tolist(), 'frame_up_axis_px': uz.tolist(),
        'notes': ['Scale depends on the nominal tyre outer diameter; a 2 mm tyre-height error is '
                  '~0.3% of scale.', 'Ellipse aspect near 1.0 indicates an orthogonal side view.'],
    }
    data = ROOT / pipe['data_dir']
    data.mkdir(parents=True, exist_ok=True)
    (data / 'calibration.json').write_text(json.dumps(plain(out), indent=2))

    ov = img.copy()
    d = ImageDraw.Draw(ov)
    for w, pts in ((rear, rpts), (front, fpts)):
        d.ellipse([w['cx'] - w['r'], w['cy'] - w['r'], w['cx'] + w['r'], w['cy'] + w['r']], outline=(255, 0, 0))
        for x, y in pts[::6]:
            d.point((x, y), fill=(0, 255, 0))
        d.line([w['cx'] - 6, w['cy'], w['cx'] + 6, w['cy']], fill=(255, 0, 0))
        d.line([w['cx'], w['cy'] - 6, w['cx'], w['cy'] + 6], fill=(255, 0, 0))
    x, y = bb_pred
    d.ellipse([x - 4, y - 4, x + 4, y + 4], outline=(255, 0, 255))
    if spindle:
        x, y = spindle['centre_px']; r = spindle['bolt_circle_px'] / 2
        d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 140, 0))
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 140, 0))
    if ring and not spindle:
        d.ellipse([ring['cx'] - ring['r'], ring['cy'] - ring['r'], ring['cx'] + ring['r'], ring['cy'] + ring['r']],
                  outline=(0, 128, 255))
        d.ellipse([ring['cx'] - 2, ring['cy'] - 2, ring['cx'] + 2, ring['cy'] + 2], fill=(0, 128, 255))
    ov.save(data / 'calibration_overlay.png')
    print(json.dumps({k: out[k] for k in ('mm_per_px', 'wheelbase_from_photo_mm', 'size_match')}, indent=1))
    print('rear', {k: round(v, 3) for k, v in rear.items()}, '\nfront', {k: round(v, 3) for k, v in front.items()})
    print('edge-fit bb residual', bb_res)
    print('spindle from bolts', json.dumps(plain(spindle), indent=1))


if __name__ == '__main__':
    main()
