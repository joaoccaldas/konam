"""Photo-driven frame & fork shapes (run with system python3 + scipy, not Blender).

Source: Canyon's official studio render 2027_FULL_speedmax_cfr-axs_4524_R134_P02 (white, transparent PNG, 2400 px).
Calibration: least-squares circle fit on both tyre edges (residual < 0.35 px) -> axles at
(593.77, 909.24) and (1808.71, 909.02) px, 1013 mm apart -> 0.83379 mm/px; BB lands where the
published 420 mm chainstay / 75 mm drop put it (crank spindle visible at ~1090, 1000 px).

Outputs (blender/data/):
  frame_main.obj   pillow solid of the main frame silhouette (Blender Z-up, metres)
  frame_stays.obj  sheared pillows: 2 seatstays + 2 chainstays at their real lateral offsets
  fork.obj         steerer fairing + 2 fork blades (sheared pillows)
  profile.json     fitted edges + calibration for reference
"""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

SRC = sys.argv[1] if len(sys.argv) > 1 else 'p02.png'
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(OUT, exist_ok=True)

MMPX = 1013 / math.hypot(1808.71 - 593.77, 909.02 - 909.24)
BBPX = (593.77 + math.sqrt(420 ** 2 - 75 ** 2) / MMPX, 909.13 + 75 / MMPX)
BBZ = 339.5 - 75
CAL=json.load(open(os.environ['BIKE_CALIBRATION'])) if os.environ.get('BIKE_CALIBRATION') else None
if CAL:MMPX=CAL['mm_per_px'];BBPX=CAL['bb_px']


def to_mm(px, py):
    return (px - BBPX[0]) * MMPX, (BBPX[1] - py) * MMPX + BBZ


img = np.asarray(Image.open(SRC).convert('RGBA')).astype(np.int16)
alpha = img[:, :, 3] > 128
lum = img[:, :, :3].mean(2)
paint = alpha & (lum >= 145)
H, W = paint.shape


def poly_mask(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in pts], fill=1)
    return np.asarray(m).astype(bool)


