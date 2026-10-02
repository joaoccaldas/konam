#!/usr/bin/env python3
"""Photo-space regression check for a heritage exhibit (not metrology).

Usage: heritage_compare.py <profile.json> <checks_dir>

Compares the registered model silhouette with the photo's background-difference mask.
Scored regions:
  * whole bike above the floor line (tyre bottoms), which includes wheels and cockpit;
  * frame zone: pixels within 6 px of any traced frame/fork centreline station band.
Writes silhouette-report.json, overlay_edges.png (model outline on the photo) and
overlay_blend.png (model render at 55% over the photo).
"""
import json, sys
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


def main(profile, checks):
    p = json.loads(Path(profile).read_text()); out = Path(checks)
    ph = p['photo']; cal = p['calibration']; s = cal['mm_per_px']
    a = np.asarray(Image.open(ROOT / ph['path']).convert('RGB')).astype(int)
    ref = np.abs(a - np.array(ph['background'])).max(2) > ph.get('tolerance', 8)
    ref = despeckle(ref, ph)
    ref = ndi.binary_closing(ref, iterations=1)
    # Dark parts (black cranks, tyres) can equal the backdrop colour and punch small holes in
    # the mask. Fill enclosed holes below hole_px only; frame windows and wheels stay open.
    # Area-based so the rule is the same physical size at every photo resolution (80 px at 2.5 mm/px).
    hole_px = ph.get('mask_hole_mm2', 500) / cal['mm_per_px'] ** 2
    lab, n = ndi.label(~ref)
    sizes = ndi.sum(np.ones_like(ref), lab, range(1, n + 1))
    border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    small = [i + 1 for i, a in enumerate(sizes) if a < hole_px and (i + 1) not in border]
    ref = ref | np.isin(lab, small)
    H, W = ref.shape
    floor = int(max(cal['wheels'][w]['centre'][1] + cal['wheels'][w]['radius_px'] for w in ('rear', 'front'))) + 2
    valid = np.zeros_like(ref); valid[:floor] = True
    pred = np.asarray(Image.open(out / 'silhouette.png').convert('RGBA'))[:, :, 3] > 128
    zone = np.zeros_like(ref)
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    for name, st in p['traced'].items():
        part = p['model']['members'][name].get('part', 'frame')
        if part not in ('frame', 'fork'):
            continue
        for q in st:
            r = (q['depth_px'] or 10) / 2 + 6
            d.ellipse([q['px'][0] - r, q['px'][1] - r, q['px'][0] + r, q['px'][1] + r], fill=1)
    zone = np.asarray(img).astype(bool)
    # Frame edges are scored only where no other part touches them (as the 2027 CFR ROI excludes
    # BB, derailleur and accessories). Hardware still counts in whole_bike.
    hw = np.asarray(Image.open(out / 'hardware.png').convert('RGBA'))[:, :, 3] > 128
    zone &= ~ndi.binary_dilation(hw, iterations=max(1, int(round(10 / s))))

    def score(region):
        R, Pm = ref & region, pred & region
        iou = (R & Pm).sum() / max((R | Pm).sum(), 1)
        er = R & ~ndi.binary_erosion(R); ep = Pm & ~ndi.binary_erosion(Pm)
        safe = ndi.binary_erosion(region, iterations=3); er &= safe; ep &= safe
        dist = np.r_[ndi.distance_transform_edt(~er)[ep], ndi.distance_transform_edt(~ep)[er]] * s
        return {'iou': round(float(iou), 4), 'boundary_median_mm': round(float(np.median(dist)), 2),
                'boundary_p95_mm': round(float(np.percentile(dist, 95)), 2)}

    res = {'whole_bike': score(valid), 'frame_zone': score(zone & valid),
           'scope': 'Background-difference photo mask vs calibrated orthographic render. Frame zone = traced frame/fork bands + 6 px, minus anything within 10 mm of modelled hardware. '
                    'Enclosed mask holes below 500 mm2 are filled (dark parts or reflections matching the backdrop). Regression check of the photo-derived side view; lateral shape and hidden geometry are not scored.',
           'mm_per_px': s}
    # p95 limit = max(5 mm, 5 px): the 2027 CFR's 5 mm gate, with a 5-pixel floor so coarse archive
    # photos are not held to sub-pixel limits.
    lim = max(5.0, 5.0 * s)
    res['gate'] = {'frame_zone_iou': .9, 'frame_zone_p95_mm': round(lim, 2), 'rule': 'p95 <= max(5 mm, 5 px)'}
    res['pass'] = res['frame_zone']['iou'] >= .9 and res['frame_zone']['boundary_p95_mm'] <= lim
    (out / 'silhouette-report.json').write_text(json.dumps(res, indent=2))
    base = Image.fromarray(a.astype(np.uint8)).convert('RGBA')
    edge = ndi.binary_dilation(pred & ~ndi.binary_erosion(pred))
    lay = np.zeros((H, W, 4), np.uint8); lay[edge] = (11, 200, 230, 255)
    e = base.copy(); e.alpha_composite(Image.fromarray(lay)); e.convert('RGB').save(out / 'overlay_edges.png')
    r = Image.open(out / 'overlay-render.png').convert('RGBA')
    r.putalpha(Image.fromarray((np.asarray(r)[:, :, 3] * .55).astype(np.uint8)))
    b = base.copy(); b.alpha_composite(r); b.convert('RGB').save(out / 'overlay_blend.png')
    print(json.dumps(res, indent=2))
    if not res['pass']:
        raise SystemExit('Silhouette gate failed')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
