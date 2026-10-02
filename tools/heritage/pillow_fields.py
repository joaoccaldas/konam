#!/usr/bin/env python3
"""Photo silhouette -> lateral half-width height fields ("pillows") in model millimetres.

Usage: pillow_fields.py <manifest.json>

Reads the adapter's pillow spec (`pipeline.pillow`): source photo, three landmarks (rear axle, front
axle, BB) in photo px, region polygons (fork / stays), lateral half-width control points, and the
lateral shear of the stays and fork blades. The landmarks are fitted by least squares (similarity:
scale, rotation, translation) to the positions the published geometry gives for the photographed
size; the residuals are written out, never hidden.

Output (data_dir): pillows.npz (per region: occupancy, half-width, lateral centre, grid origin/step),
pillows.json (transform, residuals, per-region stats) and pillows-overlay.png.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]


def fit_similarity(src, dst):
    """src, dst: (n,2). Returns s, R(2x2), t with dst ~ s R src + t."""
    ms, md = src.mean(0), dst.mean(0)
    A, B = src - ms, dst - md
    U, S, Vt = np.linalg.svd(B.T @ A)
    D = np.diag([1, np.sign(np.linalg.det(U @ Vt))])
    R = U @ D @ Vt
    s = (S * np.diag(D)).sum() / (A ** 2).sum()
    t = md - s * R @ ms
    return s, R, t


def poly_mask(shape, pts):
    m = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in pts], fill=1)
    return np.asarray(m).astype(bool)


def main():
    man = json.loads((ROOT / sys.argv[1]).read_text())
    pipe = man['pipeline']
    P = json.loads((ROOT / pipe['pillow']).read_text())
    spec = json.loads((ROOT / man['source_geometry']).read_text())
    g = spec['geometry']
    i = g['sizes'].index(P['size'])
    R_ = P['tyre_od'] / 2
    drop = g['bb_drop'][i]
    rc = math.sqrt(g['chainstay'][i] ** 2 - drop ** 2)
    model = {'rear_axle': (-rc, R_), 'front_axle': (-rc + g['wheelbase'][i], R_), 'bb': (0.0, R_ - drop)}
    names = ['rear_axle', 'front_axle', 'bb']
    src = np.array([[P['landmarks_px'][n][0], -P['landmarks_px'][n][1]] for n in names], float)   # y up
    dst = np.array([model[n] for n in names], float)
    s, Rm, t = fit_similarity(src, dst)
    fitted = (s * (Rm @ src.T)).T + t
    resid = {n: (fitted[k] - dst[k]).tolist() for k, n in enumerate(names)}

    def px_to_mm(x, y):
        v = s * (Rm @ np.array([x, -y])) + t
        return v

    Rinv = Rm.T

    def mm_to_px(X, Z):
        v = Rinv @ ((np.stack([X, Z], -1) - t).reshape(-1, 2).T) / s
        return v[0].reshape(np.shape(X)), (-v[1]).reshape(np.shape(X))

    img = Image.open(ROOT / P['photo']).convert('RGBA')
    alpha = np.asarray(img)[..., 3] > 128
    alpha = ndi.binary_fill_holes(alpha) if P.get('fill_holes') else alpha
    step = P.get('grid_mm', 1.0)
    X0, X1, Z0, Z1 = P['grid_bounds_mm']
    xs = np.arange(X0, X1, step)
    zs = np.arange(Z0, Z1, step)
    XX, ZZ = np.meshgrid(xs, zs)                     # rows = z, cols = x
    px, py = mm_to_px(XX, ZZ)
    ix = np.clip(np.round(px).astype(int), 0, alpha.shape[1] - 1)
    iy = np.clip(np.round(py).astype(int), 0, alpha.shape[0] - 1)
    inside = (px >= 0) & (px < alpha.shape[1]) & (py >= 0) & (py < alpha.shape[0])

    def region(poly):
        return poly_mask(alpha.shape, poly)[iy, ix] & alpha[iy, ix] & inside

    occ_all = alpha[iy, ix] & inside
    regions = {}
    fork = region(P['regions_px']['fork'])
    stays = region(P['regions_px']['stays']) & ~fork
    main = occ_all & ~fork & ~stays
    for extra in P.get('main_exclude_px', []):
        main &= ~region(extra)

    def width_field(ctrl, occ):
        """Inverse-distance-weighted half-width from control points given in photo px."""
        cp = np.array([px_to_mm(x, y) for x, y, _ in ctrl])
        hw = np.array([w for _, _, w in ctrl], float)
        d2 = (XX[..., None] - cp[:, 0]) ** 2 + (ZZ[..., None] - cp[:, 1]) ** 2 + 1.0
        wgt = 1.0 / d2 ** 1.5
        return np.where(occ, (wgt * hw).sum(-1) / wgt.sum(-1), 0.0)

    def pillow(occ, hw, n=P.get('superellipse_n', 2.6)):
        """Half-thickness at each cell: rounded towards the silhouette edge over a radius = local half-width."""
        d = ndi.distance_transform_edt(occ) * step
        tt = np.clip(d / np.maximum(hw, 1e-3), 0, 1)
        return np.where(occ, hw * (1 - (1 - tt) ** n) ** (1 / n), 0.0)

    out = {}
    stats = {}
    # main frame, centred on y=0
    hw = width_field(P['main_halfwidth_px'], main)
    out['main'] = dict(occ=main, h=pillow(main, hw), yc=np.zeros_like(hw))
    # stays: two sheared copies; seat stays vs chain stays split by angle about the rear axle
    ra = np.array(px_to_mm(*P['landmarks_px']['rear_axle']))
    ang = np.degrees(np.arctan2(ZZ - ra[1], XX - ra[0]))
    ss = stays & (ang > P['stay_split_deg'])
    cs = stays & ~ss
    sh = P['stay_shear']
    for name, occ, (x_end, y_drop, y_end, w) in (('seatstay', ss, sh['seatstay']), ('chainstay', cs, sh['chainstay'])):
        xe = x_end                                                 # model mm
        tpar = np.clip((XX - ra[0]) / (xe - ra[0]), 0, 1)
        yc = y_drop + (y_end - y_drop) * tpar
        hw = np.where(occ, w, 0.0)
        for side, sgn in (('L', 1), ('R', -1)):
            out[f'{name}_{side}'] = dict(occ=occ, h=pillow(occ, hw), yc=sgn * yc)
    # fork: upper (steerer/crown/stem fairing) centred; blades sheared below the crown line
    fk = P['fork']
    fa = np.array(px_to_mm(*P['landmarks_px']['front_axle']))
    cz = fk['crown_z_mm']
    upper = fork & (ZZ >= cz)
    blades = fork & (ZZ < cz + fk['overlap_mm'])
    hw = width_field(fk['upper_halfwidth_px'], upper)
    out['fork_upper'] = dict(occ=upper, h=pillow(upper, hw), yc=np.zeros_like(hw))
    tpar = np.clip((cz - ZZ) / (cz - fa[1]), 0, 1)
    yc = fk['y_crown'] + (fk['y_dropout'] - fk['y_crown']) * tpar
    hwb = np.where(blades, fk['blade_halfwidth'][0] + (fk['blade_halfwidth'][1] - fk['blade_halfwidth'][0]) * tpar, 0.0)
    for side, sgn in (('L', 1), ('R', -1)):
        out[f'fork_blade_{side}'] = dict(occ=blades, h=pillow(blades, hwb), yc=sgn * yc)

    data = ROOT / pipe['data_dir']
    data.mkdir(parents=True, exist_ok=True)
    npz = {}
    for k, v in out.items():
        npz[k + '_occ'] = v['occ']
        npz[k + '_h'] = v['h'].astype(np.float32)
        npz[k + '_yc'] = v['yc'].astype(np.float32)
        stats[k] = {'cells': int(v['occ'].sum()), 'max_half_width_mm': float(v['h'].max())}
    np.savez_compressed(data / 'pillows.npz', x0=X0, z0=Z0, step=step, nx=len(xs), nz=len(zs), **npz)
    meta = {'photo': P['photo'], 'size': P['size'], 'scale_mm_per_px': s,
            'rotation_deg': math.degrees(math.atan2(Rm[1, 0], Rm[0, 0])), 'translation_mm': t.tolist(),
            'landmark_residuals_mm': resid, 'model_landmarks_mm': model, 'regions': stats,
            'basis': 'Occupancy = photo silhouette (alpha). Half-widths are INFERRED from Trek front/top photos '
                     'and control points listed in the pillow spec; side-view shape is PHOTO-derived.'}
    (data / 'pillows.json').write_text(json.dumps(meta, indent=2))

    # overlay: regions tinted on the photo
    ov = Image.new('RGBA', img.size, (255, 255, 255, 255))
    ov.alpha_composite(img)
    tint = np.zeros((*alpha.shape, 4), np.uint8)
    for k, col in (('main', (0, 160, 255, 90)), ('seatstay_L', (0, 220, 0, 110)), ('chainstay_L', (255, 160, 0, 110)),
                   ('fork_upper', (220, 0, 220, 110)), ('fork_blade_L', (255, 0, 0, 110))):
        occ = out[k]['occ']
        zz, xx = np.nonzero(occ)
        qx, qy = mm_to_px(xs[xx], zs[zz])
        qx = np.clip(np.round(qx).astype(int), 0, alpha.shape[1] - 1)
        qy = np.clip(np.round(qy).astype(int), 0, alpha.shape[0] - 1)
        tint[qy, qx] = col
    ov.alpha_composite(Image.fromarray(tint))
    ov.convert('RGB').resize((img.size[0] // 3, img.size[1] // 3)).save(data / 'pillows-overlay.png')
    print(json.dumps({k: meta[k] for k in ('scale_mm_per_px', 'rotation_deg', 'landmark_residuals_mm', 'regions')}, indent=1))


if __name__ == '__main__':
    main()
