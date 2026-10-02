#!/usr/bin/env python3
"""Build small JPEG thumbnails from reference photography for the museum landing page."""
from PIL import Image
import pathlib

out = pathlib.Path('assets/reference/thumbs')
out.mkdir(parents=True, exist_ok=True)
srcs = {
 'speedmax-three-2005': 'assets/reference/heritage/photos/g2_speedmax_three_2005.jpg',
 'speedmax-2007':        'assets/reference/heritage/photos/g2_speedmax9_wallpaper.jpg',
 'speedmax-al-2011':     'assets/reference/heritage/photos/g4_al9_team.jpg',
 'speedmax-cf-2011':     'assets/reference/heritage/photos/g5_cf9pro_team.jpg',
 'cfr-2027':             'assets/reference/p02.png',
 'slx-2027':             'assets/reference/slx/p01.png',
}
for k, p in srcs.items():
    p = pathlib.Path(p)
    if not p.exists():
        print('MISSING', p); continue
    im = Image.open(p).convert('RGB')
    w, h = im.size
    scale = 560 / max(w, h)
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    dest = out / f'{k}.jpg'
    im.save(dest, 'JPEG', quality=82)
    print(k, im.size, dest.stat().st_size // 1024, 'KB')