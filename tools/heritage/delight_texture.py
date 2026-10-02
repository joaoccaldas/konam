#!/usr/bin/env python3
"""Make a de-lit albedo texture from a transparent studio photo (for side-projected UVs).

Usage: delight_texture.py <photo.png> <out.png> [sigma_px]

Large-scale studio shading is divided out (normalised Gaussian of luminance inside the alpha mask),
small-scale detail (decals, carbon pattern) is kept. Colours are pushed outward past the silhouette so
texture filtering never samples the background. The output is a derived working file, not a source.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, dst = sys.argv[1], sys.argv[2]
sigma = float(sys.argv[3]) if len(sys.argv) > 3 else 60.0
a = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32) / 255
rgb, al = a[..., :3], a[..., 3] > 0.5
lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
num = ndi.gaussian_filter(np.where(al, lum, 0), sigma)
den = ndi.gaussian_filter(al.astype(np.float32), sigma)
low = num / np.maximum(den, 1e-4)
target = np.median(low[al])
alb = np.clip(rgb * (target / np.maximum(low, 1e-3))[..., None], 0, 1)
# push colours outward (nearest inside pixel)
_, (iy, ix) = ndi.distance_transform_edt(~al, return_indices=True)
alb = alb[iy, ix]
Image.fromarray((alb * 255).astype(np.uint8)).save(dst)
print('albedo', dst, 'median shading', float(target))
