#!/usr/bin/env python3
"""Photo calibration for heritage exhibits: tyre circle fits -> axle pixels and mm/px.

Usage: heritage_calibrate.py <profile.json>
The profile supplies the photo, its flat background colour and rough hub guesses.
Writes profile['calibration'] back with fitted centres, radii, residuals and scale.
Deterministic; no network. The tyre outer diameter comes from the profile's
published tyre size, so the scale is independent of the frame geometry it later checks.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]


def foreground(photo, bg, tol):
    a = np.asarray(Image.open(photo).convert('RGB')).astype(int)
    return np.abs(a - np.array(bg)).max(2) > tol


def despeckle(mask, ph):
    """Drop isolated foreground specks (JPEG ringing on a flat backdrop) below ph['despeckle_px']."""
    n_px = ph.get('despeckle_px', 0)
    if not n_px:
        return mask
    lab, n = ndi.label(mask)
    sizes = np.bincount(lab.ravel())
    keep = sizes >= n_px; keep[0] = False
    return keep[lab]


def fit_circle(pts):
    x, y = pts[:, 0], pts[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones(len(x))]
    c = np.linalg.lstsq(A, x * x + y * y, rcond=None)[0]
    r = math.sqrt(c[2] + c[0] ** 2 + c[1] ** 2)
    return np.array([c[0], c[1]]), r


def ransac(pts, tol=1.2, iters=4000, seed=7):
    rng = np.random.default_rng(seed)
    best = None
    for _ in range(iters):
        s = pts[rng.choice(len(pts), 3, replace=False)]
        try:
            c, r = fit_circle(s)
        except Exception:
            continue
        d = np.abs(np.hypot(*(pts - c).T) - r)
        keep = d < tol
        if best is None or keep.sum() > best.sum():
            best = keep
    c, r = fit_circle(pts[best])
    res = np.abs(np.hypot(*(pts[best] - c).T) - r)
    return c, r, best, float(np.sqrt((res ** 2).mean()))


def outer_edge(mask, centre, r_guess, arcs):
    """Farthest foreground pixel along rays, restricted to unoccluded arcs (degrees, image y down)."""
    H, W = mask.shape
    pts = []
    for a0, a1 in arcs:
        for deg in np.arange(a0, a1, .5):
            t = math.radians(deg)
            last = None
            for r in np.arange(.8 * r_guess, 1.12 * r_guess, .5):
                x, y = centre[0] + r * math.cos(t), centre[1] + r * math.sin(t)
                xi, yi = int(round(x)), int(round(y))
                if not (0 <= xi < W and 0 <= yi < H):
                    break
                if mask[yi, xi]:
                    last = (x, y)
            if last:
                pts.append(last)
    return np.array(pts)


def main(profile_path):
    p = json.loads(Path(profile_path).read_text())
    ph = p['photo']
    mask = foreground(ROOT / ph['path'], ph['background'], ph.get('tolerance', 8))
    mask = despeckle(mask, ph)
    ph['size'] = [int(mask.shape[1]), int(mask.shape[0])]
    mask = ndi.binary_closing(mask, iterations=1)
    out = {}
    for which in ('rear', 'front'):
        g = ph['wheel_guess'][which]
        c, r = np.array(g['centre'], float), g['radius']
        for _ in range(3):
            pts = outer_edge(mask, c, r, g['arcs'])
            c, r, keep, rms = ransac(pts)
        out[which] = {'centre': [round(float(c[0]), 3), round(float(c[1]), 3)], 'radius_px': round(float(r), 3),
                      'rms_px': round(rms, 3), 'inliers': int(keep.sum()), 'samples': int(len(keep))}
    tyre_mm = p['published']['tyre_outer_diameter_mm']
    # Average both tyres; a disc or deep rim does not change the tyre's outer diameter.
    r_px = (out['rear']['radius_px'] + out['front']['radius_px']) / 2
    mmpx = tyre_mm / (2 * r_px)
    ax = np.array(out['front']['centre']) - np.array(out['rear']['centre'])
    wb_mm = float(np.hypot(*ax)) * mmpx
    roll = math.degrees(math.atan2(ax[1], ax[0]))
    sizes = p['published']['geometry']['sizes']
    wb = p['published']['geometry']['wheelbase_mm']
    def gap(w):
        # A published range (sliding dropouts) counts as zero residual anywhere inside it.
        lo, hi = (w, w) if isinstance(w, (int, float)) else w
        return 0.0 if lo <= wb_mm <= hi else (wb_mm - hi if wb_mm > hi else wb_mm - lo)
    diffs = {s: round(gap(w), 1) for s, w in zip(sizes, wb)}
    size = min(diffs, key=lambda s: abs(diffs[s]))
    p['calibration'] = {
        'method': 'RANSAC circle fits to tyre outer edges in a flat-background mask; scale from published tyre outer diameter.',
        'wheels': out, 'tyre_outer_diameter_mm': tyre_mm, 'mm_per_px': round(mmpx, 5),
        'tyre_radius_mismatch_px': round(abs(out['rear']['radius_px'] - out['front']['radius_px']), 3),
        'photo_roll_deg': round(roll, 3), 'measured_wheelbase_mm': round(wb_mm, 1),
        'wheelbase_residual_by_size_mm': diffs, 'matched_size': size,
        'matched_residual_pct': round(100 * abs(diffs[size]) / wb_mm, 2),
    }
    Path(profile_path).write_text(json.dumps(p, indent=1, ensure_ascii=False))
    print(json.dumps(p['calibration'], indent=1))


if __name__ == '__main__':
    main(sys.argv[1])
