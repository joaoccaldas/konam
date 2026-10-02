"""Watertight side-view height field ("pillow") as a triangle mesh.

Occupancy is a photo silhouette in the XZ plane. Each occupied cell gets a top and a bottom
vertex at yc ± half-width. A one-cell ring outside the silhouette is pinched to yc so the
outer rim (and every interior opening) closes. Stairstep corners of that ring are not closed
by the pinch alone: the edge from a pinched vertex to an interior vertex is a slit as tall as
the local half-width. Those slits are capped with wall triangles. Without the walls the shell
is open, and a voxel remesh drops it.
"""
import numpy as np

MM = 0.001


def _dilate4(occ):
    grow = occ.copy()
    grow[1:, :] |= occ[:-1, :]
    grow[:-1, :] |= occ[1:, :]
    grow[:, 1:] |= occ[:, :-1]
    grow[:, :-1] |= occ[:, 1:]
    return grow


def _tris_from_quads(q):
    if len(q) == 0:
        return np.zeros((0, 3), np.int64)
    return np.concatenate([q[:, [0, 1, 2]], q[:, [0, 2, 3]]], 0)


def region_mesh(occ, h, yc, x0, z0, step):
    """Return (verts_metres, triangles). Empty occupancy returns two empty arrays."""
    occ = np.asarray(occ, dtype=bool)
    h = np.asarray(h, dtype=np.float64)
    yc = np.asarray(yc, dtype=np.float64)
    if not occ.any():
        return np.zeros((0, 3), np.float64), np.zeros((0, 3), np.int64)
    grow = _dilate4(occ)
    idx = -np.ones(occ.shape, np.int64)
    zz, xx = np.nonzero(grow)
    n = len(zz)
    idx[zz, xx] = np.arange(n)
    X = x0 + xx * step
    Z = z0 + zz * step
    Y = yc[zz, xx]
    inside = occ[zz, xx]
    H = np.where(inside, h[zz, xx], 0.0)
    top = np.stack([X, Y + H, Z], 1)
    bot = np.stack([X, Y - H, Z], 1)
    interior = np.nonzero(inside)[0]
    bot_of = np.arange(n, dtype=np.int64)
    bot_of[interior] = n + np.arange(len(interior))
    V = np.concatenate([top, bot[interior]], 0) * MM

    q = grow[:-1, :-1] & grow[1:, :-1] & grow[1:, 1:] & grow[:-1, 1:]
    q &= occ[:-1, :-1] | occ[1:, :-1] | occ[1:, 1:] | occ[:-1, 1:]
    qz, qx = np.nonzero(q)
    a = idx[qz, qx]
    b = idx[qz, qx + 1]
    c = idx[qz + 1, qx + 1]
    d = idx[qz + 1, qx]
    # +Y normal on the top sheet, -Y on the bottom sheet
    Ft = _tris_from_quads(np.stack([a, d, c, b], 1))
    Fb = _tris_from_quads(np.stack([bot_of[a], bot_of[b], bot_of[c], bot_of[d]], 1))
    walls = _wall_tris(Ft, bot_of, n)
    return V, np.concatenate([Ft, Fb, walls], 0)


def _wall_tris(Ft, bot_of, n):
    """Cap every top-sheet boundary edge that is not already pinched shut."""
    pairs = np.stack([Ft[:, [0, 1]], Ft[:, [1, 2]], Ft[:, [2, 0]]], 0).reshape(-1, 2)
    lo = np.minimum(pairs[:, 0], pairs[:, 1]).astype(np.int64)
    hi = np.maximum(pairs[:, 0], pairs[:, 1]).astype(np.int64)
    key = lo * (n + 1) + hi
    _, inv, cnt = np.unique(key, return_inverse=True, return_counts=True)
    boundary = pairs[cnt[inv] == 1]
    if len(boundary) == 0:
        return np.zeros((0, 3), np.int64)
    u, v = boundary[:, 0], boundary[:, 1]
    bu, bv = bot_of[u], bot_of[v]
    both = (bu != u) & (bv != v)
    u_ring = (bu == u) & (bv != v)
    v_ring = (bv == v) & (bu != u)
    parts = []
    if both.any():
        parts.append(_tris_from_quads(np.stack([u[both], v[both], bv[both], bu[both]], 1)))
    if u_ring.any():
        parts.append(np.stack([u[u_ring], v[u_ring], bv[u_ring]], 1))
    if v_ring.any():
        parts.append(np.stack([u[v_ring], v[v_ring], bu[v_ring]], 1))
    if not parts:
        return np.zeros((0, 3), np.int64)
    return np.concatenate(parts, 0)


def edge_histogram(faces):
    """Count boundary (1 face), manifold (2) and non-manifold (>2) edges."""
    F = np.asarray(faces)
    if len(F) == 0:
        return {'boundary': 0, 'manifold': 0, 'nonmanifold': 0, 'faces': 0}
    E = np.stack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]], 0).reshape(-1, 2)
    E = np.sort(E.astype(np.int64), axis=1)
    dt = np.dtype([('a', np.int64), ('b', np.int64)])
    _, cnt = np.unique(np.ascontiguousarray(E).view(dt).ravel(), return_counts=True)
    return {
        'boundary': int((cnt == 1).sum()),
        'manifold': int((cnt == 2).sum()),
        'nonmanifold': int((cnt > 2).sum()),
        'faces': int(len(F)),
    }