def disk(cx, cy, r):
    yy, xx = np.ogrid[:H, :W]
    return (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r


# ---- clean paint mask: decals filled, only the frame blob
filled = ndi.binary_fill_holes(paint) & alpha
lab, n = ndi.label(filled)
sizes = ndi.sum(filled, lab, range(1, n + 1))
frame_blob = lab == (1 + int(np.argmax(sizes)))
frame_blob = ndi.binary_opening(frame_blob, iterations=1)

# ---- fitted edges
def runs_in_col(mask, x, y0, y1):
    col = ndi.binary_closing(mask[y0:y1, x], iterations=2)
    labs, count = ndi.label(col)
    if count:
        sizes = np.bincount(labs)[1:]
        col = labs == (1 + sizes.argmax())
    ys = np.nonzero(col)[0]
    if len(ys) == 0:
        return None
    return y0 + ys.min(), y0 + ys.max()


def runs_in_row(mask, y, x0, x1):
    row = mask[y, x0:x1]
    xs = np.nonzero(row)[0]
    if len(xs) == 0:
        return None
    return x0 + xs.min(), x0 + xs.max()


def fit_line(pts):
    # Deterministic robust fit: paint interrupted by decals must not move the tube edge.
    pts = np.array(pts, float)
    if len(pts)<4: raise ValueError('Insufficient visible edge samples')
    best = None
    for i in range(0,len(pts),3):
        for j in range(i+10,len(pts),3):
            k=(pts[j,1]-pts[i,1])/(pts[j,0]-pts[i,0]); b=pts[i,1]-k*pts[i,0]
            keep=np.abs(pts[:,1]-(k*pts[:,0]+b))<1.8
            score=int(keep.sum())
            if best is None or score>best[0]: best=(score,keep)
    keep=best[1]
    k,b=np.linalg.lstsq(np.c_[pts[keep,0],np.ones(keep.sum())],pts[keep,1],rcond=None)[0]
    return float(k),float(b)


# seatstays: sample perpendicular to the stay direction using columns (stay is ~45 deg)
ss_top, ss_bot = [], []
for x in range(680, 850, 2):
    r = runs_in_col(filled, x, 560, 860)
    if r:
        ss_top.append((x, r[0])); ss_bot.append((x, r[1]))
cs_top, cs_bot = [], []
for x in range(680, 900, 2):
    r = runs_in_col(filled, x, 870, 1010)
    if r:
        cs_top.append((x, r[0])); cs_bot.append((x, r[1]))
fk_rear, fk_front = [], []
for y in range(560, 800, 2):
    r = runs_in_row(filled, y, 1600, 1850)
    if r:
        fk_rear.append((y, r[0])); fk_front.append((y, r[1]))
SS_T, SS_B = fit_line(ss_top), fit_line(ss_bot)
CS_T, CS_B = fit_line(cs_top), fit_line(cs_bot)
FK_R, FK_F = fit_line(fk_rear), fit_line(fk_front)      # x = k*y + b
print('seatstay top/bot', SS_T, SS_B)
print('chainstay top/bot', CS_T, CS_B)
print('fork rear/front', FK_R, FK_F)

AXR = CAL['wheels'][0]['centre'] if CAL else (593.77, 909.24)
AXF = CAL['wheels'][1]['centre'] if CAL else (1808.71, 909.02)

# ---- region masks
fork_region = poly_mask([(1620, 506), (1745, 484), (1900, 480), (1900, 1000), (1760, 1000)])
fairing_region = poly_mask([(1621, 376), (1705, 376), (1768, 486), (1745, 490), (1661, 503)])
stays_cut = poly_mask([(890, 548), (890, 1040), (400, 1040), (400, 548)])
x_cs_end = 1010
cs_poly_top = lambda x: CS_T[0] * x + CS_T[1]
chain_cut = poly_mask([(890, cs_poly_top(890) - 1), (x_cs_end, cs_poly_top(x_cs_end) - 1), (x_cs_end, 1040), (890, 1040)])
bbR = 112 / MMPX
main = frame_blob & ~fork_region & ~fairing_region & ~stays_cut & ~chain_cut & ~disk(*BBPX, bbR)
lab, n = ndi.label(main)
sizes = ndi.sum(main, lab, range(1, n + 1))
main = lab == (1 + int(np.argmax(sizes)))

# BB junction hidden behind the chainring: convex hull of nearby visible frame + BB shell
near = frame_blob & disk(*BBPX, 175 / MMPX) & ~disk(*BBPX, bbR) & ~stays_cut
ys, xs = np.nonzero(near)
pts = np.c_[xs, ys].astype(float)
# add BB shell outline and chainstay entry
for a in np.linspace(0, 2 * math.pi, 48, endpoint=False):
    pts = np.vstack([pts, [BBPX[0] + 30 / MMPX * math.cos(a), BBPX[1] + 30 / MMPX * math.sin(a)]])
from scipy.spatial import ConvexHull
hull = ConvexHull(pts)
hull_mask = poly_mask([tuple(pts[i]) for i in hull.vertices]) & disk(*BBPX, bbR + 4)
# don't fill the wheel cut-out above/behind the BB: keep hull only below the seat tube's rear edge line
wheel_clear = disk(AXR[0], AXR[1], (339.5 + 8) / MMPX)
main = main | (hull_mask & ~wheel_clear)
# Reconstruct the tube occluded by the derailleur. The masked-out motor is not a hole in carbon.
main |= poly_mask([(990,754),(1040,787),(1130,796),(1164,849),(1120,975),(1040,1015),(1010,866)]) & ~wheel_clear
main = ndi.binary_closing(main, iterations=2)


# ---- pillow mesher
def pillow(mask, width_fn, lateral_fn=None, sides=(1,), step=1, name='obj'):
    """Returns (verts[mm, Blender XYZ], faces). width_fn(xmm, zmm) -> full lateral width (mm).
    lateral_fn(xmm, zmm) -> centre offset (mm, >=0) mirrored by `sides`."""
    mask = ndi.gaussian_filter(mask.astype(float), 1.3) > .5
    m = mask[::step, ::step]
    d = ndi.distance_transform_edt(m) * step * MMPX            # mm to edge
    d = ndi.gaussian_filter(d, .8)
    dmax = ndi.maximum_filter(d, size=max(3, int(70 / (step * MMPX))))
    ring = ndi.binary_dilation(m) & ~m
    use = m | ring
    hh, ww = m.shape
    X = (np.arange(ww) * step - BBPX[0]) * MMPX
    Z = (BBPX[1] - np.arange(hh) * step) * MMPX + BBZ
    XX, ZZ = np.meshgrid(X, Z)
    Wf = width_fn(XX, ZZ)
    r = np.minimum(Wf / 2, np.maximum(dmax, 1e-3))
    t = np.clip(d / np.maximum(r, 1e-3), 0, 1)
    h = Wf / 2 * np.sqrt(1 - (1 - t) ** 2) * (0.86 + 0.14 * np.clip(d / np.maximum(dmax, 1e-3), 0, 1))
    h = ndi.gaussian_filter(h, 2.2)
    h[~m] = 0
    Cl = lateral_fn(XX, ZZ) if lateral_fn else np.zeros_like(XX)
    allV, allF = [], []
    for s in sides:
        idx = -np.ones((hh, ww, 2), np.int64)
        V = []
        for sheet, sg in ((0, 1), (1, -1)):
            for (i, j) in zip(*np.nonzero(use)):
                if sheet == 1 and not m[i, j]:
                    idx[i, j, 1] = idx[i, j, 0]      # ring vertices shared
                    continue
                idx[i, j, sheet] = len(V)
                V.append((XX[i, j], s * (Cl[i, j] + sg * h[i, j]), ZZ[i, j]))
        F = []
        cells = use[:-1, :-1] & use[1:, :-1] & use[:-1, 1:] & use[1:, 1:]
        # require at least one interior corner so we don't bridge across thin gaps
        inner = m[:-1, :-1] | m[1:, :-1] | m[:-1, 1:] | m[1:, 1:]
        for (i, j) in zip(*np.nonzero(cells & inner)):
            for sheet in (0, 1):
                a, b, c, e = idx[i, j, sheet], idx[i, j + 1, sheet], idx[i + 1, j + 1, sheet], idx[i + 1, j, sheet]
                F.append((a, b, c, e) if sheet == 0 else (a, e, c, b))
        off = len(allV)
        allV += V
        allF += [tuple(k + off for k in f) for f in F]
    return np.array(allV), allF


def smoothstep(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def main_width(x, z):
    w = 40 + 12 * smoothstep(x, 300, 420)                                 # head tube 52
    mast = smoothstep(-x, 40, 90) * smoothstep(z, 420, 520)
    w = w * (1 - mast) + 35 * mast                                         # seat mast
    tt = smoothstep(z, 690, 730) * smoothstep(x, -120, -60) * (1 - smoothstep(x, 330, 400))
    w = w * (1 - tt) + 42 * tt                                             # top tube
    rbb = np.hypot(x, z - BBZ)
    w = w * smoothstep(rbb, 30, 130) + 86.5 * (1 - smoothstep(rbb, 30, 130))             # BB block ~ 86.5 shell
    return w


def write_obj(path, V, F):
    with open(path, 'w') as f:
        for v in V:
            f.write('v %.6f %.6f %.6f\n' % (v[0] / 1000, v[1] / 1000, v[2] / 1000))
        for fc in F:
            f.write('f ' + ' '.join(str(k + 1) for k in fc) + '\n')


V, F = pillow(main, main_width, step=1)
write_obj(os.path.join(OUT, 'frame_main.obj'), V, F)
print('main verts', len(V), 'faces', len(F))


# ---- stays (sheared pillows from fitted edges)
def band_mask(top, bot, x0, x1):
    pts = [(x0, top[0] * x0 + top[1]), (x1, top[0] * x1 + top[1]), (x1, bot[0] * x1 + bot[1]), (x0, bot[0] * x0 + bot[1])]
    return poly_mask(pts)


# seatstay from mast (x=900) down to the dropout; chainstay from dropout to BB block
ss = band_mask(SS_T, SS_B, AXR[0] - 4, 905) & ~disk(AXR[0], AXR[1], 8) | disk(AXR[0], AXR[1], 20 / MMPX)
cs = band_mask(CS_T, CS_B, AXR[0] - 4, 1040) | disk(AXR[0], AXR[1], 20 / MMPX)
ax_x = (AXR[0] - BBPX[0]) * MMPX


def ss_lat(x, z):
    t = np.clip((x - (-190)) / (ax_x - (-190)), 0, 1)                     # 0 at mast, 1 at dropout
    return 18 + (76 - 18) * t ** 1.3


def cs_lat(x, z):
    t = np.clip((x - 0) / (ax_x - 0), 0, 1)
    return np.interp(t, [0, .25, .5, .75, 1], [30, 34, 48, 64, 76])


V1, F1 = pillow(ss, lambda x, z: 17 - 4 * np.clip(x / ax_x, 0, 1), ss_lat, sides=(1, -1))
V2, F2 = pillow(cs, lambda x, z: 22 - 8 * np.clip(x / ax_x, 0, 1), cs_lat, sides=(1, -1))
write_obj(os.path.join(OUT, 'frame_stays.obj'), np.vstack([V1, V2]), F1 + [tuple(k + len(V1) for k in f) for f in F2])


# ---- fork: fairing (centre) + blades from fitted edges extended to the dropout
yb = AXF[1] + 16
blade = poly_mask([(FK_R[0] * 505 + FK_R[1], 505), (FK_F[0] * 490 + FK_F[1], 490), (FK_F[0] * yb + FK_F[1], yb),
                   (FK_R[0] * yb + FK_R[1] + 6, yb)])
blade &= poly_mask([(1560, 1000), (1560, 560), (1612, 508), (1745, 484), (1900, 480), (1900, 1000)])
blade |= disk(AXF[0], AXF[1], 17 / MMPX)
fz0 = (BBPX[1] - 505) * MMPX + BBZ
fz1 = 339.5


def fk_lat(x, z):
    t = np.clip((fz0 - z) / (fz0 - fz1), 0, 1)
    return 60 - 3 * t


V3, F3 = pillow(blade, lambda x, z: 26 - 10 * np.clip((fz0 - z) / (fz0 - fz1), 0, 1), fk_lat, sides=(1, -1))
fair = filled & fairing_region
V4, F4 = pillow(fair, lambda x, z: 50 + 0 * x)
write_obj(os.path.join(OUT, 'fork.obj'), np.vstack([V3, V4]), F3 + [tuple(k + len(V3) for k in f) for f in F4])

prof = {
    'source': SRC,
    'mm_per_px': MMPX, 'bb_px': BBPX, 'axle_rear_px': AXR, 'axle_front_px': AXF,
    'fit': {'seatstay_top': SS_T, 'seatstay_bottom': SS_B, 'chainstay_top': CS_T, 'chainstay_bottom': CS_B,
            'fork_rear_x_of_y': FK_R, 'fork_front_x_of_y': FK_F},
}
json.dump(prof, open(os.path.join(OUT, 'profile.json'), 'w'), indent=1)
Image.fromarray((main * 255).astype(np.uint8)).save(os.path.join(OUT, 'mask_main.png'))
print('ok')
