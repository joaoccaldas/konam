#!/usr/bin/env python3
"""Watertightness gate for the pillow surface. No Blender required.

A rectangle and a rectangle with a window must be closed. Every region in the Speed Concept
height field must be closed too: an open shell is what made the voxel remesh drop the main frame.
"""
import sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'blender' / 'heritage'))
from pillow_surface import region_mesh, edge_histogram

NPZ = ROOT / 'blender/heritage_data/trek-speed-concept-slr-9-axs-my2027/pillows.npz'
KEYS = ('main', 'seatstay_L', 'seatstay_R', 'chainstay_L', 'chainstay_R',
        'fork_upper', 'fork_blade_L', 'fork_blade_R')


def check(name, occ, h, yc, x0=0.0, z0=0.0, step=1.0):
    V, F = region_mesh(occ, h, yc, x0, z0, step)
    hist = edge_histogram(F)
    if hist['boundary'] != 0:
        raise SystemExit(f'{name} is open: {hist}')
    if len(F) == 0 or not np.isfinite(V).all():
        raise SystemExit(f'{name} produced an empty or non-finite mesh: {hist}')
    print(name, hist)
    return hist


def synthetic():
    occ = np.zeros((24, 40), bool)
    occ[4:20, 4:36] = True
    h = np.where(occ, 12.0, 0.0)
    yc = np.zeros(occ.shape)
    check('rectangle', occ, h, yc)
    hole = occ.copy()
    hole[8:16, 12:28] = False
    h2 = np.where(hole, 12.0, 0.0)
    check('rectangle_with_window', hole, h2, yc)


def speed_concept():
    if not NPZ.exists():
        raise SystemExit(f'missing height field {NPZ}')
    D = np.load(NPZ)
    x0, z0, step = float(D['x0']), float(D['z0']), float(D['step'])
    for k in KEYS:
        hist = check(k, D[k + '_occ'], D[k + '_h'], D[k + '_yc'], x0, z0, step)
        if k == 'main' and hist['faces'] < 200000:
            raise SystemExit(f'main frame mesh is unexpectedly small: {hist}')


if __name__ == '__main__':
    synthetic()
    speed_concept()
    print('pillow surface closed')
