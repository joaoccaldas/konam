#!/usr/bin/env python3
"""Side-view silhouette of the remeshed Speed Concept frame against the frameset photo.

Projects the mesh with the same similarity that fitted the axles and BB. This checks that the
voxel remesh still covers the photo silhouette, including the main frame. It is a regression
against the source photo, not an independent measurement of the bike.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'blender/heritage_data/trek-speed-concept-slr-9-axs-my2027'
STEP = 4  # photo pixels per raster cell


def main():
    meta = json.loads((DATA / 'pillows.json').read_text())
    photo = Image.open(ROOT / meta['photo']).convert('RGBA')
    alpha = np.asarray(photo)[..., 3] > 128
    H, W = alpha.shape
    s = meta['scale_mm_per_px']
    th = math.radians(meta['rotation_deg'])
    t = np.array(meta['translation_mm'])
    Rinv = np.array([[math.cos(th), math.sin(th)], [-math.sin(th), math.cos(th)]])
    mesh = np.load(DATA / 'qa' / 'frame_tris.npz')
    V, F = mesh['V'], mesh['F']
    xz = np.asarray(V[:, [0, 2]] - t, dtype=np.float64)
    # Apple Accelerate can warn "divide by zero" on a finite matmul. The values are checked below.
    with np.errstate(divide='ignore', over='ignore', invalid='ignore'):
        q = (Rinv.astype(np.float64) @ xz.T) / s
    if not np.isfinite(q).all():
        raise SystemExit('silhouette projection produced non-finite pixels')
    px, py = q[0] / STEP, -q[1] / STEP
    small = (W // STEP, H // STEP)
    im = Image.new('L', small, 0)
    draw = ImageDraw.Draw(im)
    pts = np.stack([px, py], 1)
    for tri in F:
        draw.polygon([tuple(p) for p in pts[tri]], fill=1)
    pred = np.asarray(im, dtype=bool)
    ref = alpha[::STEP, ::STEP][:small[1], :small[0]]
    inter = int((pred & ref).sum())
    union = int((pred | ref).sum())
    iou = inter / union if union else 0.0
    er = ref & ~ndi.binary_erosion(ref)
    ep = pred & ~ndi.binary_erosion(pred)
    mm = s * STEP
    d_to_mesh = ndi.distance_transform_edt(~ep)
    d_to_photo = ndi.distance_transform_edt(~er)
    dist = np.r_[d_to_mesh[er], d_to_photo[ep]] * mm
    photo_far = np.unravel_index(int(np.argmax(np.where(er, d_to_mesh, 0))), er.shape)
    mm2 = (s * STEP) ** 2
    bb = meta['model_landmarks_mm']['bb']
    x_max = float(V[:, 0].max())
    x_min = float(V[:, 0].min())
    report = {
        'iou': round(iou, 5),
        'boundary_median_mm': round(float(np.median(dist)), 3),
        'boundary_p95_mm': round(float(np.percentile(dist, 95)), 3),
        'boundary_max_mm': round(float(dist.max()), 3),
        'boundary_max_photo_px': [int(photo_far[1] * STEP), int(photo_far[0] * STEP)],
        'photo_not_in_mesh_mm2': round(float((ref & ~pred).sum() * mm2), 1),
        'mesh_not_in_photo_mm2': round(float((pred & ~ref).sum() * mm2), 1),
        'mesh_x_mm': [round(x_min, 1), round(x_max, 1)],
        'bb_x_mm': bb[0],
        'raster_step_px': STEP,
        'scope': 'Full frameset silhouette (photo alpha vs remeshed frame+fork). Smoothed by the 1.2 mm voxel remesh. Not a caliper measurement.',
    }
    # Head tube on this size sits near x=450 mm. Stays alone stay behind the BB.
    report['main_frame_present'] = x_max > 300
    report['pass'] = bool(report['main_frame_present'] and iou > 0.90 and report['boundary_p95_mm'] < 8)
    overlay = photo.convert('RGB').resize((W // STEP, H // STEP))
    edge = pred & ~ndi.binary_erosion(pred)
    arr = np.array(overlay)
    arr[edge] = (220, 40, 40)
    Image.fromarray(arr).save(DATA / 'qa' / 'silhouette_overlay.png')
    (DATA / 'qa' / 'silhouette_report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    if not report['pass']:
        raise SystemExit('silhouette gate failed')


if __name__ == '__main__':
    main()
