"""Frame graphics as real geometry: text meshes ray-projected onto the carbon surfaces."""
import bpy, bmesh, math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from lib import *

FONT_PATH = '/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf'
_FONT = None


def font():
    global _FONT
    if _FONT is None:
        _FONT = bpy.data.fonts.load(FONT_PATH)
    return _FONT


def text_mesh(text, cap_mm, length_mm=None, spacing=1.0):
    cu = bpy.data.curves.new('txt', 'FONT')
    cu.body = text
    cu.font = font()
    cu.size = cap_mm / 0.70 * MM
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.resolution_u = 5
    cu.space_character = spacing
    ob = bpy.data.objects.new('txt', cu)
    bpy.context.scene.collection.objects.link(ob)
    me = None
    for _ in range(5):
        if me is not None:
            bpy.data.meshes.remove(me)
        me = evaluated_mesh(ob)
        xs = [v.co.x for v in me.vertices]
        w = (max(xs) - min(xs)) / MM
        if not length_mm or abs(w - length_mm) < 2 or len(text) < 2:
            break
        # letter advance grows linearly with spacing
        cu.space_character *= 1 + (length_mm - w) / w * 1.15
    bpy.data.objects.remove(ob)
    return me


def densify(me, max_len=.003):
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    for _ in range(4):
        long = [e for e in bm.edges if e.calc_length() > max_len]
        if not long:
            break
        bmesh.ops.subdivide_edges(bm, edges=long, cuts=1, use_grid_fill=False)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    return bm


def bvh_of(obj):
    me = obj.data
    mw = Matrix.Translation(obj.location)
    p = obj.parent
    while p is not None:
        mw = Matrix.Translation(p.location) @ mw
        p = p.parent
    verts = [mw @ v.co for v in me.vertices]
    polys = [tuple(p.vertices) for p in me.polygons]
    return BVHTree.FromPolygons(verts, polys)


def project_text(bvh, text, cap_mm, center_mm, d, u, length_mm=None, spacing=1.0, lift=.00035, standoff=.08):
    """d: reading direction, u: letter-up direction (unit, world). Normal n = d x u faces the viewer."""
    me = text_mesh(text, cap_mm, length_mm, spacing)
    bm = densify(me)
    bpy.data.meshes.remove(me)
    n = d.cross(u).normalized()
    C = center_mm * MM
    V, F = [], []
    keep = {}
    for v in bm.verts:
        p = C + d * v.co.x + u * v.co.y + n * standoff
        hit, nrm, idx, dist = bvh.ray_cast(p, -n, standoff * 2)
        if hit is None:
            continue
        keep[v.index] = len(V)
        V.append(hit + nrm.normalized() * lift)
    for f in bm.faces:
        ids = [v.index for v in f.verts]
        if all(i in keep for i in ids):
            F.append([keep[i] for i in ids])
    bm.free()
    return V, F, None
